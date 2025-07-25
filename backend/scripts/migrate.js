#!/usr/bin/env node

/**
 * Database Migration Script for Task Manager
 * This script handles database schema updates and data migrations
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env') })

// Import models
import User from '../src/models/User.js'
import Task from '../src/models/Task.js'

const MIGRATION_VERSION_KEY = 'migration_version'

class MigrationRunner {
  constructor() {
    this.migrations = [
      {
        version: 1,
        name: 'initial_setup',
        description: 'Create initial indexes and setup',
        up: this.migration_001_initial_setup.bind(this)
      },
      {
        version: 2,
        name: 'add_task_positions',
        description: 'Add position field to existing tasks',
        up: this.migration_002_add_task_positions.bind(this)
      },
      {
        version: 3,
        name: 'optimize_indexes',
        description: 'Optimize database indexes for performance',
        up: this.migration_003_optimize_indexes.bind(this)
      }
    ]
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      })
      console.log('✅ Connected to MongoDB for migrations')
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message)
      process.exit(1)
    }
  }

  async disconnect() {
    await mongoose.disconnect()
    console.log('📡 Disconnected from MongoDB')
  }

  async getCurrentVersion() {
    try {
      const db = mongoose.connection.db
      const collection = db.collection('system_config')
      const versionDoc = await collection.findOne({ key: MIGRATION_VERSION_KEY })
      return versionDoc ? versionDoc.value : 0
    } catch (error) {
      console.log('No migration version found, starting from 0')
      return 0
    }
  }

  async setCurrentVersion(version) {
    const db = mongoose.connection.db
    const collection = db.collection('system_config')
    await collection.replaceOne(
      { key: MIGRATION_VERSION_KEY },
      { key: MIGRATION_VERSION_KEY, value: version, updatedAt: new Date() },
      { upsert: true }
    )
  }

  async runMigrations() {
    const currentVersion = await this.getCurrentVersion()
    console.log(`📊 Current migration version: ${currentVersion}`)

    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion)
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations')
      return
    }

    console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`)

    for (const migration of pendingMigrations) {
      console.log(`\n🚀 Running migration ${migration.version}: ${migration.name}`)
      console.log(`   Description: ${migration.description}`)
      
      try {
        await migration.up()
        await this.setCurrentVersion(migration.version)
        console.log(`✅ Migration ${migration.version} completed successfully`)
      } catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error.message)
        throw error
      }
    }

    console.log('\n🎉 All migrations completed successfully!')
  }

  // Migration 001: Initial setup
  async migration_001_initial_setup() {
    console.log('   Creating initial database indexes...')
    
    // Create indexes for User model
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ username: 1 }, { unique: true })
    
    // Create indexes for Task model
    await Task.collection.createIndex({ userId: 1, status: 1 })
    await Task.collection.createIndex({ userId: 1, createdAt: -1 })
    
    console.log('   ✅ Initial indexes created')
  }

  // Migration 002: Add position field to existing tasks
  async migration_002_add_task_positions() {
    console.log('   Adding position field to existing tasks...')
    
    const tasks = await Task.find({}).sort({ createdAt: 1 })
    const statusGroups = {}
    
    // Group tasks by user and status
    for (const task of tasks) {
      const key = `${task.userId}_${task.status}`
      if (!statusGroups[key]) {
        statusGroups[key] = []
      }
      statusGroups[key].push(task)
    }
    
    // Assign positions within each group
    for (const [key, groupTasks] of Object.entries(statusGroups)) {
      for (let i = 0; i < groupTasks.length; i++) {
        const task = groupTasks[i]
        if (task.position === undefined || task.position === null) {
          await Task.updateOne(
            { _id: task._id },
            { $set: { position: i } }
          )
        }
      }
    }
    
    console.log(`   ✅ Updated positions for ${tasks.length} tasks`)
  }

  // Migration 003: Optimize indexes
  async migration_003_optimize_indexes() {
    console.log('   Optimizing database indexes...')
    
    // Add compound index for task queries
    await Task.collection.createIndex({ userId: 1, status: 1, position: 1 })
    
    // Add index for completed tasks
    await Task.collection.createIndex({ 
      userId: 1, 
      completedAt: 1 
    }, { 
      sparse: true // Only index documents that have completedAt field
    })
    
    // Add text index for task search (if needed in future)
    await Task.collection.createIndex({ 
      title: 'text', 
      description: 'text' 
    })
    
    console.log('   ✅ Database indexes optimized')
  }

  async checkDatabaseHealth() {
    console.log('\n🏥 Performing database health check...')
    
    try {
      // Check connection
      const adminDb = mongoose.connection.db.admin()
      await adminDb.ping()
      console.log('   ✅ Database connection healthy')
      
      // Check collections
      const userCount = await User.countDocuments()
      const taskCount = await Task.countDocuments()
      console.log(`   📊 Database stats: ${userCount} users, ${taskCount} tasks`)
      
      // Check indexes
      const userIndexes = await User.collection.getIndexes()
      const taskIndexes = await Task.collection.getIndexes()
      console.log(`   📇 Indexes: ${Object.keys(userIndexes).length} user indexes, ${Object.keys(taskIndexes).length} task indexes`)
      
      console.log('   ✅ Database health check passed')
    } catch (error) {
      console.error('   ❌ Database health check failed:', error.message)
      throw error
    }
  }
}

// Main execution
async function main() {
  const runner = new MigrationRunner()
  
  try {
    await runner.connect()
    await runner.runMigrations()
    await runner.checkDatabaseHealth()
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await runner.disconnect()
  }
}

// Handle command line arguments
const command = process.argv[2] || 'migrate'

switch (command) {
  case 'migrate':
    main()
    break
  case 'status':
    (async () => {
      const runner = new MigrationRunner()
      await runner.connect()
      const version = await runner.getCurrentVersion()
      console.log(`Current migration version: ${version}`)
      await runner.disconnect()
    })()
    break
  case 'health':
    (async () => {
      const runner = new MigrationRunner()
      await runner.connect()
      await runner.checkDatabaseHealth()
      await runner.disconnect()
    })()
    break
  default:
    console.log('Usage: node migrate.js [migrate|status|health]')
    process.exit(1)
}