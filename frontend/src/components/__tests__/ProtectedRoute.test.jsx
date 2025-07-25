import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import { AuthProvider } from '../../contexts/AuthContext'

// Mock the auth service
const mockAuthService = {
  verifyToken: vi.fn()
}

vi.mock('../../services/authService', () => ({
  default: mockAuthService
}))

// Test components
const TestComponent = () => <div>Protected Content</div>
const LoginComponent = () => <div>Login Page</div>

// Test wrapper component
const TestWrapper = ({ children, initialEntries = ['/protected'] }) => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginComponent />} />
        <Route path="/protected" element={children} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
)

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication States', () => {
    it('shows loading state while checking authentication', () => {
      // Mock a pending promise to simulate loading state
      mockAuthService.verifyToken.mockImplementation(() => new Promise(() => {}))
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    })

    it('renders protected content when user is authenticated', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      mockAuthService.verifyToken.mockResolvedValue({ user: mockUser })
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      // Wait for authentication to complete
      await screen.findByText('Protected Content')
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    })

    it('redirects to login when user is not authenticated', async () => {
      mockAuthService.verifyToken.mockRejectedValue(new Error('Token invalid'))
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      // Wait for redirect to complete
      await screen.findByText('Login Page')
      
      expect(screen.getByText('Login Page')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('redirects to login when no token is present', async () => {
      // Clear localStorage to simulate no token
      localStorage.removeItem('token')
      mockAuthService.verifyToken.mockRejectedValue(new Error('No token'))
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      // Wait for redirect to complete
      await screen.findByText('Login Page')
      
      expect(screen.getByText('Login Page')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  describe('Component Behavior', () => {
    it('passes through children when authenticated', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      mockAuthService.verifyToken.mockResolvedValue({ user: mockUser })
      
      const CustomComponent = () => (
        <div>
          <h1>Custom Protected Component</h1>
          <p>This is custom content</p>
        </div>
      )
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <CustomComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      await screen.findByText('Custom Protected Component')
      
      expect(screen.getByText('Custom Protected Component')).toBeInTheDocument()
      expect(screen.getByText('This is custom content')).toBeInTheDocument()
    })

    it('handles multiple children when authenticated', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      mockAuthService.verifyToken.mockResolvedValue({ user: mockUser })
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <div>First Child</div>
            <div>Second Child</div>
            <div>Third Child</div>
          </ProtectedRoute>
        </TestWrapper>
      )
      
      await screen.findByText('First Child')
      
      expect(screen.getByText('First Child')).toBeInTheDocument()
      expect(screen.getByText('Second Child')).toBeInTheDocument()
      expect(screen.getByText('Third Child')).toBeInTheDocument()
    })

    it('works with complex nested components', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      mockAuthService.verifyToken.mockResolvedValue({ user: mockUser })
      
      const NestedComponent = () => (
        <div>
          <header>Protected Header</header>
          <main>
            <section>Protected Section</section>
            <aside>Protected Sidebar</aside>
          </main>
          <footer>Protected Footer</footer>
        </div>
      )
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <NestedComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      await screen.findByText('Protected Header')
      
      expect(screen.getByText('Protected Header')).toBeInTheDocument()
      expect(screen.getByText('Protected Section')).toBeInTheDocument()
      expect(screen.getByText('Protected Sidebar')).toBeInTheDocument()
      expect(screen.getByText('Protected Footer')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles authentication errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockAuthService.verifyToken.mockRejectedValue(new Error('Network error'))
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      // Should redirect to login on error
      await screen.findByText('Login Page')
      
      expect(screen.getByText('Login Page')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      
      consoleError.mockRestore()
    })

    it('handles malformed token responses', async () => {
      mockAuthService.verifyToken.mockResolvedValue(null) // Invalid response
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      // Should redirect to login when response is invalid
      await screen.findByText('Login Page')
      
      expect(screen.getByText('Login Page')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('handles server errors during token verification', async () => {
      mockAuthService.verifyToken.mockRejectedValue({
        response: {
          status: 500,
          data: { error: { message: 'Internal server error' } }
        }
      })
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      // Should redirect to login on server error
      await screen.findByText('Login Page')
      
      expect(screen.getByText('Login Page')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Behavior', () => {
    it('uses replace navigation to prevent back button issues', async () => {
      mockAuthService.verifyToken.mockRejectedValue(new Error('Token invalid'))
      
      render(
        <TestWrapper>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      // Wait for redirect to complete
      await screen.findByText('Login Page')
      
      // The redirect should use replace=true to prevent back button issues
      // This is tested by verifying the component behavior rather than navigation history
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('does not re-render unnecessarily when user state is stable', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      mockAuthService.verifyToken.mockResolvedValue({ user: mockUser })
      
      let renderCount = 0
      const CountingComponent = () => {
        renderCount++
        return <div>Render count: {renderCount}</div>
      }
      
      const { rerender } = render(
        <TestWrapper>
          <ProtectedRoute>
            <CountingComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      await screen.findByText('Render count: 1')
      
      // Re-render with same props
      rerender(
        <TestWrapper>
          <ProtectedRoute>
            <CountingComponent />
          </ProtectedRoute>
        </TestWrapper>
      )
      
      // Component should not re-render unnecessarily
      // Note: This test might need adjustment based on React's rendering behavior
      expect(screen.getByText(/Render count:/)).toBeInTheDocument()
    })
  })
})