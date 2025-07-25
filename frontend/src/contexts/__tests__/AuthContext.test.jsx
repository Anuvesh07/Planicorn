import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../AuthContext'
import authService from '../../services/authService'

// Mock the auth service
vi.mock('../../services/authService', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    verifyToken: vi.fn(),
    logout: vi.fn()
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Test component that uses the auth context
const TestComponent = () => {
  const { user, loading, login, logout, register } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user">{user ? `User: ${user.username}` : 'No User'}</div>
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => register({ username: 'testuser', email: 'test@example.com', password: 'password' })}>
        Register
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

// Test wrapper
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
)

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Provider Initialization', () => {
    it('provides auth context to children', () => {
      authService.verifyToken.mockRejectedValue(new Error('No token'))
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      expect(screen.getByTestId('user')).toHaveTextContent('No User')
      expect(screen.getByText('Login')).toBeInTheDocument()
      expect(screen.getByText('Register')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('throws error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth must be used within an AuthProvider')
      
      consoleError.mockRestore()
    })

    it('shows loading state initially', () => {
      authService.verifyToken.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    })
  })

  describe('Token Verification on Mount', () => {
    it('verifies existing token on mount', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'valid-token'
      
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockResolvedValue(mockUser)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(authService.verifyToken).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('User: testuser')
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
    })

    it('clears invalid token on mount', async () => {
      const mockToken = 'invalid-token'
      
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockRejectedValue(new Error('Token invalid'))
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
        expect(screen.getByTestId('user')).toHaveTextContent('No User')
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
    })

    it('handles no token gracefully', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(authService.verifyToken).not.toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('No User')
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
    })
  })

  describe('Login Functionality', () => {
    it('successfully logs in user', async () => {
      const user = userEvent.setup()
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'jwt-token'
      
      authService.login.mockResolvedValue({
        user: mockUser,
        token: mockToken
      })
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        })
        expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken)
        expect(screen.getByTestId('user')).toHaveTextContent('User: testuser')
      })
    })

    it('handles login errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Invalid credentials'
      
      authService.login.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalled()
        expect(localStorageMock.setItem).not.toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('No User')
      })
    })

    it('handles generic login errors', async () => {
      const user = userEvent.setup()
      
      authService.login.mockRejectedValue(new Error('Network error'))
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('No User')
      })
    })

    it('shows loading state during login', async () => {
      const user = userEvent.setup()
      let resolveLogin
      
      authService.login.mockImplementation(() => new Promise(resolve => {
        resolveLogin = resolve
      }))
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      
      act(() => {
        resolveLogin({
          user: { _id: '1', username: 'testuser', email: 'test@example.com' },
          token: 'jwt-token'
        })
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
    })
  })

  describe('Registration Functionality', () => {
    it('successfully registers user', async () => {
      const user = userEvent.setup()
      
      authService.register.mockResolvedValue({ success: true })
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const registerButton = screen.getByText('Register')
      await user.click(registerButton)
      
      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password'
        })
      })
    })

    it('handles registration errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Email already exists'
      
      authService.register.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const registerButton = screen.getByText('Register')
      await user.click(registerButton)
      
      await waitFor(() => {
        expect(authService.register).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('No User')
      })
    })

    it('handles generic registration errors', async () => {
      const user = userEvent.setup()
      
      authService.register.mockRejectedValue(new Error('Network error'))
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const registerButton = screen.getByText('Register')
      await user.click(registerButton)
      
      await waitFor(() => {
        expect(authService.register).toHaveBeenCalled()
      })
    })

    it('shows loading state during registration', async () => {
      const user = userEvent.setup()
      let resolveRegister
      
      authService.register.mockImplementation(() => new Promise(resolve => {
        resolveRegister = resolve
      }))
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const registerButton = screen.getByText('Register')
      await user.click(registerButton)
      
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      
      act(() => {
        resolveRegister({ success: true })
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
    })
  })

  describe('Logout Functionality', () => {
    it('successfully logs out user', async () => {
      const user = userEvent.setup()
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'jwt-token'
      
      // Set up authenticated state
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockResolvedValue(mockUser)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('User: testuser')
      })
      
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)
      
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
        expect(screen.getByTestId('user')).toHaveTextContent('No User')
      })
    })

    it('clears user state on logout', async () => {
      const user = userEvent.setup()
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'jwt-token'
      
      // Set up authenticated state
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockResolvedValue(mockUser)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('User: testuser')
      })
      
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)
      
      expect(screen.getByTestId('user')).toHaveTextContent('No User')
    })
  })

  describe('State Management', () => {
    it('maintains user state across re-renders', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'jwt-token'
      
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockResolvedValue(mockUser)
      
      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('User: testuser')
      })
      
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      expect(screen.getByTestId('user')).toHaveTextContent('User: testuser')
    })

    it('updates loading state appropriately', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'jwt-token'
      
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockResolvedValue(mockUser)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // Should start loading
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      
      // Should finish loading
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
    })

    it('handles concurrent auth operations', async () => {
      const user = userEvent.setup()
      
      authService.login.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          user: { _id: '1', username: 'testuser', email: 'test@example.com' },
          token: 'jwt-token'
        }), 100))
      )
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      // Start multiple login attempts
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      await user.click(loginButton)
      
      // Should handle concurrent operations gracefully
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      }, { timeout: 200 })
    })
  })

  describe('Error Recovery', () => {
    it('recovers from network errors', async () => {
      const user = userEvent.setup()
      
      // First call fails, second succeeds
      authService.login
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          user: { _id: '1', username: 'testuser', email: 'test@example.com' },
          token: 'jwt-token'
        })
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const loginButton = screen.getByText('Login')
      
      // First attempt fails
      await user.click(loginButton)
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No User')
      })
      
      // Second attempt succeeds
      await user.click(loginButton)
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('User: testuser')
      })
    })

    it('handles malformed API responses', async () => {
      const user = userEvent.setup()
      
      authService.login.mockResolvedValue(null) // Invalid response
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      // Should handle gracefully and not crash
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No User')
      })
    })
  })
})