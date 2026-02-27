import { ShoppingCart, Clock } from 'lucide-react'
import { formatDateTime } from '../utils/date'

export default function ClientActivityLog({ activity }) {
  if (!activity || activity.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No activity recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activity.map((item, index) => (
        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            {item.type === 'order' ? (
              <ShoppingCart className="w-4 h-4 text-primary-600" />
            ) : (
              <Clock className="w-4 h-4 text-primary-600" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800">{item.action}</p>
            {item.details && (
              <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-2">
                {item.details.amount && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    Amount: {parseFloat(item.details.amount).toFixed(2)} MAD
                  </span>
                )}
                {item.details.status && (
                  <span className={`px-2 py-1 rounded ${
                    item.details.status === 'Delivered' ? 'bg-green-50 text-green-700' :
                    item.details.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    {item.details.status}
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formatDateTime(item.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

