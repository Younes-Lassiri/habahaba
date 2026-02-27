import { useState } from 'react'
import api from '../api/axios'
import { Send, Users, Truck, FileText, Clock, History } from 'lucide-react'
import NotificationTemplates from '../components/NotificationTemplates'
import NotificationScheduler from '../components/NotificationScheduler'
import NotificationHistory from '../components/NotificationHistory'
import { useModal } from '../hooks/useModal'
import Button from '../components/Button'
import Toast from '../components/Toast'

export default function Notifications() {
  const [target, setTarget] = useState('clients') // 'clients' or 'delivery_men'
  const [userId, setUserId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('send') // 'send', 'templates', 'schedule', 'history'
  const [templates, setTemplates] = useState([])
  const { isOpen: showScheduler, open: openScheduler, close: closeScheduler } = useModal()
  const [toast, setToast] = useState(null)

  const handleSendToAll = async (e) => {
  e.preventDefault()
  
  // Validation
  if (!title.trim() || !body.trim()) {
    setMessage('❌ Title and message are required')
    return
  }
  
  setLoading(true)
  setMessage('')

  try {
    // Determine the endpoint based on target
    const endpoint = target === 'clients' 
      ? '/notifications/send-to-all-clients' 
      : '/notifications/send-to-all-delivery-men'
    
    const response = await api.post(endpoint, {
      title,
      message: body
    })
    
    if (response.data.success) {
      const sentCount = response.data.sent || response.data.totalSent || 0
      const totalCount = response.data.total || sentCount
      
      setMessage(
        `✅ Notifications sent successfully to ${sentCount} ${target.replace('_', ' ')}!`
      )
      setTitle('')
      setBody('')
      
      // Show toast notification
      setToast({ 
        message: `Sent to ${sentCount} ${target.replace('_', ' ')}`, 
        type: 'success' 
      })
    } else {
      setMessage(`❌ ${response.data.message || 'Failed to send notifications'}`)
      setToast({ 
        message: response.data.message || 'Failed to send', 
        type: 'error' 
      })
    }
  } catch (error) {
    console.error('Error sending notifications:', error)
    setMessage('❌ Failed to send notifications. Please try again.')
    setToast({ 
      message: 'Failed to send notifications', 
      type: 'error' 
    })
  } finally {
    setLoading(false)
  }
  }

  const handleSendToUser = async (e) => {
    e.preventDefault()
    if (!userId) {
      setMessage('❌ Please enter a user ID')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await api.post('/notifications/send-to-user', {
        userId: parseInt(userId),
        target: target === 'clients' ? 'client' : 'delivery_man',
        title,
        body,
        type: 'admin_notification',
      })
      setMessage(response.data.success ? '✅ Notification sent successfully!' : '❌ Failed to send notification')
      setTitle('')
      setBody('')
      setUserId('')
    } catch (error) {
      console.error('Error sending notification:', error)
      setMessage('❌ Failed to send notification')
    } finally {
      setLoading(false)
    }
  }

  const handleSchedule = async (scheduleData) => {
    try {
      await api.post('/notifications/schedule', scheduleData)
      setToast({ message: 'Notification scheduled successfully', type: 'success' })
      closeScheduler()
    } catch (error) {
      console.error('Error scheduling notification:', error)
      setToast({ message: 'Failed to schedule notification', type: 'error' })
    }
  }

  const tabs = [
    { id: 'send', label: 'Send Notifications', icon: Send },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'history', label: 'History', icon: History },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-600 mt-1">Send push notifications to users</p>
        </div>
        {activeTab === 'send' && (
          <Button onClick={openScheduler} variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            Schedule Notification
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' && (
        <NotificationTemplates />
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <NotificationScheduler onSchedule={handleSchedule} templates={templates} />
        </div>
      )}

      {activeTab === 'history' && (
        <NotificationHistory />
      )}

      {activeTab === 'send' && (
        <div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send to All */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-800">Send to All</h2>
          </div>

          <form onSubmit={handleSendToAll} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Target Audience</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setTarget('clients')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    target === 'clients'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  All Clients
                </button>
                <button
                  type="button"
                  onClick={() => setTarget('delivery_men')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    target === 'delivery_men'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Truck className="w-5 h-5" />
                  All Delivery Men
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Notification title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message *</label>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="4"
                placeholder="Notification message"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send to All'}
            </button>
          </form>
        </div>

        {/* Send to Single User */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-800">Send to Single User</h2>
          </div>

          <form onSubmit={handleSendToUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">User Type</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setTarget('clients')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    target === 'clients'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Client
                </button>
                <button
                  type="button"
                  onClick={() => setTarget('delivery_men')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    target === 'delivery_men'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Truck className="w-5 h-5" />
                  Delivery Man
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">User ID *</label>
              <input
                type="number"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter user ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Notification title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message *</label>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="4"
                placeholder="Notification message"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </div>
      </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.startsWith('✅')
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      )}

      {/* Scheduler Modal */}
      {showScheduler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Schedule Notification</h2>
            <NotificationScheduler onSchedule={handleSchedule} templates={templates} />
            <Button onClick={closeScheduler} variant="outline" className="w-full mt-4">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

