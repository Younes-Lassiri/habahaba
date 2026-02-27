import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useFilterStore = create(
  persist(
    (set, get) => ({
      presets: {},
      currentFilters: {},
      
      savePreset: (entity, name, filters) => {
        const presets = get().presets
        const entityPresets = presets[entity] || []
        const updated = {
          ...presets,
          [entity]: [
            ...entityPresets.filter((p) => p.name !== name),
            { name, filters, createdAt: new Date().toISOString() },
          ],
        }
        set({ presets: updated })
      },

      loadPreset: (entity, name) => {
        const presets = get().presets
        const entityPresets = presets[entity] || []
        const preset = entityPresets.find((p) => p.name === name)
        return preset ? preset.filters : []
      },

      deletePreset: (entity, name) => {
        const presets = get().presets
        const entityPresets = presets[entity] || []
        const updated = {
          ...presets,
          [entity]: entityPresets.filter((p) => p.name !== name),
        }
        set({ presets: updated })
      },

      getPresets: (entity) => {
        const presets = get().presets
        return presets[entity] || []
      },

      setCurrentFilters: (entity, filters) => {
        const currentFilters = get().currentFilters
        set({
          currentFilters: {
            ...currentFilters,
            [entity]: filters,
          },
        })
      },

      getCurrentFilters: (entity) => {
        const currentFilters = get().currentFilters
        return currentFilters[entity] || []
      },

      clearFilters: (entity) => {
        const currentFilters = get().currentFilters
        const updated = { ...currentFilters }
        delete updated[entity]
        set({ currentFilters: updated })
      },
    }),
    {
      name: 'filter-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)



