import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import User from '../User.js'

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

afterEach(async () => {
  await User.deleteMany({})
})

describe('User Model', () => {
  const validUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  }

  test('should create a user with valid data', async () => {
    const user = new User(validUserData)
    const savedUser = await user.save()

    expect(savedUser._id).toBeDefined()
    expect(savedUser.username).toBe(validUserData.username)
    expect(savedUser.email).toBe(validUserData.email)
    expect(savedUser.password).not.toBe(validUserData.password) // Should be hashed
    expect(savedUser.createdAt).toBeDefined()
    expect(savedUser.updatedAt).toBeDefined()
  })

  test('should hash password before saving', async () => {
    const user = new User(validUserData)
    await user.save()

    expect(user.password).not.toBe(validUserData.password)
    expect(user.password.length).toBeGreaterThan(50) // Hashed password should be longer
  })

  test('should compare password correctly', async () => {
    const user = new User(validUserData)
    await user.save()

    const isMatch = await user.comparePassword('password123')
    const isNotMatch = await user.comparePassword('wrongpassword')

    expect(isMatch).toBe(true)
    expect(isNotMatch).toBe(false)
  })

  test('should not include password in JSON output', async () => {
    const user = new User(validUserData)
    await user.save()

    const userJSON = user.toJSON()
    expect(userJSON.password).toBeUndefined()
    expect(userJSON.username).toBe(validUserData.username)
    expect(userJSON.email).toBe(validUserData.email)
  })

  test('should require username, email, and password', async () => {
    const user = new User({})

    let error
    try {
      await user.save()
    } catch (err) {
      error = err
    }

    expect(error).toBeDefined()
    expect(error.errors.username).toBeDefined()
    expect(error.errors.email).toBeDefined()
    expect(error.errors.password).toBeDefined()
  })

  test('should enforce unique username and email', async () => {
    const user1 = new User(validUserData)
    await user1.save()

    const user2 = new User(validUserData)

    let error
    try {
      await user2.save()
    } catch (err) {
      error = err
    }

    expect(error).toBeDefined()
    expect(error.code).toBe(11000) // MongoDB duplicate key error
  })

  test('should validate email format', async () => {
    const user = new User({
      ...validUserData,
      email: 'invalid-email'
    })

    let error
    try {
      await user.save()
    } catch (err) {
      error = err
    }

    expect(error).toBeDefined()
    expect(error.errors.email).toBeDefined()
  })

  test('should validate username format', async () => {
    const user = new User({
      ...validUserData,
      username: 'invalid username!' // Contains space and special character
    })

    let error
    try {
      await user.save()
    } catch (err) {
      error = err
    }

    expect(error).toBeDefined()
    expect(error.errors.username).toBeDefined()
  })

  test('should enforce minimum password length', async () => {
    const user = new User({
      ...validUserData,
      password: '123' // Too short
    })

    let error
    try {
      await user.save()
    } catch (err) {
      error = err
    }

    expect(error).toBeDefined()
    expect(error.errors.password).toBeDefined()
  })
})