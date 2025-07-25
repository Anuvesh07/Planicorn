import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      return this.socket
    }

    const serverUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'
    
    this.socket = io(serverUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    this.setupEventListeners()
    return this.socket
  }

  setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server')
      this.isConnected = true
      this.reconnectAttempts = 0
      
      // Join task board room
      this.socket.emit('join-task-board')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server:', reason)
      this.isConnected = false
      
      // Attempt to reconnect if disconnection was not intentional
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return
      }
      
      this.attemptReconnect()
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message)
      this.isConnected = false
      this.attemptReconnect()
    })

    this.socket.on('task-board-joined', (data) => {
      console.log('Successfully joined task board:', data.message)
    })
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (this.socket && !this.isConnected) {
        this.socket.connect()
      }
    }, delay)
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.reconnectAttempts = 0
    }
  }

  // Task event listeners
  onTaskCreated(callback) {
    if (this.socket) {
      this.socket.on('task-created', callback)
    }
  }

  onTaskUpdated(callback) {
    if (this.socket) {
      this.socket.on('task-updated', callback)
    }
  }

  onTaskDeleted(callback) {
    if (this.socket) {
      this.socket.on('task-deleted', callback)
    }
  }

  onTaskStatusUpdated(callback) {
    if (this.socket) {
      this.socket.on('task-status-updated', callback)
    }
  }

  // Remove event listeners
  offTaskCreated(callback) {
    if (this.socket) {
      this.socket.off('task-created', callback)
    }
  }

  offTaskUpdated(callback) {
    if (this.socket) {
      this.socket.off('task-updated', callback)
    }
  }

  offTaskDeleted(callback) {
    if (this.socket) {
      this.socket.off('task-deleted', callback)
    }
  }

  offTaskStatusUpdated(callback) {
    if (this.socket) {
      this.socket.off('task-status-updated', callback)
    }
  }

  // Utility methods
  isSocketConnected() {
    return this.isConnected && this.socket?.connected
  }

  getSocket() {
    return this.socket
  }
}

// Create a singleton instance
const socketService = new SocketService()
export default socketService