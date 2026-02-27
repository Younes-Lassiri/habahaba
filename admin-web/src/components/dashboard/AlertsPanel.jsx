import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../../api/axios'

export default function AlertsPanel({ className = '' }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      // This would typically come from an alerts endpoint
      // For now, we'll create mock alerts based on dashboard data
      const response = await api.get('/dashboard/stats')
      const stats = response.data.stats

      const mockAlerts = []
      
      if (stats?.pendingOrders > 10) {
        mockAlerts.push({
          id: 1,
          type: 'warning',
          title: 'High Pending Orders',
          message: `${stats.pendingOrders} orders are pending`,
          timestamp: new Date(),
        })
      }

      if (stats?.deliveryMen < 3) {
        mockAlerts.push({
          id: 2,
          type: 'info',
          title: 'Low Delivery Staff',
          message: 'Only a few delivery men are active',
          timestamp: new Date(),
        })
      }

      setAlerts(mockAlerts)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return XCircle
      case 'warning':
        return AlertTriangle
      case 'success':
        return CheckCircle
      default:
        return Info
    }
  }

  const getAlertColors = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Alerts</h3>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">No alerts at this time</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-800">Alerts & Warnings</h3>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const Icon = getAlertIcon(alert.type)
          return (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getAlertColors(alert.type)}`}
            >
              <div className="flex items-start gap-2">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs mt-1 opacity-90">{alert.message}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}



