import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import socketService from '../services/socketService'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)

  useEffect(() => {
    if (user) {
      // Connect to Socket.IO when user is authenticated
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const socket = socketService.connect(token)
          
          // Set up connection status listeners
          socket.on('connect', () => {
            setIsConnected(true)
            setConnectionError(null)
          })

          socket.on('disconnect', () => {
            setIsConnected(false)
          })

          socket.on('connect_error', (error) => {
            setIsConnected(false)
            setConnectionError(error.message)
          })

        } catch (error) {
          console.error('Failed to connect to Socket.IO:', error)
          setConnectionError(error.message)
        }
      }
    } else {
      // Disconnect when user logs out
      socketService.disconnect()
      setIsConnected(false)
      setConnectionError(null)
    }

    // Cleanup on unmount
    return () => {
      if (!user) {
        socketService.disconnect()
      }
    }
  }, [user])

  const value = {
    socket: socketService.getSocket(),
    isConnected,
    connectionError,
    socketService
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}