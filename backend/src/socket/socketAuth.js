import { verifyToken } from '../utils/jwt.js'
import User from '../models/User.js'

// Socket.IO authentication middleware
export const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    // Verify token
    const decoded = verifyToken(token)
    
    // Check if it's a refresh token (should not be used for authentication)
    if (decoded.type === 'refresh') {
      return next(new Error('Authentication error: Invalid token type'))
    }

    // Get user from database
    const user = await User.findById(decoded.userId)
    if (!user) {
      return next(new Error('Authentication error: User not found'))
    }

    // Add user to socket object
    socket.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'))
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'))
    }

    // Generic error
    return next(new Error('Authentication error: Authentication failed'))
  }
}