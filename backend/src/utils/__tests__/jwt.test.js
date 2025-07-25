import jwt from 'jsonwebtoken'
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  generateTokens 
} from '../jwt.js'

// Mock environment variables
const originalEnv = process.env
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key'
  process.env.JWT_EXPIRES_IN = '15m'
  process.env.JWT_REFRESH_EXPIRES_IN = '7d'
})

afterAll(() => {
  process.env = originalEnv
})

describe('JWT Utilities', () => {
  const testUserId = '507f1f77bcf86cd799439011'

  describe('generateAccessToken', () => {
    test('should generate a valid access token', () => {
      const token = generateAccessToken(testUserId)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      expect(decoded.userId).toBe(testUserId)
      expect(decoded.type).toBeUndefined() // Access tokens don't have type
    })
  })

  describe('generateRefreshToken', () => {
    test('should generate a valid refresh token', () => {
      const token = generateRefreshToken(testUserId)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      expect(decoded.userId).toBe(testUserId)
      expect(decoded.type).toBe('refresh')
    })
  })

  describe('verifyToken', () => {
    test('should verify a valid token', () => {
      const token = generateAccessToken(testUserId)
      const decoded = verifyToken(token)
      
      expect(decoded.userId).toBe(testUserId)
    })

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token')
      }).toThrow('jwt malformed')
    })

    test('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: testUserId },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      )
      
      expect(() => {
        verifyToken(expiredToken)
      }).toThrow('jwt expired')
    })
  })

  describe('generateTokens', () => {
    test('should generate both access and refresh tokens', () => {
      const tokens = generateTokens(testUserId)
      
      expect(tokens).toHaveProperty('accessToken')
      expect(tokens).toHaveProperty('refreshToken')
      
      const accessDecoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET)
      const refreshDecoded = jwt.verify(tokens.refreshToken, process.env.JWT_SECRET)
      
      expect(accessDecoded.userId).toBe(testUserId)
      expect(refreshDecoded.userId).toBe(testUserId)
      expect(refreshDecoded.type).toBe('refresh')
    })
  })
})