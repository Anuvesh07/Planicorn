import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import RegisterForm from '../RegisterForm'
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

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders register form with all fields', () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument()
      expect(screen.getByLabelText('Username')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
      expect(screen.getByText('Already have an account?')).toBeInTheDocument()
      expect(screen.getByText('Login here')).toBeInTheDocument()
    })

    it('has proper form structure and accessibility', () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const usernameInput = screen.getByLabelText('Username')
      expect(usernameInput).toHaveAttribute('type', 'text')
      expect(usernameInput).toHaveAttribute('name', 'username')
      
      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('name', 'email')
      
      const passwordInput = screen.getByLabelText('Password')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('name', 'password')
      
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('name', 'confirmPassword')
    })
  })

  describe('Form Interaction', () => {
    it('updates form fields when user types', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      
      expect(usernameInput).toHaveValue('testuser')
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
      expect(confirmPasswordInput).toHaveValue('password123')
    })

    it('clears field errors when user starts typing', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Username is required')).toBeInTheDocument()
      
      // Start typing to clear error
      const usernameInput = screen.getByLabelText('Username')
      await user.type(usernameInput, 'testuser')
      
      expect(screen.queryByText('Username is required')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('shows error when username is empty', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Username is required')).toBeInTheDocument()
    })

    it('shows error when username is too short', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const usernameInput = screen.getByLabelText('Username')
      await user.type(usernameInput, 'ab')
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument()
    })

    it('shows error when email is empty', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })

    it('shows error when password is empty', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })

    it('shows error when password is too short', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, '123')
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })

    it('shows error when confirm password is empty', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument()
    })

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'different123')
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })

    it('validates multiple fields simultaneously', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Username is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(screen.getByText('Creating Account...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('disables form fields during submission', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      expect(usernameInput).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(confirmPasswordInput).toBeDisabled()
    })

    it('clears form on successful registration', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      
      // Values should be present before submission
      expect(usernameInput).toHaveValue('testuser')
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
      expect(confirmPasswordInput).toHaveValue('password123')
    })
  })

  describe('Navigation', () => {
    it('has link to login page', () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const loginLink = screen.getByText('Login here')
      expect(loginLink).toHaveAttribute('href', '/login')
    })
  })

  describe('Error Handling', () => {
    it('applies error styling to invalid fields', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      expect(usernameInput.className).toContain('inputError')
      expect(emailInput.className).toContain('inputError')
      expect(passwordInput.className).toContain('inputError')
      expect(confirmPasswordInput.className).toContain('inputError')
    })

    it('removes error styling when field becomes valid', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: 'Register' })
      await user.click(submitButton)
      
      const usernameInput = screen.getByLabelText('Username')
      expect(usernameInput.className).toContain('inputError')
      
      // Fix the field
      await user.type(usernameInput, 'testuser')
      expect(usernameInput.className).not.toContain('inputError')
    })
  })
})