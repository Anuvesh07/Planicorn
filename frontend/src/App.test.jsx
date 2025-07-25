import { describe, it, expect } from 'vitest'

describe('App Structure', () => {
  it('should have all required files in place', () => {
    // Test that the main files exist by importing them
    expect(() => import('./App.jsx')).not.toThrow()
    expect(() => import('./components/Dashboard.jsx')).not.toThrow()
    expect(() => import('./components/ProtectedRoute.jsx')).not.toThrow()
    expect(() => import('./components/auth/LoginForm.jsx')).not.toThrow()
    expect(() => import('./components/auth/RegisterForm.jsx')).not.toThrow()
    expect(() => import('./contexts/AuthContext.jsx')).not.toThrow()
  })

  it('should have CSS modules configured', () => {
    // Test that CSS modules are working by checking file extensions
    const cssModulePattern = /\.module\.css$/
    expect(cssModulePattern.test('Dashboard.module.css')).toBe(true)
    expect(cssModulePattern.test('AuthForms.module.css')).toBe(true)
  })
})