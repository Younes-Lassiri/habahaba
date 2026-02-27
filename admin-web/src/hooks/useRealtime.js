import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import realtimeService from '../services/realtime'

export function useRealtime(event, callback) {
  const [isConnected, setIsConnected] = useState(false)
  const { token } = useAuthStore()

  useEffect(() => {
    if (!token) {
      return
    }

    // Connect if not already connected
    if (!realtimeService.isConnected) {
      realtimeService.connect(token)
    }

    // Listen for connection status
    const unsubscribeConnect = realtimeService.on('realtime:connected', () => {
      setIsConnected(true)
    })

    const unsubscribeDisconnect = realtimeService.on('realtime:disconnected', () => {
      setIsConnected(false)
    })

    // Subscribe to specific event
    let unsubscribeEvent = null
    if (event && callback) {
      unsubscribeEvent = realtimeService.on(event, callback)
    }

    return () => {
      unsubscribeConnect?.()
      unsubscribeDisconnect?.()
      unsubscribeEvent?.()
    }
  }, [token, event, callback])

  const send = useCallback((event, data) => {
    if (realtimeService.socket) {
      realtimeService.socket.emit(event, data)
    }
  }, [])

  return {
    isConnected,
    send,
  }
}



