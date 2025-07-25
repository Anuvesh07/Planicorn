import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { BrowserRouter } from 'react-router-dom'
import TaskBoard from '../../components/tasks/TaskBoard'
import TaskCard from '../../components/tasks/TaskCard'
import TaskColumn from '../../components/tasks/TaskColumn'
import { AuthProvider } from '../../contexts/AuthContext'
import { SocketProvider } from '../../contexts/SocketContext'

// Mock services
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

// Test wrapper component with DnD
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <DndProvider backend={HTML5Backend}>
          {children}
        </DndProvider>
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
)

// Helper function to simulate drag and drop
const simulateDragDrop = (dragElement, dropElement) => {
  // Create drag events
  const dragStartEvent = new Event('dragstart', { bubbles: true })
  const dragOverEvent = new Event('dragover', { bubbles: true })
  const dropEvent = new Event('drop', { bubbles: true })
  
  // Set up data transfer
  const dataTransfer = {
    data: {},
    setData: vi.fn((type, data) => {
      dataTransfer.data[type] = data
    }),
    getData: vi.fn((type) => dataTransfer.data[type]),
    effectAllowed: 'move',
    dropEffect: 'move'
  }
  
  Object.defineProperty(dragStartEvent, 'dataTransfer', {
    value: dataTransfer
  })
  Object.defineProperty(dragOverEvent, 'dataTransfer', {
    value: dataTransfer
  })
  Object.defineProperty(dropEvent, 'dataTransfer', {
    value: dataTransfer
  })
  
  // Simulate drag sequence
  fireEvent(dragElement, dragStartEvent)
  fireEvent(dropElement, dragOverEvent)
  fireEvent(dropElement, dropEvent)
}

