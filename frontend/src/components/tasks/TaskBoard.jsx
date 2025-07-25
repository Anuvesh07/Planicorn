import React, { useState, useEffect, memo } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useSocket } from '../../contexts/SocketContext'
import TaskColumn from './TaskColumn'
import styles from './TaskBoard.module.css'

const TaskBoard = memo(({ 
  tasks = [], 
  onTaskEdit, 
  onTaskDelete, 
  onTaskAdd,
  onTaskDrop,
  loading = false,
  error = null 
}) => {
  const [boardTasks, setBoardTasks] = useState(tasks)
  const { socketService, isConnected } = useSocket()

  useEffect(() => {
    setBoardTasks(tasks)
  }, [tasks])

  // Set up Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socketService || !isConnected) return

    const handleTaskCreated = (data) => {
      console.log('Real-time task created:', data.task)
      setBoardTasks(prevTasks => {
        // Check if task already exists to avoid duplicates
        const taskExists = prevTasks.some(task => task._id === data.task._id)
        if (taskExists) return prevTasks
        
        return [...prevTasks, data.task]
      })
    }

    const handleTaskUpdated = (data) => {
      console.log('Real-time task updated:', data.task)
      setBoardTasks(prevTasks => 
        prevTasks.map(task => 
          task._id === data.task._id ? data.task : task
        )
      )
    }

    const handleTaskDeleted = (data) => {
      console.log('Real-time task deleted:', data.taskId)
      setBoardTasks(prevTasks => 
        prevTasks.filter(task => task._id !== data.taskId)
      )
    }

    const handleTaskStatusUpdated = (data) => {
      console.log('Real-time task status updated:', data.task)
      setBoardTasks(prevTasks => 
        prevTasks.map(task => 
          task._id === data.task._id ? data.task : task
        )
      )
    }

    // Set up event listeners
    socketService.onTaskCreated(handleTaskCreated)
    socketService.onTaskUpdated(handleTaskUpdated)
    socketService.onTaskDeleted(handleTaskDeleted)
    socketService.onTaskStatusUpdated(handleTaskStatusUpdated)

    // Cleanup event listeners on unmount
    return () => {
      socketService.offTaskCreated(handleTaskCreated)
      socketService.offTaskUpdated(handleTaskUpdated)
      socketService.offTaskDeleted(handleTaskDeleted)
      socketService.offTaskStatusUpdated(handleTaskStatusUpdated)
    }
  }, [socketService, isConnected])

  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo' },
    { id: 'inprogress', title: 'In Progress', status: 'inprogress' },
    { id: 'done', title: 'Done', status: 'done' }
  ]

  const handleAddTask = (status) => {
    onTaskAdd(status)
  }

  if (loading) {
    return (
      <div className={styles.taskBoard}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your tasks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.taskBoard}>
        <div className={styles.error}>
          <h3>Unable to load tasks</h3>
          <p>{error}</p>
          <button 
            className={styles.retryBtn}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.taskBoard}>
        <div className={styles.boardHeader}>
          <h1 className={styles.boardTitle}>My Task Board</h1>
          <div className={styles.boardStats}>
            <span className={styles.totalTasks}>
              Total Tasks: {boardTasks.length}
            </span>
          </div>
        </div>
        
        <div className={styles.columnsContainer}>
          {columns.map(column => (
            <TaskColumn
              key={column.id}
              title={column.title}
              status={column.status}
              tasks={boardTasks}
              onTaskEdit={onTaskEdit}
              onTaskDelete={onTaskDelete}
              onAddTask={handleAddTask}
              onTaskDrop={onTaskDrop}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  )
})

export default TaskBoard