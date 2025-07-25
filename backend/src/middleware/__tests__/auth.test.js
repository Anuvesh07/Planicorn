import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { authenticate, optionalAuth } from '../auth.js'
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js'
import User from '../../models/User.js'

let mongoServer

// Mock environment variables
const originalEnv = process.env
beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key'
  
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()
  await mongoose.connect(mongoUri)
})

afterAll(async () => {
  process.env = originalEnv
  await mongoose.disconnect()
  await mongoServer.stop()
})

afterEach(async () => {
  await User.deleteMany({})
})

describe('Authentication Middleware', () => {
  let testUser
  let validToken
  let refreshToken

  beforeEach(async () => {
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    })
    await testUser.save()
    
    validToken = generateAccessToken(testUser._id.toString())
    refreshToken = generateRefreshToken(testUser._id.toString())
  })

  describe('authenticate middleware', () => {
    test('should authenticate user with valid token', async () => {
      const req = {
        header: jest.fn().mockReturnValue(`Bearer ${validToken}`)
      }
      const res = {}
      const next = jest.fn()

      await authenticate(req, res, next)

      expect(req.user).toBeDefined()
      expect(req.user._id.toString()).toBe(testUser._id.toString())
      expect(next).toHaveBeenCalled()
    })

    test('should reject request without token', async () => {
      const req = {
        header: jest.fn().mockReturnValue(null)
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        }
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('should reject request with invalid token format', async () => {
      const req = {
        header: jest.fn().mockReturnValue('InvalidFormat token')
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        }
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('should reject refresh token', async () => {
      const req = {
        header: jest.fn().mockReturnValue(`Bearer ${refreshToken}`)
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid token type. Use access token for authentication.',
          code: 'INVALID_TOKEN_TYPE'
        }
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('should reject invalid token', async () => {
      const req = {
        header: jest.fn().mockReturnValue('Bearer invalid-token')
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid token.',
          code: 'INVALID_TOKEN'
        }
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('should reject token for non-existent user', async () => {
      // Delete the user but keep the token
      await User.findByIdAndDelete(testUser._id)
      
      const req = {
        header: jest.fn().mockReturnValue(`Bearer ${validToken}`)
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Token is valid but user no longer exists.',
          code: 'USER_NOT_FOUND'
        }
      })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('optionalAuth middleware', () => {
    test('should authenticate user with valid token', async () => {
      const req = {
        header: jest.fn().mockReturnValue(`Bearer ${validToken}`)
      }
      const res = {}
      const next = jest.fn()

      await optionalAuth(req, res, next)

      expect(req.user).toBeDefined()
      expect(req.user._id.toString()).toBe(testUser._id.toString())
      expect(next).toHaveBeenCalled()
    })

    test('should continue without user when no token provided', async () => {
      const req = {
        header: jest.fn().mockReturnValue(null)
      }
      const res = {}
      const next = jest.fn()

      await optionalAuth(req, res, next)

      expect(req.user).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })

    test('should continue without user when invalid token provided', async () => {
      const req = {
        header: jest.fn().mockReturnValue('Bearer invalid-token')
      }
      const res = {}
      const next = jest.fn()

      await optionalAuth(req, res, next)

      expect(req.user).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })
  })
})