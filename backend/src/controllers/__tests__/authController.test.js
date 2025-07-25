import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import express from 'express'
import User from '../../models/User.js'
import authRoutes from '../../routes/auth.js'
import { generateRefreshToken } from '../../utils/jwt.js'
import { globalErrorHandler, notFoundHandler } from '../../middleware/errorHandler.js'

let mongoServer
let app

// Mock environment variables
const originalEnv = process.env
beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key'
  process.env.JWT_EXPIRES_IN = '15m'
  process.env.JWT_REFRESH_EXPIRES_IN = '7d'
  
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()
  await mongoose.connect(mongoUri)
  
  // Set up Express app for testing
  app = express()
  app.use(express.json())
  app.use('/api/auth', authRoutes)
  
  // Add error handling middleware
  app.all('*', notFoundHandler)
  app.use(globalErrorHandler)
})

afterAll(async () => {
  process.env = originalEnv
  await mongoose.disconnect()
  await mongoServer.stop()
})

afterEach(async () => {
  await User.deleteMany({})
})

describe('Auth Controller', () => {
  const validUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  }

  describe('POST /api/auth/register', () => {
    test('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.user.username).toBe(validUserData.username)
      expect(response.body.data.user.email).toBe(validUserData.email)
      expect(response.body.data.user.password).toBeUndefined()
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()

      // Verify user was created in database
      const user = await User.findOne({ email: validUserData.email })
      expect(user).toBeTruthy()
    })

    test('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject registration with short username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          username: 'ab'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          password: '123'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject registration with existing email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201)

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          username: 'differentuser'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('USER_EXISTS')
      expect(response.body.error.details.field).toBe('email')
    })

    test('should reject registration with existing username', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201)

      // Try to register with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'different@example.com'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('USER_EXISTS')
      expect(response.body.error.details.field).toBe('username')
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
    })

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.user.email).toBe(validUserData.email)
      expect(response.body.data.user.password).toBeUndefined()
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    test('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: validUserData.password
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    test('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: validUserData.password
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject login without password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.message).toBe('Logged out successfully')
    })
  })

  describe('GET /api/auth/verify', () => {
    let accessToken

    beforeEach(async () => {
      // Register and get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
      
      accessToken = registerResponse.body.data.accessToken
    })

    test('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.user.email).toBe(validUserData.email)
      expect(response.body.data.valid).toBe(true)
    })

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('NO_TOKEN')
    })

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_TOKEN')
    })
  })

  describe('POST /api/auth/refresh', () => {
    let user
    let refreshToken

    beforeEach(async () => {
      // Create user and get refresh token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
      
      user = await User.findOne({ email: validUserData.email })
      refreshToken = registerResponse.body.data.refreshToken
    })

    test('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    test('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject access token used as refresh token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        })

      const accessToken = loginResponse.body.data.accessToken

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_TOKEN_TYPE')
    })

    test('should reject refresh token for deleted user', async () => {
      // Delete the user
      await User.findByIdAndDelete(user._id)

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('USER_NOT_FOUND')
    })
  })
})