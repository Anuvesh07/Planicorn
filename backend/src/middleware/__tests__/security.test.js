import request from 'supertest'
import express from 'express'
import { enforceHTTPS, additionalSecurityHeaders, securityLogger } from '../security.js'

describe('Security Middleware', () => {
  let app

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  describe('enforceHTTPS', () => {
    test('should skip HTTPS enforcement in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      app.use(enforceHTTPS)
      app.get('/test', (req, res) => res.json({ success: true }))

      const response = await request(app)
        .get('/test')
        .expect(200)

      expect(response.body.success).toBe(true)
      process.env.NODE_ENV = originalEnv
    })

    test('should redirect to HTTPS in production for non-secure requests', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      app.use(enforceHTTPS)
      app.get('/test', (req, res) => res.json({ success: true }))

      const response = await request(app)
        .get('/test')
        .set('Host', 'example.com')
        .expect(301)

      expect(response.headers.location).toBe('https://example.com/test')
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('additionalSecurityHeaders', () => {
    test('should add security headers to response', async () => {
      app.use(additionalSecurityHeaders)
      app.get('/test', (req, res) => res.json({ success: true }))

      const response = await request(app)
        .get('/test')
        .expect(200)

      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
      expect(response.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()')
    })

    test('should add Expect-CT header in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      app.use(additionalSecurityHeaders)
      app.get('/test', (req, res) => res.json({ success: true }))

      const response = await request(app)
        .get('/test')
        .expect(200)

      expect(response.headers['expect-ct']).toBe('max-age=86400, enforce')
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('securityLogger', () => {
    let consoleSpy

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    test('should log suspicious requests', async () => {
      app.use(securityLogger)
      app.get('/test', (req, res) => res.json({ success: true }))

      await request(app)
        .get('/test')
        .set('User-Agent', '<script>alert("xss")</script>')
        .expect(200)

      expect(consoleSpy).toHaveBeenCalledWith(
        '🚨 Suspicious request detected:',
        expect.objectContaining({
          method: 'GET',
          url: '/test'
        })
      )
    })

    test('should not log normal requests as suspicious', async () => {
      app.use(securityLogger)
      app.get('/test', (req, res) => res.json({ success: true }))

      await request(app)
        .get('/test?param=normal')
        .expect(200)

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('🚨 Suspicious request detected:'),
        expect.any(Object)
      )
    })

    test('should detect directory traversal attempts', async () => {
      app.use(securityLogger)
      app.get('*', (req, res) => res.json({ success: true })) // Catch-all route

      await request(app)
        .get('/test/../../../etc/passwd')
        .expect(200)

      expect(consoleSpy).toHaveBeenCalledWith(
        '🚨 Suspicious request detected:',
        expect.objectContaining({
          url: '/test/../../../etc/passwd'
        })
      )
    })

    test('should detect SQL injection attempts', async () => {
      app.use(securityLogger)
      app.get('/test', (req, res) => res.json({ success: true }))

      await request(app)
        .get('/test?id=1 UNION SELECT * FROM users')
        .expect(200)

      expect(consoleSpy).toHaveBeenCalledWith(
        '🚨 Suspicious request detected:',
        expect.objectContaining({
          url: expect.stringContaining('UNION')
        })
      )
    })
  })
})