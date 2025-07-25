import { jest } from '@jest/globals'
import { AppError, globalErrorHandler, handleValidationErrors, catchAsync, notFoundHandler } from '../errorHandler.js'
import { validationResult } from 'express-validator'

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}))

describe('Error Handler Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      user: { id: 'user123' }
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
    
    // Clear console mocks
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  describe('AppError', () => {
    it('should create an AppError with all properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'test' })
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.details).toEqual({ field: 'test' })
      expect(error.isOperational).toBe(true)
    })

    it('should create an AppError with default values', () => {
      const error = new AppError('Test error', 500)
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe(null)
      expect(error.details).toBe(null)
      expect(error.isOperational).toBe(true)
    })
  })

  describe('handleValidationErrors', () => {
    it('should pass through when no validation errors', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true
      })

      handleValidationErrors(req, res, next)

      expect(next).toHaveBeenCalledWith()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should return validation error response when errors exist', () => {
      const mockErrors = [
        { field: 'email', msg: 'Invalid email' },
        { field: 'password', msg: 'Password too short' }
      ]
      
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      })

      handleValidationErrors(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: mockErrors
        }
      })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('globalErrorHandler', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test'
    })

    it('should handle AppError in development mode', () => {
      process.env.NODE_ENV = 'development'
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'test' })

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
          code: 'TEST_ERROR',
          details: { field: 'test' },
          stack: expect.stringContaining('Error: Test error')
        }
      })
    })

    it('should handle AppError in production mode', () => {
      process.env.NODE_ENV = 'production'
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'test' })

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
          code: 'TEST_ERROR',
          details: { field: 'test' }
        }
      })
    })

    it('should handle MongoDB duplicate key error', () => {
      const error = {
        code: 11000,
        keyValue: { email: 'test@example.com' },
        message: 'Duplicate key error'
      }

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: "Email 'test@example.com' already exists",
          code: 'DUPLICATE_FIELD',
          details: { field: 'email', value: 'test@example.com' }
        }
      })
    })

    it('should handle MongoDB validation error', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          title: {
            path: 'title',
            message: 'Title is required',
            value: ''
          },
          email: {
            path: 'email',
            message: 'Invalid email format',
            value: 'invalid-email'
          }
        }
      }

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'MONGOOSE_VALIDATION_ERROR',
          details: [
            { field: 'title', message: 'Title is required', value: '' },
            { field: 'email', message: 'Invalid email format', value: 'invalid-email' }
          ]
        }
      })
    })

    it('should handle MongoDB cast error', () => {
      const error = {
        name: 'CastError',
        path: '_id',
        value: 'invalid-id',
        message: 'Cast to ObjectId failed'
      }

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid _id: invalid-id',
          code: 'INVALID_ID',
          details: { field: '_id', value: 'invalid-id' }
        }
      })
    })

    it('should handle JWT errors', () => {
      const error = {
        name: 'JsonWebTokenError',
        message: 'invalid token'
      }

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
          details: null
        }
      })
    })

    it('should handle JWT expired errors', () => {
      const error = {
        name: 'TokenExpiredError',
        message: 'jwt expired'
      }

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
          details: null
        }
      })
    })

    it('should handle unknown errors in production mode', () => {
      process.env.NODE_ENV = 'production'
      const error = new Error('Unknown error')
      error.isOperational = false

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Something went wrong',
          code: 'SERVER_ERROR'
        }
      })
    })

    it('should log errors with appropriate level', () => {
      const error = new AppError('Client error', 400, 'CLIENT_ERROR')
      
      globalErrorHandler(error, req, res, next)

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/test - 400 - Client error'),
        expect.any(Object)
      )
    })

    it('should log server errors with error level', () => {
      const error = new AppError('Server error', 500, 'SERVER_ERROR')
      
      globalErrorHandler(error, req, res, next)

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/test - 500 - Server error'),
        expect.any(Object)
      )
    })
  })

  describe('catchAsync', () => {
    it('should call next with error when async function throws', async () => {
      const error = new Error('Async error')
      const asyncFn = jest.fn().mockRejectedValue(error)
      const wrappedFn = catchAsync(asyncFn)

      await wrappedFn(req, res, next)

      expect(asyncFn).toHaveBeenCalledWith(req, res, next)
      expect(next).toHaveBeenCalledWith(error)
    })

    it('should not call next when async function succeeds', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success')
      const wrappedFn = catchAsync(asyncFn)

      await wrappedFn(req, res, next)

      expect(asyncFn).toHaveBeenCalledWith(req, res, next)
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('notFoundHandler', () => {
    it('should create 404 error for unmatched routes', () => {
      req.originalUrl = '/api/nonexistent'

      notFoundHandler(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route /api/nonexistent not found',
          statusCode: 404,
          code: 'ROUTE_NOT_FOUND',
          isOperational: true
        })
      )
    })
  })
})