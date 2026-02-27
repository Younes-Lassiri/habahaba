import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useRealtime } from '../hooks/useRealtime'
import { useRealtimeStore } from '../store/realtimeStore'
import Toast from './Toast'

export default function RealtimeNotifications() {
  const [notifications, setNotifications] = useState([])
  const { isConnected } = useRealtime('realtime:connected')
  const { addOrderUpdate } = useRealtimeStore()

  useRealtime('order:updated', (data) => {
    setNotifications((prev) => [
      {
        id: Date.now(),
        type: 'order',
        message: `Order #${data.order_number} status updated to ${data.status}`,
        data,
        timestamp: new Date(),
      },
      ...prev,
    ].slice(0, 10))
    addOrderUpdate(data)
  })

  useRealtime('order:created', (data) => {
    setNotifications((prev) => [
      {
        id: Date.now(),
        type: 'order',
        message: `New order #${data.order_number} received`,
        data,
        timestamp: new Date(),
      },
      ...prev,
    ].slice(0, 10))
  })

  useRealtime('notification', (data) => {
    setNotifications((prev) => [
      {
        id: Date.now(),
        type: 'system',
        message: data.message || 'New notification',
        data,
        timestamp: new Date(),
      },
      ...prev,
    ].slice(0, 10))
  })

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  if (!isConnected || notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex items-start gap-3 animate-slide-in"
        >
          <Bell className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">{notification.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {notification.timestamp.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}