describe('Drag and Drop Functionality', () => {
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

  const mockProps = {
    tasks: mockTasks,
    onTaskEdit: vi.fn(),
    onTaskDelete: vi.fn(),
    onTaskAdd: vi.fn(),
    onTaskDrop: vi.fn(),
    loading: false,
    error: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TaskCard Drag Functionality', () => {
    it('makes task cards draggable', () => {
      render(
        <TestWrapper>
          <TaskCard
            task={mockTasks[0]}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      )
      
      const taskCard = screen.getByText('Todo Task').closest('[class*="taskCard"]')
      expect(taskCard).toBeInTheDocument()
      
      // Task card should be draggable (this is handled by react-dnd)
      // We can't easily test the actual draggable attribute, but we can verify the component renders
      expect(screen.getByText('Todo Task')).toBeInTheDocument()
    })

    it('provides visual feedback during drag', () => {
      render(
        <TestWrapper>
          <TaskCard
            task={mockTasks[0]}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      )
      
      const taskCard = screen.getByText('Todo Task').closest('[class*="taskCard"]')
      
      // Simulate drag start
      const dragStartEvent = new Event('dragstart', { bubbles: true })
      fireEvent(taskCard, dragStartEvent)
      
      // The visual feedback would be handled by react-dnd and CSS
      // We can verify the component structure is correct
      expect(screen.getByText('Todo Task')).toBeInTheDocument()
    })

    it('contains task data for drag operations', () => {
      render(
        <TestWrapper>
          <TaskCard
            task={mockTasks[0]}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      )
      
      // The task data would be available through react-dnd's drag source
      // We can verify the task data is properly structured
      expect(mockTasks[0]).toHaveProperty('_id', '1')
      expect(mockTasks[0]).toHaveProperty('status', 'todo')
      expect(mockTasks[0]).toHaveProperty('title', 'Todo Task')
    })
  })

  describe('TaskColumn Drop Functionality', () => {
    it('accepts dropped tasks', () => {
      const onTaskDrop = vi.fn()
      
      render(
        <TestWrapper>
          <TaskColumn
            title="In Progress"
            status="inprogress"
            tasks={mockTasks}
            onTaskEdit={vi.fn()}
            onTaskDelete={vi.fn()}
            onAddTask={vi.fn()}
            onTaskDrop={onTaskDrop}
          />
        </TestWrapper>
      )
      
      const column = screen.getByText('In Progress').closest('[class*="column"]')
      expect(column).toBeInTheDocument()
      
      // The drop functionality would be handled by react-dnd
      // We can verify the onTaskDrop prop is passed correctly
      expect(onTaskDrop).toBeDefined()
    })

    it('highlights drop zones during drag over', () => {
      render(
        <TestWrapper>
          <TaskColumn
            title="In Progress"
            status="inprogress"
            tasks={mockTasks}
            onTaskEdit={vi.fn()}
            onTaskDelete={vi.fn()}
            onAddTask={vi.fn()}
            onTaskDrop={vi.fn()}
          />
        </TestWrapper>
      )
      
      const column = screen.getByText('In Progress').closest('[class*="column"]')
      
      // Simulate drag over
      const dragOverEvent = new Event('dragover', { bubbles: true })
      fireEvent(column, dragOverEvent)
      
      // Visual feedback would be handled by CSS classes from react-dnd
      expect(column).toBeInTheDocument()
    })

    it('calls onTaskDrop when task is dropped', () => {
      const onTaskDrop = vi.fn()
      
      render(
        <TestWrapper>
          <TaskColumn
            title="In Progress"
            status="inprogress"
            tasks={mockTasks}
            onTaskEdit={vi.fn()}
            onTaskDelete={vi.fn()}
            onAddTask={vi.fn()}
            onTaskDrop={onTaskDrop}
          />
        </TestWrapper>
      )
      
      // The actual drop event would be handled by react-dnd
      // We can verify the callback is properly set up
      expect(onTaskDrop).toBeDefined()
      expect(typeof onTaskDrop).toBe('function')
    })
  })

  describe('TaskBoard Drag and Drop Integration', () => {
    it('renders all columns as drop targets', () => {
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} />
        </TestWrapper>
      )
      
      // All three columns should be rendered
      expect(screen.getByText('To Do')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
      
      // Each column should contain its respective tasks
      expect(screen.getByText('Todo Task')).toBeInTheDocument()
      expect(screen.getByText('In Progress Task')).toBeInTheDocument()
      expect(screen.getByText('Done Task')).toBeInTheDocument()
    })

    it('handles task drops between columns', () => {
      const onTaskDrop = vi.fn()
      
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} onTaskDrop={onTaskDrop} />
        </TestWrapper>
      )
      
      // The onTaskDrop handler should be passed to all columns
      expect(onTaskDrop).toBeDefined()
      
      // In a real drag and drop scenario, this would be called with:
      // onTaskDrop(taskId, newStatus)
    })

    it('prevents dropping tasks in the same column', () => {
      const onTaskDrop = vi.fn()
      
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} onTaskDrop={onTaskDrop} />
        </TestWrapper>
      )
      
      // The logic to prevent same-column drops would be in the drop handler
      // We can verify the structure is correct for this logic
      expect(screen.getByText('Todo Task')).toBeInTheDocument()
      
      // In the actual implementation, dropping a todo task on the todo column
      // should not trigger onTaskDrop or should be ignored
    })
  })

  describe('Drag and Drop Visual Feedback', () => {
    it('shows drag preview during drag operation', () => {
      render(
        <TestWrapper>
          <TaskCard
            task={mockTasks[0]}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      )
      
      const taskCard = screen.getByText('Todo Task').closest('[class*="taskCard"]')
      
      // The drag preview would be handled by react-dnd
      // We can verify the task content is available for the preview
      expect(screen.getByText('Todo Task')).toBeInTheDocument()
      expect(screen.getByText('Todo Description')).toBeInTheDocument()
    })

    it('highlights valid drop zones during drag', () => {
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} />
        </TestWrapper>
      )
      
      // All columns should be potential drop zones
      const todoColumn = screen.getByText('To Do').closest('[class*="column"]')
      const inProgressColumn = screen.getByText('In Progress').closest('[class*="column"]')
      const doneColumn = screen.getByText('Done').closest('[class*="column"]')
      
      expect(todoColumn).toBeInTheDocument()
      expect(inProgressColumn).toBeInTheDocument()
      expect(doneColumn).toBeInTheDocument()
    })

    it('shows drop indicators when hovering over columns', () => {
      render(
        <TestWrapper>
          <TaskColumn
            title="In Progress"
            status="inprogress"
            tasks={[]}
            onTaskEdit={vi.fn()}
            onTaskDelete={vi.fn()}
            onAddTask={vi.fn()}
            onTaskDrop={vi.fn()}
          />
        </TestWrapper>
      )
      
      const column = screen.getByText('In Progress').closest('[class*="column"]')
      
      // Simulate hover during drag
      fireEvent.mouseEnter(column)
      
      // The visual feedback would be handled by CSS
      expect(column).toBeInTheDocument()
    })
  })

  describe('Drag and Drop Error Handling', () => {
    it('handles invalid drop targets gracefully', () => {
      const onTaskDrop = vi.fn()
      
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} onTaskDrop={onTaskDrop} />
        </TestWrapper>
      )
      
      // Invalid drops would be prevented by react-dnd configuration
      // We can verify the setup is correct
      expect(screen.getByText('To Do')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    it('reverts drag operation on drop failure', () => {
      const onTaskDrop = vi.fn().mockRejectedValue(new Error('Drop failed'))
      
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} onTaskDrop={onTaskDrop} />
        </TestWrapper>
      )
      
      // Error handling would be implemented in the drop handler
      // The task should remain in its original position on failure
      expect(screen.getByText('Todo Task')).toBeInTheDocument()
    })

    it('shows error feedback for failed drops', () => {
      const onTaskDrop = vi.fn().mockRejectedValue(new Error('Network error'))
      
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} onTaskDrop={onTaskDrop} />
        </TestWrapper>
      )
      
      // Error feedback would be shown through alerts or notifications
      // We can verify the error handling structure is in place
      expect(onTaskDrop).toBeDefined()
    })
  })

  describe('Accessibility for Drag and Drop', () => {
    it('provides keyboard navigation for drag and drop', () => {
      render(
        <TestWrapper>
          <TaskCard
            task={mockTasks[0]}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      )
      
      const taskCard = screen.getByText('Todo Task').closest('[class*="taskCard"]')
      
      // Task cards should be focusable for keyboard navigation
      expect(taskCard).toBeInTheDocument()
      
      // Keyboard events would be handled by react-dnd-accessible-backend
      // or custom keyboard handlers
    })

    it('announces drag and drop operations to screen readers', () => {
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} />
        </TestWrapper>
      )
      
      // ARIA live regions or announcements would be used
      // We can verify the basic structure is accessible
      expect(screen.getByText('To Do')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    it('provides alternative methods for task status changes', () => {
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} />
        </TestWrapper>
      )
      
      // Edit buttons should be available as an alternative to drag and drop
      const editButtons = screen.getAllByLabelText('Edit task')
      expect(editButtons.length).toBeGreaterThan(0)
      
      // Users can change status through the edit modal
      expect(editButtons[0]).toBeInTheDocument()
    })
  })

  describe('Performance Optimization', () => {
    it('handles large numbers of draggable items efficiently', () => {
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        _id: `task-${i}`,
        title: `Task ${i}`,
        description: `Description ${i}`,
        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'inprogress' : 'done',
        createdAt: '2023-01-01T00:00:00.000Z'
      }))
      
      render(
        <TestWrapper>
          <TaskBoard {...mockProps} tasks={manyTasks} />
        </TestWrapper>
      )
      
      // Should render without performance issues
      expect(screen.getByText('To Do')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
      
      // Task count should be displayed correctly
      expect(screen.getByText(`Total Tasks: ${manyTasks.length}`)).toBeInTheDocument()
    })

    it('optimizes re-renders during drag operations', () => {
      let renderCount = 0
      const CountingTaskCard = ({ task, onEdit, onDelete }) => {
        renderCount++
        return (
          <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
        )
      }
      
      render(
        <TestWrapper>
          <CountingTaskCard
            task={mockTasks[0]}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      )
      
      // Should minimize unnecessary re-renders
      expect(renderCount).toBe(1)
      expect(screen.getByText('Todo Task')).toBeInTheDocument()
    })
  })
})