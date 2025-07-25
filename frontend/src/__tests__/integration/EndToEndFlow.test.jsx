/**
 * End-to-End Flow Integration Test
 * Tests the complete user journey with minimal mocking
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, test, beforeEach, expect, afterEach } from 'vitest'
import App from '../../App'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch for API calls
global.fetch = vi.fn()

describe('End-to-End User Flow Integration Test', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Mock successful API responses
    fetch.mockImplementation((url) => {
      if (url.includes('/auth/verify')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, error: { message: 'No token provided' } })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('should render login form when not authenticated', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Should show login form
    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  test('should show registration form when clicking register link', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })

    // Click register link
    const registerLink = screen.getByText(/don't have an account/i).closest('div').querySelector('button')
    if (registerLink) {
      fireEvent.click(registerLink)
    }

    await waitFor(() => {
      expect(screen.getByText(/create account/i)).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  test('should handle form validation', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })

    const user = userEvent.setup()
    
    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/email is required/i) || screen.getByText(/please enter/i)).toBeInTheDocument()
    })
  })

  test('should show dashboard when authenticated', async () => {
    // Mock authenticated state
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token'
      if (key === 'user') return JSON.stringify({ id: '1', email: 'test@example.com' })
      return null
    })

    // Mock successful auth verification
    fetch.mockImplementation((url) => {
      if (url.includes('/auth/verify')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            user: { id: '1', email: 'test@example.com' } 
          })
        })
      }
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            tasks: [
              { 
                _id: '1', 
                title: 'Test Task', 
                description: 'Test Description', 
                status: 'todo',
                position: 0
              }
            ] 
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    })

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Should show dashboard
    await waitFor(() => {
      expect(screen.getByText(/task manager/i) || screen.getByText(/dashboard/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // Should show task columns
    await waitFor(() => {
      expect(screen.getByText(/to do/i) || screen.getByText(/todo/i)).toBeInTheDocument()
    })
  })

  test('should handle logout functionality', async () => {
    // Mock authenticated state
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token'
      if (key === 'user') return JSON.stringify({ id: '1', email: 'test@example.com' })
      return null
    })

    // Mock successful auth verification
    fetch.mockImplementation((url) => {
      if (url.includes('/auth/verify')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            user: { id: '1', email: 'test@example.com' } 
          })
        })
      }
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            tasks: [] 
          })
        })
      }
      if (url.includes('/auth/logout')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    })

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/task manager/i) || screen.getByText(/dashboard/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    const user = userEvent.setup()

    // Find and click logout button
    const logoutButton = screen.getByText(/logout/i) || screen.getByRole('button', { name: /logout/i })
    if (logoutButton) {
      await user.click(logoutButton)

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument()
      })

      // Should clear localStorage
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
    }
  })

  test('should handle network errors gracefully', async () => {
    // Mock network error
    fetch.mockRejectedValue(new Error('Network error'))

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })

    const user = userEvent.setup()
    
    // Fill in login form
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error/i) || screen.getByText(/failed/i) || screen.getByText(/network/i)).toBeInTheDocument()
    })
  })
})