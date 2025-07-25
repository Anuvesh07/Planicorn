import { Server } from 'socket.io'
import { socketAuth } from './socketAuth.js'
import { handleConnection } from './socketHandlers.js'

// Initialize Socket.IO server
export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  })

  // Apply authentication middleware
  io.use(socketAuth)

  // Handle connections
  io.on('connection', handleConnection(io))

  // Handle connection errors
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err.message)
  })

  console.log('Socket.IO server initialized')
  
  return io
}

export { emitTaskEvent } from './socketHandlers.js'