import express from 'express'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus
} from '../controllers/taskController.js'
import { authenticate } from '../middleware/auth.js'
import {
  validateCreateTask,
  validateUpdateTask,
  validateUpdateTaskStatus,
  validateTaskQuery,
  validateObjectId,
  validateTaskOwnership,
  sanitizeInput,
  validateRequestSize,
  validateNoSqlInjection
} from '../middleware/validation.js'
import { handleValidationErrors } from '../middleware/errorHandler.js'

const router = express.Router()

// Apply security middleware to all task routes
router.use(sanitizeInput)
router.use(validateRequestSize)
router.use(validateNoSqlInjection)

// All task routes require authentication
router.use(authenticate)

// GET /api/tasks - Get all user's tasks
router.get('/', validateTaskQuery, handleValidationErrors, getTasks)

// POST /api/tasks - Create new task
router.post('/', validateCreateTask, handleValidationErrors, createTask)

// PUT /api/tasks/:id - Update existing task
router.put('/:id', validateObjectId(), validateTaskOwnership, validateUpdateTask, handleValidationErrors, updateTask)

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', validateObjectId(), validateTaskOwnership, deleteTask)

// PATCH /api/tasks/:id/status - Update task status
router.patch('/:id/status', validateObjectId(), validateTaskOwnership, validateUpdateTaskStatus, handleValidationErrors, updateTaskStatus)

export default router