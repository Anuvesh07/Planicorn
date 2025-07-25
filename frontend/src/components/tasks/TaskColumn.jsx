import React, { memo } from 'react'
import { useDrop } from 'react-dnd'
import TaskCard from './TaskCard'
import styles from './TaskColumn.module.css'

const TaskColumn = memo(({ 
  title, 
  status, 
  tasks, 
  onTaskEdit, 
  onTaskDelete,
  onAddTask,
  onTaskDrop
}) => {
  const filteredTasks = tasks.filter(task => task.status === status)

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'TASK',
    drop: (item) => {
      if (item.status !== status && onTaskDrop) {
        onTaskDrop(item.id, status)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const handleAddTask = () => {
    onAddTask(status)
  }

  const getColumnIcon = (status) => {
    switch (status) {
      case 'todo':
        return '📋'
      case 'inprogress':
        return '⚡'
      case 'done':
        return '✅'
      default:
        return '📋'
    }
  }

  const dropZoneClass = `${styles.taskColumn} ${
    isOver && canDrop ? styles.dropActive : ''
  } ${canDrop ? styles.canDrop : ''}`

  return (
    <div ref={drop} className={dropZoneClass}>
      <div className={styles.columnHeader}>
        <div className={styles.columnTitle}>
          <span className={styles.columnIcon}>
            {getColumnIcon(status)}
          </span>
          <h2>{title}</h2>
          <span className={styles.taskCount}>
            {filteredTasks.length}
          </span>
        </div>
        <button 
          className={styles.addTaskBtn}
          onClick={handleAddTask}
          aria-label={`Add task to ${title}`}
        >
          +
        </button>
      </div>
      
      <div className={styles.taskList}>
        {filteredTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No tasks yet</p>
            <button 
              className={styles.emptyAddBtn}
              onClick={handleAddTask}
            >
              Add your first task
            </button>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
            />
          ))
        )}
      </div>
      
      {isOver && canDrop && (
        <div className={styles.dropIndicator}>
          Drop task here
        </div>
      )}
    </div>
  )
})

export default TaskColumn