import React, { useState, useEffect, useRef, memo } from 'react'
import { useDebounceCallback } from '../../hooks/useDebounce'
import styles from './TaskModal.module.css'

const TaskModal = memo(({ 
  isOpen, 
  onClose, 
  onSubmit, 
  task = null, 
  initialStatus = 'todo',
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: initialStatus
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleInputRef = useRef(null)

  const isEditing = Boolean(task)

  // Debounced validation to avoid excessive validation calls
  const debouncedValidation = useDebounceCallback(() => {
    validateForm()
  }, 300)

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          status: task.status || 'todo'
        })
      } else {
        setFormData({
          title: '',
          description: '',
          status: initialStatus
        })
      }
      setErrors({})
      
      // Focus on title input when modal opens
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus()
        }
      }, 100)
    }
  }, [isOpen, task, initialStatus])

  const validateForm = () => {
    const newErrors = {}

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long'
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title must be less than 100 characters'
    }

    // Description validation (optional but with length limit)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    // Status validation
    const validStatuses = ['todo', 'inprogress', 'done']
    if (!validStatuses.includes(formData.status)) {
      newErrors.status = 'Invalid status selected'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }

    // Trigger debounced validation for real-time feedback
    debouncedValidation()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status
      }

      await onSubmit(taskData, task?._id)
      onClose()
    } catch (error) {
      // Handle submission errors
      if (error.response?.data?.error?.details) {
        setErrors(error.response.data.error.details)
      } else {
        setErrors({
          submit: error.response?.data?.error?.message || 'Failed to save task. Please try again.'
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button 
            className={styles.closeBtn}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              Title *
            </label>
            <input
              ref={titleInputRef}
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              placeholder="Enter task title..."
              disabled={isSubmitting}
              maxLength={100}
            />
            {errors.title && (
              <span className={styles.errorMessage}>{errors.title}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
              placeholder="Enter task description..."
              disabled={isSubmitting}
              rows={4}
              maxLength={500}
            />
            {errors.description && (
              <span className={styles.errorMessage}>{errors.description}</span>
            )}
            <div className={styles.charCount}>
              {formData.description.length}/500
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="status" className={styles.label}>
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className={`${styles.select} ${errors.status ? styles.inputError : ''}`}
              disabled={isSubmitting}
            >
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
            {errors.status && (
              <span className={styles.errorMessage}>{errors.status}</span>
            )}
          </div>

          {errors.submit && (
            <div className={styles.submitError}>
              {errors.submit}
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelBtn}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Task' : 'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})

export default TaskModal