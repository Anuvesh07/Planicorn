import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import LoginForm from '../LoginForm'
import { AuthProvider } from '../../../contexts/AuthContext'

// Mock the auth service
vi.mock('../../../services/authService', () => ({
  default: {
    verifyToken: vi.fn(() => Promise.resolve({ user: null }))
  }
}))

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
)

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders login form with all fields', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
      expect(screen.getByText('Register here')).toBeInTheDocument()
    })

    it('has proper form structure and accessibility', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('name', 'email')
      
      const passwordInput = screen.getByLabelText('Password')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('name', 'password')
    })
  })

  describe('Form Interaction', () => {
    it('updates form fields when user types', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })

    it('clears field errors when user starts typing', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      
      // Start typing to clear error
      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'test@example.com')
      
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('shows error when email is empty', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })

    it('shows error when email is invalid', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      expect(screen.getByText('Email is invalid')).toBeInTheDocument()
    })

    it('shows error when password is empty', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })

    it('shows error when password is too short', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, '123')
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })

    it('validates multiple fields simultaneously', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      expect(screen.getByText('Logging in...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('disables form fields during submission', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
    })
  })

  describe('Navigation', () => {
    it('has link to register page', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const registerLink = screen.getByText('Register here')
      expect(registerLink).toHaveAttribute('href', '/register')
    })
  })

  describe('Error Handling', () => {
    it('applies error styling to invalid fields', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      expect(emailInput.className).toContain('inputError')
      expect(passwordInput.className).toContain('inputError')
    })

    it('removes error styling when field becomes valid', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      const emailInput = screen.getByLabelText('Email')
      expect(emailInput.className).toContain('inputError')
      
      // Fix the field
      await user.type(emailInput, 'test@example.com')
      expect(emailInput.className).not.toContain('inputError')
    })
  })
})