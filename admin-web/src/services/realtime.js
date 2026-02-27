import { io } from 'socket.io-client'
import { BACKEND_BASE_URL } from '../config/api.js'

class RealtimeService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
    this.isConnected = false
  }

  connect(token) {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(BACKEND_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    this.socket.on('connect', () => {
      this.isConnected = true
      console.log('Realtime connected')
      this.emit('realtime:connected')
    })

    this.socket.on('disconnect', () => {
      this.isConnected = false
      console.log('Realtime disconnected')
      this.emit('realtime:disconnected')
    })

    this.socket.on('error', (error) => {
      console.error('Realtime error:', error)
      this.emit('realtime:error', error)
    })

    // Listen for various events
    this.socket.on('order:updated', (data) => {
      this.emit('order:updated', data)
    })

    this.socket.on('order:created', (data) => {
      this.emit('order:created', data)
    })

    this.socket.on('delivery:location', (data) => {
      this.emit('delivery:location', data)
    })

    this.socket.on('dashboard:stats', (data) => {
      this.emit('dashboard:stats', data)
    })

    this.socket.on('notification', (data) => {
      this.emit('notification', data)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error)
        }
      })
    }
  }

  subscribe(channel, callback) {
    if (this.socket) {
      this.socket.emit('subscribe', channel)
      return this.on(channel, callback)
    }
  }

  unsubscribe(channel) {
    if (this.socket) {
      this.socket.emit('unsubscribe', channel)
    }
  }
}

export default new RealtimeService()

