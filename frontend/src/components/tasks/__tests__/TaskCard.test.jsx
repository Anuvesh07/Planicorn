import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import TaskCard from '../TaskCard'

describe('TaskCard', () => {
  const mockTask = {
    _id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  }

  const mockProps = {
    task: mockTask,
    onEdit: vi.fn(),
    onDelete: vi.fn()
  }

  const renderWithDnd = (component) => {
    return render(
      <DndProvider backend={HTML5Backend}>
        {component}
      </DndProvider>
    )
  }

  it('renders task information correctly', () => {
    renderWithDnd(<TaskCard {...mockProps} />)
    
    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText(/Created:/)).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    renderWithDnd(<TaskCard {...mockProps} />)
    
    const editButton = screen.getByLabelText('Edit task')
    fireEvent.click(editButton)
    
    expect(mockProps.onEdit).toHaveBeenCalledWith(mockTask)
  })

  it('calls onDelete when delete button is clicked', () => {
    renderWithDnd(<TaskCard {...mockProps} />)
    
    const deleteButton = screen.getByLabelText('Delete task')
    fireEvent.click(deleteButton)
    
    expect(mockProps.onDelete).toHaveBeenCalledWith(mockTask._id)
  })

  it('shows completed date when task is completed', () => {
    const completedTask = {
      ...mockTask,
      status: 'done',
      completedAt: '2023-01-02T00:00:00.000Z'
    }

    renderWithDnd(<TaskCard {...mockProps} task={completedTask} />)
    
    expect(screen.getByText(/Completed:/)).toBeInTheDocument()
  })

  it('does not show description when not provided', () => {
    const taskWithoutDescription = {
      ...mockTask,
      description: ''
    }

    renderWithDnd(<TaskCard {...mockProps} task={taskWithoutDescription} />)
    
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument()
  })

  it('has draggable functionality enabled', () => {
    renderWithDnd(<TaskCard {...mockProps} />)
    
    // Find the main task card container (the outermost div)
    const taskCard = screen.getByText('Test Task').closest('[class*="taskCard"]')
    expect(taskCard).toBeInTheDocument()
  })
})