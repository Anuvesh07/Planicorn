import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import TaskBoard from './tasks/TaskBoard'
import taskService from '../services/taskService'
import { useDebounceCallback } from '../hooks/useDebounce'
import styles from './Dashboard.module.css'

// Lazy load TaskModal since it's only needed when user wants to create/edit tasks
const TaskModal = lazy(() => import('./tasks/TaskModal'))

const Dashboard = () => {
  const { user, logout, loading } = useAuth()
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [modalInitialStatus, setModalInitialStatus] = useState('todo')
  const [modalLoading, setModalLoading] = useState(false)

  // Load tasks on component mount
  useEffect(() => {
    loadTasks()
  }, [])

  // Cleanup pending requests on unmount
  useEffect(() => {
    return () => {
      taskService.cancelPendingRequests()
    }
  }, [])

  const loadTasks = async () => {
    setTasksLoading(true)
    setTasksError(null)
    try {
      const response = await taskService.getTasks()
      setTasks(response.tasks || response.data || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
      setTasksError(error.response?.data?.error?.message || 'Failed to load tasks')
    } finally {
      setTasksLoading(false)
    }
  }

  const handleLogout = useCallback(() => {
    logout()
  }, [logout])

  const handleTaskEdit = useCallback((task) => {
    setEditingTask(task)
    setModalOpen(true)
  }, [])

  const handleTaskDelete = useCallback(async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      await taskService.deleteTask(taskId)
      setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId))
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert(error.response?.data?.error?.message || 'Failed to delete task')
    }
  }, [])

  const handleTaskAdd = useCallback((status = 'todo') => {
    setEditingTask(null)
    setModalInitialStatus(status)
    setModalOpen(true)
  }, [])

  const handleTaskDrop = useCallback(async (taskId, newStatus) => {
    // Find the task being moved
    const taskToMove = tasks.find(task => task._id === taskId)
    if (!taskToMove) {
      console.error('Task not found:', taskId)
      return
    }

    // Don't do anything if the status hasn't changed
    if (taskToMove.status === newStatus) {
      return
    }

    // Optimistically update the UI
    const originalTasks = [...tasks]
    const updatedTask = { 
      ...taskToMove, 
      status: newStatus, 
      updatedAt: new Date().toISOString(),
      // Add completion timestamp if moving to done
      ...(newStatus === 'done' && { completedAt: new Date().toISOString() }),
      // Remove completion timestamp if moving away from done
      ...(newStatus !== 'done' && taskToMove.completedAt && { completedAt: null })
    }

    setTasks(prevTasks => 
      prevTasks.map(task => 
        task._id === taskId ? updatedTask : task
      )
    )

    try {
      // Update the task status on the server (debounced in taskService)
      await taskService.updateTaskStatus(taskId, newStatus)
    } catch (error) {
      console.error('Failed to update task status:', error)
      // Revert the optimistic update on error
      setTasks(originalTasks)
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to update task status. Please try again.'
      alert(errorMessage)
    }
  }, [tasks])

  const handleModalSubmit = useCallback(async (taskData, taskId) => {
    setModalLoading(true)
    try {
      if (taskId) {
        // Update existing task
        const response = await taskService.updateTask(taskId, taskData)
        const updatedTask = response.task || response.data
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task._id === taskId ? updatedTask : task
          )
        )
      } else {
        // Create new task
        const response = await taskService.createTask(taskData)
        const newTask = response.task || response.data
        setTasks(prevTasks => [...prevTasks, newTask])
      }
    } catch (error) {
      console.error('Failed to save task:', error)
      throw error // Re-throw to let modal handle the error display
    } finally {
      setModalLoading(false)
    }
  }, [])

  const handleModalClose = useCallback(() => {
    setModalOpen(false)
    setEditingTask(null)
    setModalInitialStatus('todo')
  }, [])

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>Task Manager</h1>
        <div className={styles.userInfo}>
          <span>Welcome, {user?.username || 'User'}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <TaskBoard
          tasks={tasks}
          loading={tasksLoading}
          error={tasksError}
          onTaskEdit={handleTaskEdit}
          onTaskDelete={handleTaskDelete}
          onTaskAdd={handleTaskAdd}
          onTaskDrop={handleTaskDrop}
        />
      </main>
      
      {modalOpen && (
        <Suspense fallback={<div>Loading modal...</div>}>
          <TaskModal
            isOpen={modalOpen}
            onClose={handleModalClose}
            onSubmit={handleModalSubmit}
            task={editingTask}
            initialStatus={modalInitialStatus}
            loading={modalLoading}
          />
        </Suspense>
      )}
    </div>
  )
}

export default Dashboard