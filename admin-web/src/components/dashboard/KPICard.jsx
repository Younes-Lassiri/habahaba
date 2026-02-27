import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

export default function KPICard({
  title,
  value,
  change,
  changeType = 'neutral', // 'positive', 'negative', 'neutral'
  icon: Icon,
  trend,
  subtitle,
  className = '',
}) {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  }

  const changeBgColors = {
    positive: 'bg-green-50',
    negative: 'bg-red-50',
    neutral: 'bg-gray-50',
  }

  const ChangeIcon = changeType === 'positive' ? ArrowUp : changeType === 'negative' ? ArrowDown : Minus

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mb-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {change !== undefined && change !== null && (
            <div className={`flex items-center gap-1 mt-3 ${changeColors[changeType]}`}>
              <ChangeIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">{change}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-primary-50 rounded-lg">
            <Icon className="w-6 h-6 text-primary-600" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">{trend.label}</div>
          <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${changeType === 'positive' ? 'bg-green-500' : changeType === 'negative' ? 'bg-red-500' : 'bg-gray-400'}`}
              style={{ width: `${Math.min(100, Math.max(0, trend.percentage))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}



