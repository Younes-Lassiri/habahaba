import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      preferences: {
        email: true,
        push: true,
        sms: false,
        categories: {
          orders: true,
          system: true,
          promotions: true,
        },
      },

      setNotifications: (notifications) => {
        const unreadCount = notifications.filter((n) => !n.read).length
        set({ notifications, unreadCount })
      },

      addNotification: (notification) => {
        const notifications = get().notifications
        set({
          notifications: [notification, ...notifications].slice(0, 100),
          unreadCount: get().unreadCount + 1,
        })
      },

      markAsRead: (id) => {
        const notifications = get().notifications
        const updated = notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        )
        const unreadCount = updated.filter((n) => !n.read).length
        set({ notifications: updated, unreadCount })
      },

      markAllAsRead: () => {
        const notifications = get().notifications
        const updated = notifications.map((n) => ({ ...n, read: true }))
        set({ notifications: updated, unreadCount: 0 })
      },

      removeNotification: (id) => {
        const notifications = get().notifications
        const notification = notifications.find((n) => n.id === id)
        const updated = notifications.filter((n) => n.id !== id)
        const unreadCount = notification?.read
          ? get().unreadCount
          : Math.max(0, get().unreadCount - 1)
        set({ notifications: updated, unreadCount })
      },

      updatePreferences: (preferences) => {
        set({ preferences: { ...get().preferences, ...preferences } })
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)



