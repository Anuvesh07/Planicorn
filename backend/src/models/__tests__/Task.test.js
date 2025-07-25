import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Task from '../Task.js'
import User from '../User.js'

describe('Task Model', () => {
  let mongoServer

  beforeAll(async () => {
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
  })

  describe('Schema Validation', () => {
    let testUser

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('should create a valid task with required fields', async () => {
      const taskData = {
        title: 'Test Task',
        userId: testUser._id
      }

      const task = await Task.create(taskData)

      expect(task.title).toBe('Test Task')
      expect(task.userId.toString()).toBe(testUser._id.toString())
      expect(task.status).toBe('todo') // default value
      expect(task.description).toBe('') // default value
      expect(task.position).toBe(0) // default value
      expect(task.completedAt).toBeNull()
      expect(task.createdAt).toBeDefined()
      expect(task.updatedAt).toBeDefined()
    })

    it('should create a task with all fields', async () => {
      const taskData = {
        title: 'Complete Task',
        description: 'This is a test task description',
        status: 'inprogress',
        userId: testUser._id,
        position: 5
      }

      const task = await Task.create(taskData)

      expect(task.title).toBe('Complete Task')
      expect(task.description).toBe('This is a test task description')
      expect(task.status).toBe('inprogress')
      expect(task.position).toBe(5)
    })

    it('should fail validation without required title', async () => {
      const taskData = {
        userId: testUser._id
      }

      await expect(Task.create(taskData)).rejects.toThrow('Task title is required')
    })

    it('should fail validation without required userId', async () => {
      const taskData = {
        title: 'Test Task'
      }

      await expect(Task.create(taskData)).rejects.toThrow('User ID is required')
    })

    it('should fail validation with invalid status', async () => {
      const taskData = {
        title: 'Test Task',
        status: 'invalid',
        userId: testUser._id
      }

      await expect(Task.create(taskData)).rejects.toThrow('Status must be one of: todo, inprogress, done')
    })

    it('should fail validation with title too long', async () => {
      const taskData = {
        title: 'a'.repeat(201), // 201 characters
        userId: testUser._id
      }

      await expect(Task.create(taskData)).rejects.toThrow('Task title cannot exceed 200 characters')
    })

    it('should fail validation with description too long', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'a'.repeat(1001), // 1001 characters
        userId: testUser._id
      }

      await expect(Task.create(taskData)).rejects.toThrow('Task description cannot exceed 1000 characters')
    })

    it('should fail validation with negative position', async () => {
      const taskData = {
        title: 'Test Task',
        position: -1,
        userId: testUser._id
      }

      await expect(Task.create(taskData)).rejects.toThrow('Position cannot be negative')
    })

    it('should trim whitespace from title and description', async () => {
      const taskData = {
        title: '  Test Task  ',
        description: '  Test Description  ',
        userId: testUser._id
      }

      const task = await Task.create(taskData)

      expect(task.title).toBe('Test Task')
      expect(task.description).toBe('Test Description')
    })
  })

  describe('Pre-save Middleware', () => {
    let testUser

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('should set completedAt when status changes to done', async () => {
      const task = await Task.create({
        title: 'Test Task',
        userId: testUser._id
      })

      expect(task.completedAt).toBeNull()

      task.status = 'done'
      await task.save()

      expect(task.completedAt).toBeInstanceOf(Date)
      expect(task.completedAt.getTime()).toBeCloseTo(Date.now(), -3) // within 1 second
    })

    it('should clear completedAt when status changes from done to other status', async () => {
      const task = await Task.create({
        title: 'Test Task',
        status: 'done',
        userId: testUser._id
      })

      expect(task.completedAt).toBeInstanceOf(Date)

      task.status = 'inprogress'
      await task.save()

      expect(task.completedAt).toBeNull()
    })

    it('should not change completedAt if status is already done', async () => {
      const task = await Task.create({
        title: 'Test Task',
        status: 'done',
        userId: testUser._id
      })

      const originalCompletedAt = task.completedAt

      // Wait a bit to ensure different timestamp if it were to change
      await new Promise(resolve => setTimeout(resolve, 10))

      task.title = 'Updated Task'
      await task.save()

      expect(task.completedAt.getTime()).toBe(originalCompletedAt.getTime())
    })
  })

  describe('Indexes', () => {
    it('should have the correct indexes', async () => {
      const indexes = await Task.collection.getIndexes()
      
      // Check for compound index on userId and status
      const userIdStatusIndex = Object.keys(indexes).find(key => 
        indexes[key].some(index => 
          index[0] === 'userId' && index[1] === 1 &&
          indexes[key].some(idx => idx[0] === 'status' && idx[1] === 1)
        )
      )
      expect(userIdStatusIndex).toBeDefined()

      // Check for compound index on userId and position
      const userIdPositionIndex = Object.keys(indexes).find(key => 
        indexes[key].some(index => 
          index[0] === 'userId' && index[1] === 1 &&
          indexes[key].some(idx => idx[0] === 'position' && idx[1] === 1)
        )
      )
      expect(userIdPositionIndex).toBeDefined()
    })
  })
})