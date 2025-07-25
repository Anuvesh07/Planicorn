import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { SocketProvider, useSocket } from '../SocketContext'
import { AuthProvider } from '../AuthContext'
import socketService from '../../services/socketService'

// Mock services
vi.mock('../../services/socketService', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onTaskCreated: vi.fn(),
    onTaskUpdated: vi.fn(),
    onTaskDeleted: vi.fn(),
    onTaskStatusUpdated: vi.fn(),
    offTaskCreated: vi.fn(),
    offTaskUpdated: vi.fn(),
    offTaskDeleted: vi.fn(),
    offTaskStatusUpdated: vi.fn(),
    getSocket: vi.fn(() => null),
    isSocketConnected: vi.fn(() => false)
  }
}))

vi.mock('../../services/authService', () => ({
  default: {
    verifyToken: vi.fn(() => Promise.resolve({ 
      user: { _id: '1', username: 'testuser', email: 'test@example.com' } 
    }))
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => 'mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Test component that uses the socket context
const TestComponent = () => {
  const { 
    isConnected, 
    onTaskCreated, 
    onTaskUpdated, 
    onTaskDeleted, 
    onTaskStatusUpdated,
    offTaskCreated,
    offTaskUpdated,
    offTaskDeleted,
    offTaskStatusUpdated
  } = useSocket()
  
  const handleTaskCreated = (task) => {
    console.log('Task created:', task)
  }
  
  const handleTaskUpdated = (task) => {
    console.log('Task updated:', task)
  }
  
  React.useEffect(() => {
    onTaskCreated(handleTaskCreated)
    onTaskUpdated(handleTaskUpdated)
    
    return () => {
      offTaskCreated(handleTaskCreated)
      offTaskUpdated(handleTaskUpdated)
    }
  }, [onTaskCreated, onTaskUpdated, offTaskCreated, offTaskUpdated])
  
  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="socket-methods">Socket methods available</div>
    </div>
  )
}

// Test wrapper
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('SocketContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Provider Initialization', () => {
    it('provides socket context to children', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected')
        expect(screen.getByTestId('socket-methods')).toHaveTextContent('Socket methods available')
      })
    })

    it('throws error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        render(<TestComponent />)
      }).toThrow('useSocket must be used within a SocketProvider')
      
      consoleError.mockRestore()
    })

    it('connects to socket when user is authenticated', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalledWith('mock-token')
      })
    })

    it('does not connect when user is not authenticated', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // Wait a bit to ensure no connection attempt
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(socketService.connect).not.toHaveBeenCalled()
    })
  })

  describe('Connection Management', () => {
    it('establishes connection with valid token', async () => {
      socketService.isSocketConnected.mockReturnValue(true)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalledWith('mock-token')
      })
    })

    it('disconnects on component unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalled()
      })
      
      unmount()
      
      expect(socketService.disconnect).toHaveBeenCalled()
    })

    it('reconnects when token changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalledWith('mock-token')
      })
      
      // Change token
      localStorageMock.getItem.mockReturnValue('new-token')
      
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // Should disconnect and reconnect with new token
      await waitFor(() => {
        expect(socketService.disconnect).toHaveBeenCalled()
      })
    })

    it('handles connection errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      socketService.connect.mockImplementation(() => {
        throw new Error('Connection failed')
      })
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalled()
      })
      
      // Should not crash the app
      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      
      consoleError.mockRestore()
    })
  })

  describe('Event Listeners', () => {
    it('provides task event listener methods', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.onTaskCreated).toHaveBeenCalled()
        expect(socketService.onTaskUpdated).toHaveBeenCalled()
      })
    })

    it('registers event listeners correctly', async () => {
      const mockCallback = vi.fn()
      
      const TestComponentWithCallback = () => {
        const { onTaskCreated } = useSocket()
        
        React.useEffect(() => {
          onTaskCreated(mockCallback)
        }, [onTaskCreated])
        
        return <div>Test</div>
      }
      
      render(
        <TestWrapper>
          <TestComponentWithCallback />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.onTaskCreated).toHaveBeenCalledWith(mockCallback)
      })
    })

    it('removes event listeners on cleanup', async () => {
      const mockCallback = vi.fn()
      
      const TestComponentWithCleanup = () => {
        const { onTaskCreated, offTaskCreated } = useSocket()
        
        React.useEffect(() => {
          onTaskCreated(mockCallback)
          
          return () => {
            offTaskCreated(mockCallback)
          }
        }, [onTaskCreated, offTaskCreated])
        
        return <div>Test</div>
      }
      
      const { unmount } = render(
        <TestWrapper>
          <TestComponentWithCleanup />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.onTaskCreated).toHaveBeenCalledWith(mockCallback)
      })
      
      unmount()
      
      expect(socketService.offTaskCreated).toHaveBeenCalledWith(mockCallback)
    })

    it('handles all task event types', async () => {
      const TestComponentAllEvents = () => {
        const { 
          onTaskCreated, 
          onTaskUpdated, 
          onTaskDeleted, 
          onTaskStatusUpdated 
        } = useSocket()
        
        React.useEffect(() => {
          const callback = vi.fn()
          onTaskCreated(callback)
          onTaskUpdated(callback)
          onTaskDeleted(callback)
          onTaskStatusUpdated(callback)
        }, [onTaskCreated, onTaskUpdated, onTaskDeleted, onTaskStatusUpdated])
        
        return <div>Test</div>
      }
      
      render(
        <TestWrapper>
          <TestComponentAllEvents />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.onTaskCreated).toHaveBeenCalled()
        expect(socketService.onTaskUpdated).toHaveBeenCalled()
        expect(socketService.onTaskDeleted).toHaveBeenCalled()
        expect(socketService.onTaskStatusUpdated).toHaveBeenCalled()
      })
    })
  })

  describe('Connection Status', () => {
    it('reflects actual connection status', async () => {
      socketService.isSocketConnected.mockReturnValue(true)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected')
      })
    })

    it('updates status when connection changes', async () => {
      socketService.isSocketConnected
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
      
      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected')
      
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected')
      })
    })

    it('handles connection status polling', async () => {
      socketService.isSocketConnected.mockReturnValue(false)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected')
      
      // Simulate connection established
      act(() => {
        socketService.isSocketConnected.mockReturnValue(true)
      })
      
      // The status would be updated through socket events or polling
      // This test verifies the basic structure is in place
      expect(socketService.isSocketConnected).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles socket service errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      socketService.onTaskCreated.mockImplementation(() => {
        throw new Error('Socket error')
      })
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // Should not crash the app
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      })
      
      consoleError.mockRestore()
    })

    it('handles missing socket service methods', async () => {
      const originalOnTaskCreated = socketService.onTaskCreated
      socketService.onTaskCreated = undefined
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // Should handle gracefully
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      })
      
      socketService.onTaskCreated = originalOnTaskCreated
      consoleError.mockRestore()
    })

    it('recovers from connection failures', async () => {
      socketService.connect
        .mockImplementationOnce(() => {
          throw new Error('Connection failed')
        })
        .mockImplementationOnce(() => {
          return { connected: true }
        })
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // First attempt fails
      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalledTimes(1)
      })
      
      // Retry connection
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // Should attempt connection again
      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalledTimes(2)
      })
      
      consoleError.mockRestore()
    })
  })

  describe('Memory Management', () => {
    it('cleans up event listeners on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.onTaskCreated).toHaveBeenCalled()
      })
      
      unmount()
      
      // Should clean up all listeners
      expect(socketService.offTaskCreated).toHaveBeenCalled()
      expect(socketService.offTaskUpdated).toHaveBeenCalled()
      expect(socketService.disconnect).toHaveBeenCalled()
    })

    it('prevents memory leaks with multiple components', async () => {
      const Component1 = () => {
        const { onTaskCreated } = useSocket()
        React.useEffect(() => {
          onTaskCreated(vi.fn())
        }, [onTaskCreated])
        return <div>Component 1</div>
      }
      
      const Component2 = () => {
        const { onTaskUpdated } = useSocket()
        React.useEffect(() => {
          onTaskUpdated(vi.fn())
        }, [onTaskUpdated])
        return <div>Component 2</div>
      }
      
      const { unmount } = render(
        <TestWrapper>
          <Component1 />
          <Component2 />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.onTaskCreated).toHaveBeenCalled()
        expect(socketService.onTaskUpdated).toHaveBeenCalled()
      })
      
      unmount()
      
      // Should clean up all listeners from all components
      expect(socketService.disconnect).toHaveBeenCalled()
    })

    it('handles rapid mount/unmount cycles', async () => {
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        )
        
        await waitFor(() => {
          expect(socketService.connect).toHaveBeenCalled()
        })
        
        unmount()
        
        expect(socketService.disconnect).toHaveBeenCalled()
        
        vi.clearAllMocks()
      }
    })
  })

  describe('Integration with Auth', () => {
    it('connects when user becomes authenticated', async () => {
      // Start without token
      localStorageMock.getItem.mockReturnValue(null)
      
      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // Should not connect initially
      expect(socketService.connect).not.toHaveBeenCalled()
      
      // User logs in
      localStorageMock.getItem.mockReturnValue('new-token')
      
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // Should connect with new token
      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalledWith('new-token')
      })
    })

    it('disconnects when user logs out', async () => {
      // Start with token
      localStorageMock.getItem.mockReturnValue('token')
      
      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalledWith('token')
      })
      
      // User logs out
      localStorageMock.getItem.mockReturnValue(null)
      
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )
      
      // Should disconnect
      await waitFor(() => {
        expect(socketService.disconnect).toHaveBeenCalled()
      })
    })
  })
})