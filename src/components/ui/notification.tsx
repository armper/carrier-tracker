'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000
    }
    
    setNotifications(prev => [...prev, newNotification])

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const contextValue = {
    addNotification,
    removeNotification
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {mounted && createPortal(
        <NotificationContainer 
          notifications={notifications} 
          onRemove={removeNotification} 
        />,
        document.body
      )}
    </NotificationContext.Provider>
  )
}

function NotificationContainer({ 
  notifications, 
  onRemove 
}: { 
  notifications: Notification[]
  onRemove: (id: string) => void 
}) {
  return (
    <div
      className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 space-y-3"
      role="region"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

function NotificationToast({ 
  notification, 
  onRemove 
}: { 
  notification: Notification
  onRemove: (id: string) => void 
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(notification.id), 300)
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getColorClasses = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-300 bg-green-50'
      case 'error':
        return 'border-red-300 bg-red-50'
      case 'warning':
        return 'border-amber-300 bg-amber-50'
      case 'info':
        return 'border-blue-300 bg-blue-50'
    }
  }

  return (
    <div
      className={`
        w-full bg-white shadow-xl rounded-xl border-2 pointer-events-auto transition-all duration-300 ease-in-out transform
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        ${getColorClasses()}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 flex items-center justify-center">
              {getIcon()}
            </div>
          </div>
          <div className="ml-4 w-0 flex-1">
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              {notification.title}
            </p>
            {notification.message && (
              <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
                {notification.message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-full inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1.5 transition-colors"
              onClick={handleRemove}
              aria-label="Dismiss notification"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}