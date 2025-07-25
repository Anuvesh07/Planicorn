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

const authService = {
  async login(credentials) {
    const response = await api.post('/auth/login', credentials)
    // Backend returns data.data with accessToken, but we need token
    const { data } = response.data
    return {
      user: data.user,
      token: data.accessToken
    }
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData)
    // Backend returns data.data with accessToken, but we need token
    const { data } = response.data
    return {
      user: data.user,
      token: data.accessToken
    }
  },

  async verifyToken() {
    const response = await api.get('/auth/verify')
    return response.data.data.user
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Even if logout fails on server, we'll clear local storage
      console.error('Logout error:', error)
    }
  }
}

export default authService