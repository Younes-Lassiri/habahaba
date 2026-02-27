import { useState } from 'react'
import { Save, Trash2, Filter } from 'lucide-react'
import { useFilterStore } from '../store/filterStore'
import Button from './Button'
import Input from './Input'
import Modal from './Modal'

export default function FilterPresets({ entity, onLoadPreset }) {
  const { getPresets, savePreset, deletePreset } = useFilterStore()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [currentFilters, setCurrentFilters] = useState([])

  const presets = getPresets(entity)

  const handleSave = () => {
    if (presetName && currentFilters.length > 0) {
      savePreset(entity, presetName, currentFilters)
      setPresetName('')
      setShowSaveModal(false)
    }
  }

  const handleDelete = (name) => {
    if (confirm(`Delete preset "${name}"?`)) {
      deletePreset(entity, name)
    }
  }

  const handleLoad = (preset) => {
    if (onLoadPreset) {
      onLoadPreset(preset.filters)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Saved Filters
        </h3>
        <Button
          onClick={() => setShowSaveModal(true)}
          variant="outline"
          size="sm"
          disabled={currentFilters.length === 0}
        >
          <Save className="w-4 h-4 mr-1" />
          Save Current
        </Button>
      </div>

      {presets.length === 0 ? (
        <p className="text-sm text-gray-500">No saved filters</p>
      ) : (
        <div className="space-y-1">
          {presets.map((preset, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
            >
              <button
                onClick={() => handleLoad(preset)}
                className="flex-1 text-left text-sm text-gray-700 hover:text-primary-600"
              >
                {preset.name}
              </button>
              <button
                onClick={() => handleDelete(preset.name)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Filter Preset"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Enter preset name"
            required
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} variant="primary" className="flex-1" disabled={!presetName}>
              Save
            </Button>
            <Button
              onClick={() => setShowSaveModal(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}



