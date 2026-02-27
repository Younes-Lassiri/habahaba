export default function ProgressBar({
  progress = 0,
  total = 100,
  label,
  showPercentage = true,
  className = '',
}) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (progress / total) * 100)) : 0

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-gray-600 font-medium">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!label && showPercentage && (
        <div className="text-xs text-gray-500 text-center">
          {progress} of {total}
        </div>
      )}
    </div>
  )
}



