import { Plus, FileText, Download, Upload, Settings, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../Button'

const quickActions = [
  { id: 'new-order', label: 'New Order', icon: Plus, path: '/orders', variant: 'primary' },
  { id: 'new-product', label: 'Add Product', icon: Plus, path: '/products', variant: 'primary' },
  { id: 'export', label: 'Export Data', icon: Download, path: '/reports', variant: 'outline' },
  { id: 'import', label: 'Import Data', icon: Upload, path: '/import', variant: 'outline' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', variant: 'outline' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', variant: 'outline' },
]

export default function QuickActions({ customActions = [], className = '' }) {
  const navigate = useNavigate()
  const actions = [...quickActions, ...customActions]

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 ${className}`}>
      <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.id}
              onClick={() => action.onClick ? action.onClick() : navigate(action.path)}
              variant={action.variant || 'outline'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              <span>{action.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}



