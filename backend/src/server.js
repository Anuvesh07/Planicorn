import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import compression from 'compression'
import dotenv from 'dotenv'
import { createServer } from 'http'
import connectDB, { checkDatabaseHealth } from './config/database.js'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import { globalErrorHandler, notFoundHandler, gracefulShutdown } from './middleware/errorHandler.js'
import { enforceHTTPS, additionalSecurityHeaders, securityLogger, cspReportHandler } from './middleware/security.js'
import { initializeSocket } from './socket/index.js'

// Load environment variables
dotenv.config()

// Connect to database
connectDB()

const app = express()
const PORT = process.env.PORT || 5000

// Trust proxy for accurate IP addresses behind reverse proxies
app.set('trust proxy', process.env.TRUST_PROXY || 1)

// Compression middleware for better performance
app.use(compression())

// Enhanced security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections for Socket.IO
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      reportUri: "/api/csp-report"
    },
  },
  crossOriginEmbedderPolicy: false, // Allow Socket.IO connections
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}))

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ]
    
    // Add production origins from environment variable
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','))
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}

app.use(cors(corsOptions))

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/api/health')
  }
})

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
})

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skip: (req) => {
    // Skip slow down for health checks
    return req.path.startsWith('/api/health')
  }
})

// HTTPS enforcement (production only)
app.use(enforceHTTPS)

// Additional security headers
app.use(additionalSecurityHeaders)

// Security logging and monitoring
app.use(securityLogger)

// Apply rate limiting middleware
app.use(generalLimiter)
app.use(speedLimiter)

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf
  }
}))
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}))

// Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/tasks', taskRoutes)

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Task Manager API is running',
    timestamp: new Date().toISOString()
  })
})

// Database health check route
app.get('/api/health/database', async (req, res) => {
  try {
    const healthStatus = await checkDatabaseHealth()
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503
    res.status(statusCode).json(healthStatus)
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Failed to check database health',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// CSP violation reporting endpoint
app.post('/api/csp-report', cspReportHandler)

// Handle unmatched routes (404)
app.all('*', notFoundHandler)

// Global error handling middleware (must be last)
app.use(globalErrorHandler)

// Create HTTP server
const server = createServer(app)

// Initialize Socket.IO
const io = initializeSocket(server)

// Make io available to routes
app.set('io', io)

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Set up graceful shutdown
gracefulShutdown(server)