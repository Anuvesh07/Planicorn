// Socket.IO event handlers
export const handleConnection = (io) => {
  return (socket) => {
    const userId = socket.user._id.toString()
    
    console.log(`User ${socket.user.username} connected with socket ID: ${socket.id}`)
    
    // Join user-specific room
    socket.join(`user:${userId}`)
    
    // Handle task-related events
    socket.on('join-task-board', () => {
      console.log(`User ${socket.user.username} joined task board`)
      socket.emit('task-board-joined', { message: 'Successfully joined task board' })
    })
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.user.username} disconnected: ${reason}`)
    })
    
    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.username}:`, error)
    })
  }
}

// Emit task events to user's room
export const emitTaskEvent = (io, userId, eventType, taskData) => {
  const room = `user:${userId}`
  
  switch (eventType) {
    case 'task-created':
      io.to(room).emit('task-created', {
        task: taskData,
        timestamp: new Date().toISOString()
      })
      break
      
    case 'task-updated':
      io.to(room).emit('task-updated', {
        task: taskData,
        timestamp: new Date().toISOString()
      })
      break
      
    case 'task-deleted':
      io.to(room).emit('task-deleted', {
        taskId: taskData._id || taskData.id,
        task: taskData,
        timestamp: new Date().toISOString()
      })
      break
      
    case 'task-status-updated':
      io.to(room).emit('task-status-updated', {
        task: taskData,
        timestamp: new Date().toISOString()
      })
      break
      
    default:
      console.warn(`Unknown task event type: ${eventType}`)
  }
}