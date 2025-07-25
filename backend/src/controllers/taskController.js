import Task from '../models/Task.js'
import { AppError, catchAsync } from '../middleware/errorHandler.js'
import { emitTaskEvent } from '../socket/index.js'

// Get all tasks for the authenticated user
export const getTasks = catchAsync(async (req, res) => {
  const userId = req.user._id
  const { status, page = 1, limit = 50 } = req.query

  // Build query
  const query = { userId }
  if (status && ['todo', 'inprogress', 'done'].includes(status)) {
    query.status = status
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit)

  // Fetch tasks with pagination, sorted by position within status, then by creation date
  const tasks = await Task.find(query)
    .sort({ status: 1, position: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  // Get total count for pagination info
  const total = await Task.countDocuments(query)

  res.json({
    success: true,
    data: {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  })
})

// Create a new task
export const createTask = catchAsync(async (req, res, next) => {
  const { title, description, status = 'todo', position } = req.body
  const userId = req.user._id

  // If position is not provided, set it to the end of the status column
  let taskPosition = position
  if (taskPosition === undefined) {
    const lastTask = await Task.findOne({ userId, status })
      .sort({ position: -1 })
      .select('position')
    
    taskPosition = lastTask ? lastTask.position + 1 : 0
  }

  // Create new task
  const task = new Task({
    title,
    description,
    status,
    userId,
    position: taskPosition
  })

  await task.save()

  // Emit real-time event
  const io = req.app.get('io')
  if (io) {
    emitTaskEvent(io, userId.toString(), 'task-created', task)
  }

  res.status(201).json({
    success: true,
    data: {
      task
    }
  })
})

// Update an existing task
export const updateTask = catchAsync(async (req, res, next) => {
  const { title, description, status, position } = req.body
  const userId = req.user._id
  
  // Task is already validated and attached by middleware
  const task = req.task

  // Update fields
  if (title !== undefined) task.title = title
  if (description !== undefined) task.description = description
  if (status !== undefined) task.status = status
  if (position !== undefined) task.position = position

  await task.save()

  // Emit real-time event
  const io = req.app.get('io')
  if (io) {
    emitTaskEvent(io, userId.toString(), 'task-updated', task)
  }

  res.json({
    success: true,
    data: {
      task
    }
  })
})

// Delete a task
export const deleteTask = catchAsync(async (req, res, next) => {
  const userId = req.user._id
  
  // Task is already validated and attached by middleware
  const task = req.task

  // Delete the task
  await Task.findByIdAndDelete(task._id)

  // Emit real-time event
  const io = req.app.get('io')
  if (io) {
    emitTaskEvent(io, userId.toString(), 'task-deleted', task)
  }

  res.json({
    success: true,
    data: {
      message: 'Task deleted successfully',
      task
    }
  })
})

// Update task status only
export const updateTaskStatus = catchAsync(async (req, res, next) => {
  const { status, position } = req.body
  const userId = req.user._id
  
  // Task is already validated and attached by middleware
  const task = req.task

  // Update status and position
  task.status = status
  if (position !== undefined) {
    task.position = position
  }

  await task.save()

  // Emit real-time event
  const io = req.app.get('io')
  if (io) {
    emitTaskEvent(io, userId.toString(), 'task-status-updated', task)
  }

  res.json({
    success: true,
    data: {
      task
    }
  })
})