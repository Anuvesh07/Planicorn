import React, { memo } from 'react'
import { useDrag } from 'react-dnd'
import styles from './TaskCard.module.css'

const TaskCard = memo(({ task, onEdit, onDelete }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { id: task._id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const handleEdit = () => {
    onEdit(task)
  }

  const handleDelete = () => {
    onDelete(task._id)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div 
      ref={drag}
      className={`${styles.taskCard} ${isDragging ? styles.dragging : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className={styles.taskHeader}>
        <h3 className={styles.taskTitle}>{task.title}</h3>
        <div className={styles.taskActions}>
          <button 
            className={styles.editBtn}
            onClick={handleEdit}
            aria-label="Edit task"
          >
            ✏️
          </button>
          <button 
            className={styles.deleteBtn}
            onClick={handleDelete}
            aria-label="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {task.description && (
        <p className={styles.taskDescription}>{task.description}</p>
      )}
      
      <div className={styles.taskFooter}>
        <span className={styles.taskDate}>
          Created: {formatDate(task.createdAt)}
        </span>
        {task.completedAt && (
          <span className={styles.completedDate}>
            Completed: {formatDate(task.completedAt)}
          </span>
        )}
      </div>
    </div>
  )
})

export default TaskCard