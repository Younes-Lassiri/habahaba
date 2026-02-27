import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      login: (admin, token) => {
        set({ admin, token, isAuthenticated: true })
      },
      logout: () => {
        set({ admin: null, token: null, isAuthenticated: false })
        // Clear localStorage
        localStorage.removeItem('admin-auth-storage')
      },
      // Check if user is authenticated based on stored token
      checkAuth: () => {
        const state = get()
        return !!(state.token && state.admin)
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Rehydrate authentication state on load
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.admin) {
          state.isAuthenticated = true
        }
      },
    }
  )
)

