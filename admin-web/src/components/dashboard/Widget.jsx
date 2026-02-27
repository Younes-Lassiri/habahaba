import { useState } from 'react'
import { GripVertical, X, Settings } from 'lucide-react'
import Button from '../Button'

export default function Widget({
  id,
  title,
  children,
  onRemove,
  onSettings,
  className = '',
  draggable = true,
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {draggable && (
            <div className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSettings && (
            <button
              onClick={() => onSettings(id)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(id)}
              className="p-1 hover:bg-red-50 rounded"
              title="Remove"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="widget-content">{children}</div>
    </div>
  )
}



