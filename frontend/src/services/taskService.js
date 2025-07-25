import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Simple cache for GET requests
const cache = new Map()
const CACHE_DURATION = 30000 // 30 seconds

// Debounce utility for API calls
const debounceMap = new Map()

const debounce = (key, func, delay) => {
  if (debounceMap.has(key)) {
    clearTimeout(debounceMap.get(key))
  }
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(async () => {
      try {
        const result = await func()
        resolve(result)
      } catch (error) {
        reject(error)
      } finally {
        debounceMap.delete(key)
      }
    }, delay)
    
    debounceMap.set(key, timeoutId)
  })
}

const taskService = {
  async getTasks() {
    const cacheKey = 'tasks'
    const now = Date.now()
    
    // Check cache first
    if (cache.has(cacheKey)) {
      const { data, timestamp } = cache.get(cacheKey)
      if (now - timestamp < CACHE_DURATION) {
        return data
      }
    }
    
    const response = await api.get('/tasks')
    // Backend returns { success: true, data: { tasks: [...] } }
    const data = {
      tasks: response.data.data?.tasks || response.data.tasks || []
    }
    
    // Cache the response
    cache.set(cacheKey, { data, timestamp: now })
    
    return data
  },

  async createTask(taskData) {
    const response = await api.post('/tasks', taskData)
    
    // Invalidate tasks cache
    cache.delete('tasks')
    
    // Backend returns { success: true, data: { task: {...} } }
    return {
      task: response.data.data?.task || response.data.task
    }
  },

  async updateTask(taskId, taskData) {
    // Debounce update requests to prevent rapid successive calls
    return debounce(`update-${taskId}`, async () => {
      const response = await api.put(`/tasks/${taskId}`, taskData)
      
      // Invalidate tasks cache
      cache.delete('tasks')
      
      // Backend returns { success: true, data: { task: {...} } }
      return {
        task: response.data.data?.task || response.data.task
      }
    }, 300)
  },

  async deleteTask(taskId) {
    const response = await api.delete(`/tasks/${taskId}`)
    
    // Invalidate tasks cache
    cache.delete('tasks')
    
    return response.data
  },

  async updateTaskStatus(taskId, status) {
    // Debounce status updates to prevent rapid drag-and-drop calls
    return debounce(`status-${taskId}`, async () => {
      const response = await api.patch(`/tasks/${taskId}/status`, { status })
      
      // Invalidate tasks cache
      cache.delete('tasks')
      
      // Backend returns { success: true, data: { task: {...} } }
      return {
        task: response.data.data?.task || response.data.task
      }
    }, 200)
  },

  // Method to clear cache manually if needed
  clearCache() {
    cache.clear()
  },

  // Method to cancel pending debounced requests
  cancelPendingRequests() {
    debounceMap.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    debounceMap.clear()
  }
}

export default taskService