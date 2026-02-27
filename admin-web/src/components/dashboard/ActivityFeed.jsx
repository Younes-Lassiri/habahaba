import { Activity, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '../../api/axios'

export default function ActivityFeed({ limit = 10, className = '' }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivities()
  }, [])

  const fetchRecentActivities = async () => {
    try {
      const response = await api.get('/activity-logs', {
        params: { limit, page: 1 },
      })
      setActivities(response.data.activities || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (actionType) => {
    switch (actionType?.toLowerCase()) {
      case 'create':
        return '➕'
      case 'update':
        return '✏️'
      case 'delete':
        return '🗑️'
      default:
        return '📝'
    }
  }

  const getActionColor = (actionType) => {
    switch (actionType?.toLowerCase()) {
      case 'create':
        return 'text-green-600'
      case 'update':
        return 'text-blue-600'
      case 'delete':
        return 'text-red-600'
      default:
        return 'text-gray-600'
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

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-800">Recent Activity</h3>
      </div>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
        ) : (
          activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
              <div className={`text-lg ${getActionColor(activity.action_type)}`}>
                {getActionIcon(activity.action_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">
                  <span className="font-medium">{activity.user_name || 'System'}</span>{' '}
                  <span className="lowercase">{activity.action_type}</span> {activity.entity_type}
                  {activity.entity_id && ` #${activity.entity_id}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}



