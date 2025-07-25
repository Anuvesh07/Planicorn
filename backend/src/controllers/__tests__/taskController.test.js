import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Task from '../../models/Task.js'
import User from '../../models/User.js'
import taskRoutes from '../../routes/tasks.js'
import { generateTokens } from '../../utils/jwt.js'
import { globalErrorHandler, notFoundHandler } from '../../middleware/errorHandler.js'

const app = express()
app.use(express.json())
app.use('/api/tasks', taskRoutes)

// Add error handling middleware
app.all('*', notFoundHandler)
app.use(globalErrorHandler)

describe('Task Controller', () => {
  let mongoServer
  let testUser
  let authToken

  beforeAll(async () => {
    // Set up environment variables for testing
    process.env.JWT_SECRET = 'test-jwt-secret-key'
    process.env.JWT_EXPIRES_IN = '15m'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key'
    process.env.JWT_REFRESH_EXPIRES_IN = '7d'

    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()
    await mongoose.connect(mongoUri)
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  beforeEach(async () => {
    await Task.deleteMany({})
    await User.deleteMany({})

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    })

    // Generate auth token
    const tokens = generateTokens(testUser._id.toString())
    authToken = tokens.accessToken
  })

  describe('GET /api/tasks', () => {
    it('should get all tasks for authenticated user', async () => {
      // Create test tasks
      await Task.create([
        { title: 'Task 1', userId: testUser._id, status: 'todo', position: 0 },
        { title: 'Task 2', userId: testUser._id, status: 'inprogress', position: 1 },
        { title: 'Task 3', userId: testUser._id, status: 'done', position: 0 }
      ])

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.tasks).toHaveLength(3)
      expect(response.body.data.pagination.total).toBe(3)
    })

    it('should filter tasks by status', async () => {
      await Task.create([
        { title: 'Task 1', userId: testUser._id, status: 'todo' },
        { title: 'Task 2', userId: testUser._id, status: 'inprogress' },
        { title: 'Task 3', userId: testUser._id, status: 'todo' }
      ])

      const response = await request(app)
        .get('/api/tasks?status=todo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.tasks).toHaveLength(2)
      expect(response.body.data.tasks.every(task => task.status === 'todo')).toBe(true)
    })

    it('should return empty array for user with no tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.tasks).toHaveLength(0)
      expect(response.body.data.pagination.total).toBe(0)
    })

    it('should require authentication', async () => {
      await request(app)
        .get('/api/tasks')
        .expect(401)
    })

    it('should only return tasks for the authenticated user', async () => {
      // Create another user and their task
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      })

      await Task.create([
        { title: 'My Task', userId: testUser._id },
        { title: 'Other Task', userId: otherUser._id }
      ])

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.tasks).toHaveLength(1)
      expect(response.body.data.tasks[0].title).toBe('My Task')
    })
  })

  describe('POST /api/tasks', () => {
    it('should create a new task with valid data', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        status: 'todo'
      }

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.task.title).toBe('New Task')
      expect(response.body.data.task.description).toBe('Task description')
      expect(response.body.data.task.status).toBe('todo')
      expect(response.body.data.task.userId.toString()).toBe(testUser._id.toString())
      expect(response.body.data.task.position).toBe(0)
    })

    it('should create task with minimal data (title only)', async () => {
      const taskData = { title: 'Minimal Task' }

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.task.title).toBe('Minimal Task')
      expect(response.body.data.task.status).toBe('todo') // default
      expect(response.body.data.task.description).toBe('') // default
    })

    it('should auto-increment position for tasks in same status', async () => {
      // Create existing task
      await Task.create({
        title: 'Existing Task',
        userId: testUser._id,
        status: 'todo',
        position: 5
      })

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Task', status: 'todo' })
        .expect(201)

      expect(response.body.data.task.position).toBe(6)
    })

    it('should fail validation with missing title', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'No title' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should fail validation with invalid status', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task', status: 'invalid' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should require authentication', async () => {
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Task' })
        .expect(401)
    })
  })

  describe('PUT /api/tasks/:id', () => {
    let testTask

    beforeEach(async () => {
      testTask = await Task.create({
        title: 'Original Task',
        description: 'Original description',
        status: 'todo',
        userId: testUser._id,
        position: 0
      })
    })

    it('should update task with valid data', async () => {
      const updateData = {
        title: 'Updated Task',
        description: 'Updated description',
        status: 'inprogress',
        position: 5
      }

      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.task.title).toBe('Updated Task')
      expect(response.body.data.task.description).toBe('Updated description')
      expect(response.body.data.task.status).toBe('inprogress')
      expect(response.body.data.task.position).toBe(5)
    })

    it('should update only provided fields', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Only Title Updated' })
        .expect(200)

      expect(response.body.data.task.title).toBe('Only Title Updated')
      expect(response.body.data.task.description).toBe('Original description')
      expect(response.body.data.task.status).toBe('todo')
    })

    it('should set completedAt when status changes to done', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done' })
        .expect(200)

      expect(response.body.data.task.status).toBe('done')
      expect(response.body.data.task.completedAt).toBeTruthy()
    })

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      
      const response = await request(app)
        .put(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('TASK_NOT_FOUND')
    })

    it('should return 400 for invalid task ID', async () => {
      const response = await request(app)
        .put('/api/tasks/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_ID')
    })

    it('should not allow updating other users tasks', async () => {
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      })

      const otherTask = await Task.create({
        title: 'Other Task',
        userId: otherUser._id
      })

      const response = await request(app)
        .put(`/api/tasks/${otherTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Hacked' })
        .expect(404)

      expect(response.body.error.code).toBe('TASK_NOT_FOUND')
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    let testTask

    beforeEach(async () => {
      testTask = await Task.create({
        title: 'Task to Delete',
        userId: testUser._id
      })
    })

    it('should delete existing task', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.message).toBe('Task deleted successfully')
      expect(response.body.data.task.title).toBe('Task to Delete')

      // Verify task is deleted
      const deletedTask = await Task.findById(testTask._id)
      expect(deletedTask).toBeNull()
    })

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      
      const response = await request(app)
        .delete(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('TASK_NOT_FOUND')
    })

    it('should return 400 for invalid task ID', async () => {
      const response = await request(app)
        .delete('/api/tasks/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_ID')
    })

    it('should not allow deleting other users tasks', async () => {
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      })

      const otherTask = await Task.create({
        title: 'Other Task',
        userId: otherUser._id
      })

      const response = await request(app)
        .delete(`/api/tasks/${otherTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.error.code).toBe('TASK_NOT_FOUND')

      // Verify task still exists
      const stillExists = await Task.findById(otherTask._id)
      expect(stillExists).toBeTruthy()
    })
  })

  describe('PATCH /api/tasks/:id/status', () => {
    let testTask

    beforeEach(async () => {
      testTask = await Task.create({
        title: 'Task for Status Update',
        status: 'todo',
        userId: testUser._id,
        position: 0
      })
    })

    it('should update task status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'inprogress' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.task.status).toBe('inprogress')
    })

    it('should update status and position', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done', position: 10 })
        .expect(200)

      expect(response.body.data.task.status).toBe('done')
      expect(response.body.data.task.position).toBe(10)
      expect(response.body.data.task.completedAt).toBeTruthy()
    })

    it('should fail validation with invalid status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should fail validation without status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ position: 5 })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      
      const response = await request(app)
        .patch(`/api/tasks/${fakeId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done' })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('TASK_NOT_FOUND')
    })
  })
})