import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [1, 'Task title cannot be empty'],
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Task description cannot exceed 1000 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: {
      values: ['todo', 'inprogress', 'done'],
      message: 'Status must be one of: todo, inprogress, done'
    },
    default: 'todo'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  position: {
    type: Number,
    default: 0,
    min: [0, 'Position cannot be negative']
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Indexes for performance
taskSchema.index({ userId: 1, status: 1 })
taskSchema.index({ userId: 1, position: 1 })
taskSchema.index({ userId: 1, createdAt: -1 })

// Pre-save middleware to set completedAt when status changes to 'done'
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date()
    } else if (this.status !== 'done') {
      this.completedAt = null
    }
  }
  next()
})

// Instance method to get task data with populated user info (excluding sensitive data)
taskSchema.methods.toJSON = function() {
  const taskObject = this.toObject()
  return taskObject
}

const Task = mongoose.model('Task', taskSchema)

export default Task