import { Package, Inbox, Search } from 'lucide-react'

const iconMap = {
  default: Package,
  empty: Inbox,
  search: Search,
}

export default function EmptyState({
  icon = 'default',
  title = 'No data available',
  description = 'There is no data to display at this time.',
  action,
  className = '',
}) {
  const Icon = iconMap[icon] || iconMap.default

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-gray-100 rounded-full">
          <Icon className="w-12 h-12 text-gray-400" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}



