import { Wifi, WifiOff } from 'lucide-react'

export default function LiveIndicator({ isConnected, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isConnected ? (
        <>
          <div className="relative">
            <Wifi className="w-4 h-4 text-green-500" />
            <div className="absolute top-0 left-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
          </div>
          <span className="text-xs text-green-600 font-medium">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">Offline</span>
        </>
      )}
    </div>
  )
}



