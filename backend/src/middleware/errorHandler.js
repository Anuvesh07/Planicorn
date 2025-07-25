import { validationResult } from 'express-validator'

// Custom error class for application-specific errors
export class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

// Validation error handler middleware
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      }
    })
  }
  next()
}

// MongoDB error handler
const handleMongoError = (error) => {
  let message = 'Database error'
  let code = 'DATABASE_ERROR'
  let statusCode = 500
  let details = null

  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0]
    const value = error.keyValue[field]
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`
    code = 'DUPLICATE_FIELD'
    statusCode = 400
    details = { field, value }
  }
  
  // Validation error
  else if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }))
    message = 'Validation failed'
    code = 'MONGOOSE_VALIDATION_ERROR'
    statusCode = 400
    details = errors
  }
  
  // Cast error (invalid ObjectId)
  else if (error.name === 'CastError') {
    message = `Invalid ${error.path}: ${error.value}`
    code = 'INVALID_ID'
    statusCode = 400
    details = { field: error.path, value: error.value }
  }

  return new AppError(message, statusCode, code, details)
}

// JWT error handler
const handleJWTError = (error) => {
  let message = 'Authentication failed'
  let code = 'AUTH_ERROR'
  let statusCode = 401

  if (error.name === 'JsonWebTokenError') {
    message = 'Invalid token'
    code = 'INVALID_TOKEN'
  } else if (error.name === 'TokenExpiredError') {
    message = 'Token expired'
    code = 'TOKEN_EXPIRED'
  }

  return new AppError(message, statusCode, code)
}

// Development error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      code: err.code,
      details: err.details,
      stack: err.stack
    }
  })
}

// Production error response
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details
      }
    })
  } 
  // Programming or other unknown error: don't leak error details
  else {
    // Log error for debugging
    console.error('ERROR:', err)

    res.status(500).json({
      success: false,
      error: {
        message: 'Something went wrong',
        code: 'SERVER_ERROR'
      }
    })
  }
}

// Global error handling middleware
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.code = err.code || 'SERVER_ERROR'

  // Log all errors for monitoring
  const logLevel = err.statusCode >= 500 ? 'error' : 'warn'
  console[logLevel](`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${err.statusCode} - ${err.message}`, {
    error: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  let error = { ...err }
  error.message = err.message
  error.stack = err.stack

  // Handle specific error types
  if (err.name === 'ValidationError' || err.code === 11000 || err.name === 'CastError') {
    error = handleMongoError(err)
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err)
  }

  // Send error response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res)
  } else {
    sendErrorProd(error, res)
  }
}

// Async error wrapper to catch async errors
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

// 404 handler for unmatched routes
export const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND')
  next(err)
}

// Graceful shutdown handler
export const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`Received ${signal}. Graceful shutdown...`)
    
    server.close(() => {
      console.log('HTTP server closed.')
      process.exit(0)
    })

    // Force close server after 30 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down')
      process.exit(1)
    }, 30000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}