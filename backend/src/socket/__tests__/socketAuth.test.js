import { socketAuth } from '../socketAuth.js'
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js'
import User from '../../models/User.js'

// Mock User model
jest.mock('../../models/User.js')

// Mock socket object
const createMockSocket = (token) => ({
  handshake: {
    auth: { token },
    query: {}
  }
})

describe('Socket Authentication', () => {
  let testUser

  beforeAll(() => {
    // Set up environment variables for testing
    process.env.JWT_SECRET = 'test-secret-key-for-socket-auth-testing'
    process.env.JWT_EXPIRES_IN = '15m'
  })

  beforeEach(() => {
    // Create a mock test user
    testUser = {
      _id: '507f1f77bcf86cd799439011',
      username: 'socketuser',
      email: 'socket@test.com',
      password: 'hashedpassword123'
    }
    
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('socketAuth middleware', () => {
    it('should authenticate user with valid access token', async () => {
      // Mock User.findById to return the test user
      User.findById.mockResolvedValue(testUser)
      
      const token = generateAccessToken(testUser._id)
      const socket = createMockSocket(token)
      const next = jest.fn()

      await socketAuth(socket, next)

      expect(next).toHaveBeenCalledWith()
      expect(socket.user).toBeDefined()
      expect(socket.user._id.toString()).toBe(testUser._id.toString())
    })

    it('should reject authentication with no token', async () => {
      const socket = createMockSocket(null)
      const next = jest.fn()

      await socketAuth(socket, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(next.mock.calls[0][0].message).toContain('No token provided')
    })

    it('should reject authentication with refresh token', async () => {
      const token = generateRefreshToken(testUser._id)
      const socket = createMockSocket(token)
      const next = jest.fn()

      await socketAuth(socket, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(next.mock.calls[0][0].message).toContain('Invalid token type')
    })

    it('should reject authentication with invalid token', async () => {
      const socket = createMockSocket('invalid-token')
      const next = jest.fn()

      await socketAuth(socket, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(next.mock.calls[0][0].message).toContain('Invalid token')
    })

    it('should reject authentication when user does not exist', async () => {
      // Mock User.findById to return null (user not found)
      User.findById.mockResolvedValue(null)
      
      const token = generateAccessToken(testUser._id)
      const socket = createMockSocket(token)
      const next = jest.fn()

      await socketAuth(socket, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(next.mock.calls[0][0].message).toContain('User not found')
    })

    it('should get token from query parameter if not in auth', async () => {
      // Mock User.findById to return the test user
      User.findById.mockResolvedValue(testUser)
      
      const token = generateAccessToken(testUser._id)
      const socket = {
        handshake: {
          auth: {},
          query: { token }
        }
      }
      const next = jest.fn()

      await socketAuth(socket, next)

      expect(next).toHaveBeenCalledWith()
      expect(socket.user).toBeDefined()
      expect(socket.user._id.toString()).toBe(testUser._id.toString())
    })
  })
})