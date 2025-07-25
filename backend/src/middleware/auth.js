import { verifyToken } from '../utils/jwt.js'
import User from '../models/User.js'

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        }
      })
    }

    // Extract token
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token)
    
    // Check if it's a refresh token (should not be used for authentication)
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token type. Use access token for authentication.',
          code: 'INVALID_TOKEN_TYPE'
        }
      })
    }

    // Get user from database
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token is valid but user no longer exists.',
          code: 'USER_NOT_FOUND'
        }
      })
    }

    // Add user to request object
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token has expired.',
          code: 'TOKEN_EXPIRED'
        }
      })
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token.',
          code: 'INVALID_TOKEN'
        }
      })
    }

    // Generic error
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed.',
        code: 'AUTH_FAILED'
      }
    })
  }
}

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next() // Continue without user
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (decoded.type !== 'refresh') {
      const user = await User.findById(decoded.userId)
      if (user) {
        req.user = user
      }
    }
    
    next()
  } catch (error) {
    // Continue without user if token is invalid
    next()
  }
}