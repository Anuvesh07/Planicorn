import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TaskModal from '../TaskModal'

describe('TaskModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    task: null,
    initialStatus: 'todo',
    loading: false
  }

  const mockTask = {
    _id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'inprogress'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(<TaskModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByText('Create New Task')).not.toBeInTheDocument()
    })

    it('renders create modal when no task is provided', () => {
      render(<TaskModal {...defaultProps} />)
      
      expect(screen.getByText('Create New Task')).toBeInTheDocument()
      expect(screen.getByText('Create Task')).toBeInTheDocument()
      expect(screen.getByLabelText('Title *')).toHaveValue('')
    })

    it('renders edit modal when task is provided', () => {
      render(<TaskModal {...defaultProps} task={mockTask} />)
      
      expect(screen.getByText('Edit Task')).toBeInTheDocument()
      expect(screen.getByText('Update Task')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      render(<TaskModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Title *')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Create Task')).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('updates form fields when user types', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('Title *')
      const descriptionInput = screen.getByLabelText('Description')
      
      await user.type(titleInput, 'New Task Title')
      await user.type(descriptionInput, 'New task description')
      
      expect(titleInput).toHaveValue('New Task Title')
      expect(descriptionInput).toHaveValue('New task description')
    })

    it('updates status when dropdown changes', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const statusSelect = screen.getByLabelText('Status')
      await user.selectOptions(statusSelect, 'inprogress')
      
      expect(statusSelect).toHaveValue('inprogress')
    })

    it('shows character count for description', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const descriptionInput = screen.getByLabelText('Description')
      await user.type(descriptionInput, 'Test')
      
      expect(screen.getByText('4/500')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('shows error when title is empty', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('shows error when title is too short', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'Hi')
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      expect(screen.getByText('Title must be at least 3 characters long')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('shows error when title is too long', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('Title *')
      // Since input has maxLength=100, we need to set value directly to test validation
      fireEvent.change(titleInput, { target: { value: 'a'.repeat(101) } })
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      expect(screen.getByText('Title must be less than 100 characters')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('shows error when description is too long', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('Title *')
      const descriptionInput = screen.getByLabelText('Description')
      
      await user.type(titleInput, 'Valid Title')
      // Since textarea has maxLength=500, we need to set value directly to test validation
      fireEvent.change(descriptionInput, { target: { value: 'a'.repeat(501) } })
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      expect(screen.getByText('Description must be less than 500 characters')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('clears field error when user starts typing', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      // Trigger validation error
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      
      // Start typing to clear error
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'Valid Title')
      
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('submits form with valid data for new task', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue()
      
      render(<TaskModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('Title *')
      const descriptionInput = screen.getByLabelText('Description')
      const statusSelect = screen.getByLabelText('Status')
      
      await user.type(titleInput, 'New Task')
      await user.type(descriptionInput, 'Task description')
      await user.selectOptions(statusSelect, 'inprogress')
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'Task description',
        status: 'inprogress'
      }, undefined)
    })

    it('submits form with valid data for existing task', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue()
      
      render(<TaskModal {...defaultProps} task={mockTask} />)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Task')
      
      const submitButton = screen.getByText('Update Task')
      await user.click(submitButton)
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Updated Task',
        description: 'Test Description',
        status: 'inprogress'
      }, '1')
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      let resolveSubmit
      mockOnSubmit.mockImplementation(() => new Promise(resolve => {
        resolveSubmit = resolve
      }))
      
      render(<TaskModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'New Task')
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      
      resolveSubmit()
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('handles submission errors', async () => {
      const user = userEvent.setup()
      const error = {
        response: {
          data: {
            error: {
              message: 'Server error',
              details: { title: 'Title already exists' }
            }
          }
        }
      }
      mockOnSubmit.mockRejectedValue(error)
      
      render(<TaskModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'New Task')
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Title already exists')).toBeInTheDocument()
      })
      
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('handles generic submission errors', async () => {
      const user = userEvent.setup()
      const error = {
        response: {
          data: {
            error: {
              message: 'Generic server error'
            }
          }
        }
      }
      mockOnSubmit.mockRejectedValue(error)
      
      render(<TaskModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'New Task')
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Generic server error')).toBeInTheDocument()
      })
    })
  })

  describe('Modal Interaction', () => {
    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes modal when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes modal when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const backdrop = document.querySelector('[class*="modalOverlay"]')
      await user.click(backdrop)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('does not close modal when modal content is clicked', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      const modalContent = document.querySelector('[class*="modal"]:not([class*="modalOverlay"])')
      await user.click(modalContent)
      
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('prevents closing during submission', async () => {
      const user = userEvent.setup()
      let resolveSubmit
      mockOnSubmit.mockImplementation(() => new Promise(resolve => {
        resolveSubmit = resolve
      }))
      
      render(<TaskModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'New Task')
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      // Try to close while submitting
      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toBeDisabled()
      
      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toBeDisabled()
      
      resolveSubmit()
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Form Reset', () => {
    it('resets form when modal opens for new task', () => {
      const { rerender } = render(<TaskModal {...defaultProps} isOpen={false} />)
      
      rerender(<TaskModal {...defaultProps} isOpen={true} />)
      
      expect(screen.getByLabelText('Title *')).toHaveValue('')
      expect(screen.getByLabelText('Description')).toHaveValue('')
      expect(screen.getByLabelText('Status')).toHaveValue('todo')
    })

    it('populates form when modal opens for editing', () => {
      const { rerender } = render(<TaskModal {...defaultProps} isOpen={false} />)
      
      rerender(<TaskModal {...defaultProps} isOpen={true} task={mockTask} />)
      
      expect(screen.getByLabelText('Title *')).toHaveValue('Test Task')
      expect(screen.getByLabelText('Description')).toHaveValue('Test Description')
      expect(screen.getByLabelText('Status')).toHaveValue('inprogress')
    })

    it('uses initial status for new tasks', () => {
      render(<TaskModal {...defaultProps} initialStatus="done" />)
      
      expect(screen.getByLabelText('Status')).toHaveValue('done')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TaskModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
      expect(screen.getByLabelText('Title *')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
    })

    it('focuses on title input when modal opens', async () => {
      render(<TaskModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Title *')).toHaveFocus()
      }, { timeout: 200 })
    })

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<TaskModal {...defaultProps} />)
      
      // Wait for focus to be set initially
      await waitFor(() => {
        expect(screen.getByLabelText('Title *')).toHaveFocus()
      }, { timeout: 200 })
      
      await user.tab()
      expect(screen.getByLabelText('Description')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText('Status')).toHaveFocus()
    })
  })
})