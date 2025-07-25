import express from 'express'
import { 
  register, 
  login, 
  logout, 
  verify, 
  refresh 
} from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'
import { 
  validateRegister, 
  validateLogin, 
  validateRefreshToken,
  sanitizeInput,
  validateRequestSize,
  validateNoSqlInjection,
  handleRefreshTokenValidation
} from '../middleware/validation.js'
import { handleValidationErrors } from '../middleware/errorHandler.js'

const router = express.Router()

// Apply security middleware to all auth routes
router.use(sanitizeInput)
router.use(validateRequestSize)
router.use(validateNoSqlInjection)

// POST /api/auth/register - Register new user
router.post('/register', validateRegister, handleValidationErrors, register)

// POST /api/auth/login - Login user
router.post('/login', validateLogin, handleValidationErrors, login)

// POST /api/auth/logout - Logout user
router.post('/logout', logout)

// GET /api/auth/verify - Verify token and get user info
router.get('/verify', authenticate, verify)

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', validateRefreshToken, handleRefreshTokenValidation, refresh)

export default router