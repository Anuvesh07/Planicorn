import mongoose from 'mongoose'

// Connection configuration with pooling and retry logic
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  retryReads: true,
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  heartbeatFrequencyMS: 10000, // Heartbeat every 10 seconds
}

let isConnected = false
let connectionAttempts = 0
const maxRetries = 5
const retryDelay = 5000 // 5 seconds

const connectDB = async () => {
  if (isConnected) {
    console.log('Database already connected')
    return
  }

  try {
    connectionAttempts++
    console.log(`Attempting to connect to MongoDB (attempt ${connectionAttempts}/${maxRetries})...`)
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions)
    
    isConnected = true
    connectionAttempts = 0
    
    console.log(`MongoDB Connected: ${conn.connection.host}`)
    console.log(`Database: ${conn.connection.name}`)
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB')
      isConnected = true
    })
    
    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err)
      isConnected = false
    })
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB')
      isConnected = false
      
      // Attempt to reconnect if not intentionally disconnected
      if (connectionAttempts < maxRetries) {
        console.log(`Attempting to reconnect in ${retryDelay / 1000} seconds...`)
        setTimeout(connectDB, retryDelay)
      }
    })
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Received SIGINT. Gracefully shutting down...')
      await mongoose.connection.close()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('Database connection error:', error.message)
    isConnected = false
    
    if (connectionAttempts < maxRetries) {
      console.log(`Retrying connection in ${retryDelay / 1000} seconds... (${connectionAttempts}/${maxRetries})`)
      setTimeout(connectDB, retryDelay)
    } else {
      console.error('Max connection attempts reached. Exiting...')
      process.exit(1)
    }
  }
}

// Database health check function
const checkDatabaseHealth = async () => {
  try {
    if (!isConnected) {
      return {
        status: 'disconnected',
        message: 'Database is not connected',
        timestamp: new Date().toISOString()
      }
    }
    
    // Ping the database
    await mongoose.connection.db.admin().ping()
    
    return {
      status: 'healthy',
      message: 'Database connection is healthy',
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

// Get connection status
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }
  
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    status: states[mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host,
    database: mongoose.connection.name
  }
}

export default connectDB
export { checkDatabaseHealth, getConnectionStatus }