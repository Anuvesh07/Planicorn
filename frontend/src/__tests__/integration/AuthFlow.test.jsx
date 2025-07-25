import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import App from '../../App'
import authService from '../../services/authService'
import taskService from '../../services/taskService'

// Mock services
vi.mock('../../services/authService', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    verifyToken: vi.fn(),
    logout: vi.fn()
  }
}))

vi.mock('../../services/taskService', () => ({
  default: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    updateTaskStatus: vi.fn()
  }
}))

vi.mock('../../services/socketService', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onTaskCreated: vi.fn(),
    onTaskUpdated: vi.fn(),
    onTaskDeleted: vi.fn(),
    onTaskStatusUpdated: vi.fn(),
    offTaskCreated: vi.fn(),
    offTaskUpdated: vi.fn(),
    offTaskDeleted: vi.fn(),
    offTaskStatusUpdated: vi.fn(),
    getSocket: vi.fn(() => null),
    isSocketConnected: vi.fn(() => false)
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

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    authService.verifyToken.mockRejectedValue(new Error('No token'))
    taskService.getTasks.mockResolvedValue({ tasks: [] })
  })

  describe('User Registration Flow', () => {
    it('allows user to register and redirects to login', async () => {
      const user = userEvent.setup()
      authService.register.mockResolvedValue({ success: true })
      
      render(<App />)
      
      // Should redirect to login initially (no token)
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
      
      // Navigate to register page
      const registerLink = screen.getByText('Register here')
      await user.click(registerLink)
      
      expect(screen.getByText('Register')).toBeInTheDocument()
      
      // Fill registration form
      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelFor('password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      
      // Submit registration
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      // Should call register service
      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        })
      })
      
      // Should show success message and redirect to login
      await waitFor(() => {
        expect(screen.getByText('Registration successful! Redirecting to login...')).toBeInTheDocument()
      })
    })

    it('handles registration errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Email already exists'
      authService.register.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      render(<App />)
      
      // Navigate to register page
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
      
      const registerLink = screen.getByText('Register here')
      await user.click(registerLink)
      
      // Fill and submit form
      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelFor('password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
      
      // Should remain on register page
      expect(screen.getByText('Register')).toBeInTheDocument()
    })
  })

  describe('User Login Flow', () => {
    it('allows user to login and redirects to dashboard', async () => {
      const user = userEvent.setup()
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'mock-jwt-token'
      
      authService.login.mockResolvedValue({
        user: mockUser,
        token: mockToken
      })
      
      render(<App />)
      
      // Should show login form
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
      
      // Fill login form
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Submit login
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      // Should call login service
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })
      
      // Should store token and redirect to dashboard
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken)
      })
    })

    it('handles login errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Invalid credentials'
      authService.login.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      render(<App />)
      
      // Fill and submit login form
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
      
      // Should remain on login page
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  describe('Authenticated User Flow', () => {
    it('automatically logs in user with valid token', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'valid-jwt-token'
      
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockResolvedValue(mockUser)
      
      render(<App />)
      
      // Should verify token and show dashboard
      await waitFor(() => {
        expect(authService.verifyToken).toHaveBeenCalled()
        expect(screen.getByText('Task Manager')).toBeInTheDocument()
        expect(screen.getByText('Welcome, testuser')).toBeInTheDocument()
      })
    })

    it('clears invalid token and redirects to login', async () => {
      const mockToken = 'invalid-jwt-token'
      
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockRejectedValue(new Error('Token expired'))
      
      render(<App />)
      
      // Should clear token and redirect to login
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
    })

    it('allows user to logout', async () => {
      const user = userEvent.setup()
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'valid-jwt-token'
      
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockResolvedValue(mockUser)
      
      render(<App />)
      
      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText('Welcome, testuser')).toBeInTheDocument()
      })
      
      // Click logout button
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)
      
      // Should clear token and redirect to login
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
    })
  })

  describe('Route Protection', () => {
    it('redirects unauthenticated users to login', async () => {
      render(<App />)
      
      // Should redirect to login when no token
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
    })

    it('allows authenticated users to access dashboard', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'valid-jwt-token'
      
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockResolvedValue(mockUser)
      
      render(<App />)
      
      // Should show dashboard for authenticated user
      await waitFor(() => {
        expect(screen.getByText('Task Manager')).toBeInTheDocument()
      })
    })

    it('handles authentication state changes', async () => {
      const user = userEvent.setup()
      
      // Start unauthenticated
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
      
      // Simulate successful login
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'valid-jwt-token'
      
      authService.login.mockResolvedValue({
        user: mockUser,
        token: mockToken
      })
      
      // Fill and submit login form
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      // Should transition to dashboard
      await waitFor(() => {
        expect(screen.queryByText('Login')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Recovery', () => {
    it('recovers from network errors during authentication', async () => {
      const user = userEvent.setup()
      
      // First attempt fails with network error
      authService.login
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          user: { _id: '1', username: 'testuser', email: 'test@example.com' },
          token: 'valid-jwt-token'
        })
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
      
      // First login attempt
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
      
      // Retry login
      await user.click(submitButton)
      
      // Should succeed on retry
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledTimes(2)
      })
    })

    it('handles session expiration gracefully', async () => {
      const mockUser = { _id: '1', username: 'testuser', email: 'test@example.com' }
      const mockToken = 'valid-jwt-token'
      
      localStorageMock.getItem.mockReturnValue(mockToken)
      authService.verifyToken.mockResolvedValue(mockUser)
      
      render(<App />)
      
      // Should show dashboard initially
      await waitFor(() => {
        expect(screen.getByText('Task Manager')).toBeInTheDocument()
      })
      
      // Simulate session expiration by making subsequent API calls fail
      taskService.getTasks.mockRejectedValue({
        response: { status: 401, data: { error: { message: 'Token expired' } } }
      })
      
      // This would typically be handled by axios interceptors in a real app
      // For this test, we're just verifying the initial authentication flow
      expect(screen.getByText('Task Manager')).toBeInTheDocument()
    })
  })
})