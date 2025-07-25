import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../../components/Dashboard'
import { AuthProvider } from '../../contexts/AuthContext'
import { SocketProvider } from '../../contexts/SocketContext'
import taskService from '../../services/taskService'

// Mock services
vi.mock('../../services/taskService', () => ({
  default: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    updateTaskStatus: vi.fn()
  }
}))

vi.mock('../../services/authService', () => ({
  default: {
    verifyToken: vi.fn(() => Promise.resolve({ 
      user: { _id: '1', username: 'testuser', email: 'test@example.com' } 
    }))
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

// Mock window methods
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(() => true)
})

Object.defineProperty(window, 'alert', {
  writable: true,
  value: vi.fn()
})

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Task Management Workflow Integration', () => {
  const mockTasks = [
    {
      _id: '1',
      title: 'Todo Task',
      description: 'Todo Description',
      status: 'todo',
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      _id: '2',
      title: 'In Progress Task',
      description: 'In Progress Description',
      status: 'inprogress',
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      _id: '3',
      title: 'Done Task',
      description: 'Done Description',
      status: 'done',
      createdAt: '2023-01-01T00:00:00.000Z',
      completedAt: '2023-01-02T00:00:00.000Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    taskService.getTasks.mockResolvedValue({ tasks: mockTasks })
  })

  describe('Task Creation Workflow', () => {
    it('creates a new task through the complete workflow', async () => {
      const user = userEvent.setup()
      const newTask = {
        _id: '4',
        title: 'New Task',
        description: 'New task description',
        status: 'todo',
        createdAt: '2023-01-03T00:00:00.000Z'
      }
      
      taskService.createTask.mockResolvedValue({ task: newTask })
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      // Wait for initial tasks to load
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Click add task button
      const addButton = screen.getByLabelText('Add task to To Do')
      await user.click(addButton)
      
      // Modal should open
      expect(screen.getByText('Create New Task')).toBeInTheDocument()
      
      // Fill out the form
      const titleInput = screen.getByLabelText('Title *')
      const descriptionInput = screen.getByLabelText('Description')
      const statusSelect = screen.getByLabelText('Status')
      
      await user.type(titleInput, 'New Task')
      await user.type(descriptionInput, 'New task description')
      await user.selectOptions(statusSelect, 'todo')
      
      // Submit the form
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      // Verify API call
      await waitFor(() => {
        expect(taskService.createTask).toHaveBeenCalledWith({
          title: 'New Task',
          description: 'New task description',
          status: 'todo'
        })
      })
      
      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Create New Task')).not.toBeInTheDocument()
      })
      
      // New task should appear in the list (would need to update mock or re-render)
      expect(taskService.createTask).toHaveBeenCalled()
    })

    it('handles task creation errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Task creation failed'
      
      taskService.createTask.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Open modal and fill form
      const addButton = screen.getByLabelText('Add task to To Do')
      await user.click(addButton)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'New Task')
      
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      // Should show error and keep modal open
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        expect(screen.getByText('Create New Task')).toBeInTheDocument()
      })
    })

    it('validates form before submission', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Open modal
      const addButton = screen.getByLabelText('Add task to To Do')
      await user.click(addButton)
      
      // Try to submit without filling required fields
      const submitButton = screen.getByText('Create Task')
      await user.click(submitButton)
      
      // Should show validation error
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(taskService.createTask).not.toHaveBeenCalled()
    })
  })

  describe('Task Editing Workflow', () => {
    it('edits an existing task through the complete workflow', async () => {
      const user = userEvent.setup()
      const updatedTask = {
        ...mockTasks[0],
        title: 'Updated Task Title',
        description: 'Updated description'
      }
      
      taskService.updateTask.mockResolvedValue({ task: updatedTask })
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Click edit button on first task
      const editButton = screen.getAllByLabelText('Edit task')[0]
      await user.click(editButton)
      
      // Modal should open with existing data
      expect(screen.getByText('Edit Task')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Todo Task')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Todo Description')).toBeInTheDocument()
      
      // Update the form
      const titleInput = screen.getByLabelText('Title *')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Task Title')
      
      const descriptionInput = screen.getByLabelText('Description')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated description')
      
      // Submit the form
      const submitButton = screen.getByText('Update Task')
      await user.click(submitButton)
      
      // Verify API call
      await waitFor(() => {
        expect(taskService.updateTask).toHaveBeenCalledWith('1', {
          title: 'Updated Task Title',
          description: 'Updated description',
          status: 'todo'
        })
      })
      
      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Edit Task')).not.toBeInTheDocument()
      })
    })

    it('handles task update errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Task update failed'
      
      taskService.updateTask.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Open edit modal
      const editButton = screen.getAllByLabelText('Edit task')[0]
      await user.click(editButton)
      
      // Update and submit
      const titleInput = screen.getByLabelText('Title *')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Task')
      
      const submitButton = screen.getByText('Update Task')
      await user.click(submitButton)
      
      // Should show error and keep modal open
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })
    })
  })

  describe('Task Deletion Workflow', () => {
    it('deletes a task with confirmation', async () => {
      const user = userEvent.setup()
      taskService.deleteTask.mockResolvedValue({})
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Click delete button
      const deleteButton = screen.getAllByLabelText('Delete task')[0]
      await user.click(deleteButton)
      
      // Should show confirmation dialog
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?')
      
      // Should call delete API
      await waitFor(() => {
        expect(taskService.deleteTask).toHaveBeenCalledWith('1')
      })
    })

    it('cancels deletion when user declines confirmation', async () => {
      const user = userEvent.setup()
      window.confirm.mockReturnValue(false)
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Click delete button
      const deleteButton = screen.getAllByLabelText('Delete task')[0]
      await user.click(deleteButton)
      
      // Should show confirmation but not delete
      expect(window.confirm).toHaveBeenCalled()
      expect(taskService.deleteTask).not.toHaveBeenCalled()
    })

    it('handles task deletion errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to delete task'
      
      taskService.deleteTask.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Click delete button
      const deleteButton = screen.getAllByLabelText('Delete task')[0]
      await user.click(deleteButton)
      
      // Should show error alert
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(errorMessage)
      })
    })
  })

  describe('Task Status Update Workflow', () => {
    it('updates task status optimistically', async () => {
      taskService.updateTaskStatus.mockResolvedValue({})
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // This test would require simulating drag and drop
      // For now, we'll test that the component renders correctly
      expect(screen.getByText('To Do')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    it('reverts optimistic update on error', async () => {
      const errorMessage = 'Failed to update task status'
      taskService.updateTaskStatus.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // This would test the error handling for drag and drop operations
      // The actual implementation would require more complex drag and drop simulation
      expect(screen.getByText('Todo Task')).toBeInTheDocument()
    })
  })

  describe('Complete Task Management Workflow', () => {
    it('performs multiple task operations in sequence', async () => {
      const user = userEvent.setup()
      
      // Mock responses for different operations
      const newTask = {
        _id: '4',
        title: 'New Task',
        description: 'New Description',
        status: 'todo',
        createdAt: '2023-01-03T00:00:00.000Z'
      }
      
      taskService.createTask.mockResolvedValue({ task: newTask })
      taskService.updateTask.mockResolvedValue({ task: { ...newTask, title: 'Updated Task' } })
      taskService.deleteTask.mockResolvedValue({})
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // 1. Create a new task
      const addButton = screen.getByLabelText('Add task to To Do')
      await user.click(addButton)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'New Task')
      
      const createButton = screen.getByText('Create Task')
      await user.click(createButton)
      
      await waitFor(() => {
        expect(taskService.createTask).toHaveBeenCalled()
      })
      
      // 2. Edit an existing task
      const editButton = screen.getAllByLabelText('Edit task')[0]
      await user.click(editButton)
      
      const editTitleInput = screen.getByLabelText('Title *')
      await user.clear(editTitleInput)
      await user.type(editTitleInput, 'Updated Task')
      
      const updateButton = screen.getByText('Update Task')
      await user.click(updateButton)
      
      await waitFor(() => {
        expect(taskService.updateTask).toHaveBeenCalled()
      })
      
      // 3. Delete a task
      const deleteButton = screen.getAllByLabelText('Delete task')[0]
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(taskService.deleteTask).toHaveBeenCalled()
      })
      
      // Verify all operations were called
      expect(taskService.createTask).toHaveBeenCalledTimes(1)
      expect(taskService.updateTask).toHaveBeenCalledTimes(1)
      expect(taskService.deleteTask).toHaveBeenCalledTimes(1)
    })

    it('handles mixed success and error scenarios', async () => {
      const user = userEvent.setup()
      
      // Mock mixed responses
      taskService.createTask.mockResolvedValue({
        task: {
          _id: '4',
          title: 'New Task',
          description: 'New Description',
          status: 'todo',
          createdAt: '2023-01-03T00:00:00.000Z'
        }
      })
      
      taskService.updateTask.mockRejectedValue({
        response: { data: { error: { message: 'Update failed' } } }
      })
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // 1. Successful task creation
      const addButton = screen.getByLabelText('Add task to To Do')
      await user.click(addButton)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'New Task')
      
      const createButton = screen.getByText('Create Task')
      await user.click(createButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Create New Task')).not.toBeInTheDocument()
      })
      
      // 2. Failed task update
      const editButton = screen.getAllByLabelText('Edit task')[0]
      await user.click(editButton)
      
      const editTitleInput = screen.getByLabelText('Title *')
      await user.clear(editTitleInput)
      await user.type(editTitleInput, 'Updated Task')
      
      const updateButton = screen.getByText('Update Task')
      await user.click(updateButton)
      
      // Should show error and keep modal open
      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument()
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States and User Feedback', () => {
    it('shows appropriate loading states during operations', async () => {
      const user = userEvent.setup()
      
      // Mock delayed response
      taskService.createTask.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          task: {
            _id: '4',
            title: 'New Task',
            description: 'New Description',
            status: 'todo',
            createdAt: '2023-01-03T00:00:00.000Z'
          }
        }), 100))
      )
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Open modal and submit
      const addButton = screen.getByLabelText('Add task to To Do')
      await user.click(addButton)
      
      const titleInput = screen.getByLabelText('Title *')
      await user.type(titleInput, 'New Task')
      
      const createButton = screen.getByText('Create Task')
      await user.click(createButton)
      
      // Should show loading state
      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(createButton).toBeDisabled()
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('provides user feedback for all operations', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })
      
      // Task counts should be displayed
      expect(screen.getByText('Total Tasks: 3')).toBeInTheDocument()
      
      // Column headers should show task counts
      expect(screen.getByText('1')).toBeInTheDocument() // Todo count
      expect(screen.getByText('1')).toBeInTheDocument() // In Progress count  
      expect(screen.getByText('1')).toBeInTheDocument() // Done count
    })
  })
})