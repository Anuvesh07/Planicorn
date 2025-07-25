// Security middleware for HTTPS enforcement and additional security measures

// HTTPS enforcement middleware
export const enforceHTTPS = (req, res, next) => {
  // Skip HTTPS enforcement in development
  if (process.env.NODE_ENV !== 'production') {
    return next()
  }

  // Check if request is secure
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    // Redirect to HTTPS
    return res.redirect(301, `https://${req.get('host')}${req.url}`)
  }

  next()
}

// Security headers middleware (additional to helmet)
export const additionalSecurityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY')
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Feature policy / Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // Expect-CT header for certificate transparency
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Expect-CT', 'max-age=86400, enforce')
  }
  
  next()
}

// Request logging middleware for security monitoring
export const securityLogger = (req, res, next) => {
  const startTime = Date.now()
  
  // Log security-relevant information
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    secure: req.secure,
    protocol: req.protocol
  }
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /vbscript:/i,  // VBScript injection
    /onload=/i,  // Event handler injection
    /onerror=/i  // Error handler injection
  ]
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.originalUrl) || 
    pattern.test(req.get('User-Agent') || '') ||
    (req.body && typeof req.body === 'string' && pattern.test(req.body))
  )
  
  if (isSuspicious) {
    console.warn('🚨 Suspicious request detected:', logData)
  }
  
  // Continue with request
  next()
  
  // Log response time for performance monitoring
  res.on('finish', () => {
    const duration = Date.now() - startTime
    if (duration > 5000) { // Log slow requests (>5s)
      console.warn('⚠️ Slow request detected:', {
        ...logData,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      })
    }
  })
}

// Content Security Policy violation reporting
export const cspReportHandler = (req, res) => {
  console.warn('🛡️ CSP Violation Report:', {
    timestamp: new Date().toISOString(),
    report: req.body,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  res.status(204).end()
}