import { validationResult } from 'express-validator'
import User from '../models/User.js'
import { generateTokens, verifyToken } from '../utils/jwt.js'
import { AppError, catchAsync, handleValidationErrors } from '../middleware/errorHandler.js'

// Register new user
export const register = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  })

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username'
    return next(new AppError(`User with this ${field} already exists`, 400, 'USER_EXISTS', { field }))
  }

  // Create new user
  const user = new User({ username, email, password })
  await user.save()

  // Generate tokens
  const tokens = generateTokens(user._id.toString())

  res.status(201).json({
    success: true,
    data: {
      user: user.toJSON(),
      ...tokens
    }
  })
})

// Login user
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'))
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
    return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'))
  }

  // Generate tokens
  const tokens = generateTokens(user._id.toString())

  res.json({
    success: true,
    data: {
      user: user.toJSON(),
      ...tokens
    }
  })
})

// Logout user (client-side token invalidation)
export const logout = catchAsync(async (req, res) => {
  // In a JWT-based system, logout is primarily handled client-side
  // by removing the token. This endpoint confirms the logout action.
  res.json({
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  })
})

// Verify token and return user info
export const verify = catchAsync(async (req, res) => {
  // User is already attached to req by authenticate middleware
  res.json({
    success: true,
    data: {
      user: req.user.toJSON(),
      valid: true
    }
  })
})

// Refresh access token using refresh token
export const refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return next(new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN'))
  }

  // Verify refresh token
  const decoded = verifyToken(refreshToken)
  
  if (decoded.type !== 'refresh') {
    return next(new AppError('Invalid token type', 400, 'INVALID_TOKEN_TYPE'))
  }

  // Check if user still exists
  const user = await User.findById(decoded.userId)
  if (!user) {
    return next(new AppError('User no longer exists', 401, 'USER_NOT_FOUND'))
  }

  // Generate new tokens
  const tokens = generateTokens(user._id.toString())

  res.json({
    success: true,
    data: {
      user: user.toJSON(),
      ...tokens
    }
  })
})