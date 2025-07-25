import { body, param, query, validationResult } from 'express-validator'
import { AppError } from './errorHandler.js'
import DOMPurify from 'isomorphic-dompurify'
import mongoose from 'mongoose'

// Sanitization middleware
export const sanitizeInput = (req, _res, next) => {
  // Sanitize body fields
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = DOMPurify.sanitize(req.body[key], { 
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        }).trim()
      }
    }
  }

  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = DOMPurify.sanitize(req.query[key], {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        }).trim()
      }
    }
  }

  // Sanitize URL parameters
  if (req.params) {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = DOMPurify.sanitize(req.params[key], {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        }).trim()
      }
    }
  }

  next()
}

// Validation result handler
export const handleValidationResult = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array()))
  }
  next()
}

// Custom validation result handler for refresh token
export const handleRefreshTokenValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorArray = errors.array()
    const refreshTokenError = errorArray.find(err => err.path === 'refreshToken')
    
    if (refreshTokenError) {
      // Handle missing refresh token
      if (refreshTokenError.msg === 'Refresh token is required') {
        return next(new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN'))
      }
      
      // Handle invalid refresh token format
      if (refreshTokenError.msg === 'Invalid refresh token format') {
        return next(new AppError('Invalid refresh token format', 401, 'INVALID_TOKEN'))
      }
    }
    
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errorArray))
  }
  next()
}

// Parameter validation for MongoDB ObjectIds
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${paramName}`)
      }
      return true
    })
    .withMessage(`Invalid ${paramName} format`)
]

// Query parameter validation for tasks
export const validateTaskQuery = [
  query('status')
    .optional()
    .isIn(['todo', 'inprogress', 'done'])
    .withMessage('Status must be one of: todo, inprogress, done'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
]

// Registration validation
export const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
]

// Login validation
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
]

// Task creation validation
export const validateCreateTask = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Task description cannot exceed 1000 characters'),
  
  body('status')
    .optional()
    .isIn(['todo', 'inprogress', 'done'])
    .withMessage('Status must be one of: todo, inprogress, done'),
  
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a non-negative integer')
]

// Task update validation
export const validateUpdateTask = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Task description cannot exceed 1000 characters'),
  
  body('status')
    .optional()
    .isIn(['todo', 'inprogress', 'done'])
    .withMessage('Status must be one of: todo, inprogress, done'),
  
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a non-negative integer')
]

// Task status update validation
export const validateUpdateTaskStatus = [
  body('status')
    .isIn(['todo', 'inprogress', 'done'])
    .withMessage('Status must be one of: todo, inprogress, done'),
  
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a non-negative integer')
]

// Refresh token validation
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .custom((value) => {
      // Basic JWT format check (3 parts separated by dots)
      if (!value || typeof value !== 'string' || value.split('.').length !== 3) {
        throw new Error('Invalid refresh token format')
      }
      return true
    })
]

// Enhanced password validation with security requirements
export const validateStrongPassword = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
]

// Request size validation middleware
export const validateRequestSize = (req, _res, next) => {
  const maxSize = 1024 * 1024 // 1MB
  const contentLength = parseInt(req.get('content-length') || '0')
  
  if (contentLength > maxSize) {
    return next(new AppError('Request payload too large', 413, 'PAYLOAD_TOO_LARGE'))
  }
  
  next()
}

// Rate limiting validation for sensitive operations
export const validateNoSqlInjection = (req, _res, next) => {
  const checkForInjection = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          throw new AppError('Invalid characters in request', 400, 'INVALID_INPUT')
        }
        if (typeof obj[key] === 'object') {
          checkForInjection(obj[key])
        }
      }
    }
  }

  try {
    if (req.body) checkForInjection(req.body)
    if (req.query) checkForInjection(req.query)
    if (req.params) checkForInjection(req.params)
    next()
  } catch (error) {
    next(error)
  }
}

// User permission validation middleware
export const validateTaskOwnership = async (req, _res, next) => {
  try {
    const { id } = req.params
    const userId = req.user._id

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid task ID format', 400, 'INVALID_ID'))
    }

    // Import Task model dynamically to avoid circular dependency
    const { default: Task } = await import('../models/Task.js')
    
    // Check if task exists and belongs to the user
    const task = await Task.findOne({ _id: id, userId })
    if (!task) {
      return next(new AppError('Task not found or access denied', 404, 'TASK_NOT_FOUND'))
    }

    // Attach task to request for use in controller
    req.task = task
    next()
  } catch (error) {
    next(new AppError('Error validating task ownership', 500, 'VALIDATION_ERROR'))
  }
}