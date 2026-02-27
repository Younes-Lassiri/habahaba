import { useState, useEffect } from 'react'
import { Bell, Check, X, Filter } from 'lucide-react'
import { useRealtime } from '../hooks/useRealtime'
import api from '../api/axios'
import Button from './Button'
import Modal from './Modal'
import Select from './Select'

export default function NotificationCenter({ className = '' }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('all') // all, unread, orders, system

  useEffect(() => {
    fetchNotifications()
  }, [])

  useRealtime('notification', (data) => {
    setNotifications((prev) => [data, ...prev])
    setUnreadCount((prev) => prev + 1)
  })

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications')
      setNotifications(response.data.notifications || [])
      setUnreadCount(response.data.unread_count || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (!notifications.find((n) => n.id === id)?.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    if (filter === 'orders') return n.category === 'order'
    if (filter === 'system') return n.category === 'system'
    return true
  })

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-2 rounded-lg hover:bg-gray-100 ${className}`}
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Notifications" size="md">
        <div className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex items-center justify-between border-b pb-3">
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'unread', label: 'Unread' },
                { value: 'orders', label: 'Orders' },
                { value: 'system', label: 'System' },
              ]}
              className="w-40"
            />
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm">
                <Check className="w-4 h-4 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No notifications</p>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.read
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}



