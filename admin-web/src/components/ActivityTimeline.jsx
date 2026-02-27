import { Clock, User, FileText } from 'lucide-react'

export default function ActivityTimeline({ activities = [] }) {
  const getActionIcon = (actionType) => {
    switch (actionType?.toLowerCase()) {
      case 'create':
        return '➕'
      case 'update':
        return '✏️'
      case 'delete':
        return '🗑️'
      case 'login':
        return '🔐'
      case 'logout':
        return '🚪'
      default:
        return '📝'
    }
  }

  const getActionColor = (actionType) => {
    switch (actionType?.toLowerCase()) {
      case 'create':
        return 'bg-green-500'
      case 'update':
        return 'bg-blue-500'
      case 'delete':
        return 'bg-red-500'
      case 'login':
        return 'bg-purple-500'
      case 'logout':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No activities to display</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="relative flex gap-4">
            <div className={`relative z-10 w-8 h-8 rounded-full ${getActionColor(activity.action_type)} flex items-center justify-center text-white text-sm`}>
              {getActionIcon(activity.action_type)}
            </div>
            <div className="flex-1 pb-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      activity.action_type === 'create' ? 'bg-green-100 text-green-800' :
                      activity.action_type === 'update' ? 'bg-blue-100 text-blue-800' :
                      activity.action_type === 'delete' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.action_type}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <FileText className="w-3 h-3" />
                      <span>{activity.entity_type}</span>
                      {activity.entity_id && (
                        <span className="text-gray-400">#{activity.entity_id}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(activity.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{activity.description || 'No description'}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{activity.user_name || activity.user_email || 'System'}</span>
                </div>
                {activity.changes && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <strong>Changes:</strong> {JSON.stringify(activity.changes)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



