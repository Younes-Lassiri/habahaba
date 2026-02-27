import { Clock, User, FileText } from 'lucide-react'
import { formatDateTime } from '../utils/date'

export default function OrderHistoryTimeline({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No history available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              {item.action.includes('Note') ? (
                <FileText className="w-5 h-5 text-primary-600" />
              ) : (
                <Clock className="w-5 h-5 text-primary-600" />
              )}
            </div>
            {index < history.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-gray-800">{item.action}</p>
              <span className="text-xs text-gray-500">
                by {item.user}
              </span>
            </div>
            {item.note && (
              <p className="text-sm text-gray-600 mb-2">{item.note}</p>
            )}
            <p className="text-xs text-gray-500">
              {formatDateTime(item.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

