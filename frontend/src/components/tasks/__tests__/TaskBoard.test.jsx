import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import TaskBoard from '../TaskBoard'
import { AuthProvider } from '../../../contexts/AuthContext'
import { SocketProvider } from '../../../contexts/SocketContext'

// Mock the socket service
vi.mock('../../../services/socketService', () => ({
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

// Mock auth service
vi.mock('../../../services/authService', () => ({
  default: {
    verifyToken: vi.fn(() => Promise.resolve({ user: null }))
  }
}))

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

describe('TaskBoard', () => {
  const mockTasks = [
    {
      _id: '1',
      title: 'Todo Task',
      status: 'todo',
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      _id: '2',
      title: 'In Progress Task',
      status: 'inprogress',
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      _id: '3',
      title: 'Done Task',
      status: 'done',
      createdAt: '2023-01-01T00:00:00.000Z'
    }
  ]

  const mockProps = {
    tasks: mockTasks,
    onTaskEdit: vi.fn(),
    onTaskDelete: vi.fn(),
    onTaskAdd: vi.fn(),
    loading: false,
    error: null
  }

  it('renders board title and task statistics', () => {
    render(
      <TestWrapper>
        <TaskBoard {...mockProps} />
      </TestWrapper>
    )
    
    expect(screen.getByText('My Task Board')).toBeInTheDocument()
    expect(screen.getByText('Total Tasks: 3')).toBeInTheDocument()
  })

  it('renders all three columns', () => {
    render(
      <TestWrapper>
        <TaskBoard {...mockProps} />
      </TestWrapper>
    )
    
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('shows loading state when loading is true', () => {
    render(
      <TestWrapper>
        <TaskBoard {...mockProps} loading={true} />
      </TestWrapper>
    )
    
    expect(screen.getByText('Loading your tasks...')).toBeInTheDocument()
    expect(screen.queryByText('My Task Board')).not.toBeInTheDocument()
  })

  it('shows error state when error is provided', () => {
    const errorMessage = 'Failed to load tasks'
    render(
      <TestWrapper>
        <TaskBoard {...mockProps} error={errorMessage} />
      </TestWrapper>
    )
    
    expect(screen.getByText('Unable to load tasks')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('renders tasks in their respective columns', () => {
    render(
      <TestWrapper>
        <TaskBoard {...mockProps} />
      </TestWrapper>
    )
    
    expect(screen.getByText('Todo Task')).toBeInTheDocument()
    expect(screen.getByText('In Progress Task')).toBeInTheDocument()
    expect(screen.getByText('Done Task')).toBeInTheDocument()
  })

  it('handles empty tasks array', () => {
    render(
      <TestWrapper>
        <TaskBoard {...mockProps} tasks={[]} />
      </TestWrapper>
    )
    
    expect(screen.getByText('Total Tasks: 0')).toBeInTheDocument()
    expect(screen.getAllByText('No tasks yet')).toHaveLength(3) // One for each column
  })

  it('updates task count when tasks change', () => {
    const { rerender } = render(
      <TestWrapper>
        <TaskBoard {...mockProps} />
      </TestWrapper>
    )
    expect(screen.getByText('Total Tasks: 3')).toBeInTheDocument()

    rerender(
      <TestWrapper>
        <TaskBoard {...mockProps} tasks={mockTasks.slice(0, 2)} />
      </TestWrapper>
    )
    expect(screen.getByText('Total Tasks: 2')).toBeInTheDocument()
  })
})