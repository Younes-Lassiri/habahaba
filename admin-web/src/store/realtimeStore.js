import { create } from 'zustand'

export const useRealtimeStore = create((set, get) => ({
  isConnected: false,
  lastUpdate: null,
  orderUpdates: [],
  deliveryUpdates: [],
  dashboardStats: null,

  setConnected: (connected) => {
    set({ isConnected: connected })
  },

  addOrderUpdate: (update) => {
    const updates = get().orderUpdates
    set({
      orderUpdates: [update, ...updates].slice(0, 50), // Keep last 50
      lastUpdate: new Date(),
    })
  },

  addDeliveryUpdate: (update) => {
    const updates = get().deliveryUpdates
    set({
      deliveryUpdates: [update, ...updates].slice(0, 50),
      lastUpdate: new Date(),
    })
  },

  updateDashboardStats: (stats) => {
    set({
      dashboardStats: stats,
      lastUpdate: new Date(),
    })
  },

  clearUpdates: () => {
    set({
      orderUpdates: [],
      deliveryUpdates: [],
    })
  },
}))



