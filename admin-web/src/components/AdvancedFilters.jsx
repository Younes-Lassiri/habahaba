import { useState } from 'react'
import { Filter, X, Plus, Save } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import Input from './Input'
import Select from './Select'
import DateRangePicker from './DateRangePicker'

export default function AdvancedFilters({
  isOpen,
  onClose,
  filters = [],
  onApply,
  onSavePreset,
  savedPresets = [],
  onLoadPreset,
}) {
  const [activeFilters, setActiveFilters] = useState(filters)
  const [presetName, setPresetName] = useState('')

  const filterTypes = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
    { value: 'between', label: 'Between' },
    { value: 'in', label: 'In (Multiple Values)' },
  ]

  const addFilter = () => {
    setActiveFilters([
      ...activeFilters,
      {
        field: '',
        operator: 'equals',
        value: '',
        logic: 'AND',
      },
    ])
  }

  const removeFilter = (index) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== index))
  }

  const updateFilter = (index, field, value) => {
    const updated = [...activeFilters]
    updated[index] = { ...updated[index], [field]: value }
    setActiveFilters(updated)
  }

  const handleApply = () => {
    if (onApply) {
      onApply(activeFilters)
    }
    onClose()
  }

  const handleSavePreset = () => {
    if (presetName && onSavePreset) {
      onSavePreset(presetName, activeFilters)
      setPresetName('')
    }
  }

  const handleLoadPreset = (preset) => {
    if (onLoadPreset) {
      const loadedFilters = onLoadPreset(preset)
      setActiveFilters(loadedFilters)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Advanced Filters" size="lg">
      <div className="space-y-4">
        {/* Saved Presets */}
        {savedPresets.length > 0 && (
          <div className="border-b pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Saved Filter Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {savedPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleLoadPreset(preset)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters */}
        <div className="space-y-3">
          {activeFilters.map((filter, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              {index > 0 && (
                <Select
                  value={filter.logic || 'AND'}
                  onChange={(e) => updateFilter(index, 'logic', e.target.value)}
                  options={[
                    { value: 'AND', label: 'AND' },
                    { value: 'OR', label: 'OR' },
                  ]}
                  className="w-20"
                />
              )}
              <Select
                value={filter.field}
                onChange={(e) => updateFilter(index, 'field', e.target.value)}
                placeholder="Field"
                options={[]}
                className="flex-1"
              />
              <Select
                value={filter.operator}
                onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                options={filterTypes}
                className="w-40"
              />
              <Input
                value={filter.value}
                onChange={(e) => updateFilter(index, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1"
              />
              <button
                onClick={() => removeFilter(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Filter Button */}
        <Button onClick={addFilter} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Filter
        </Button>

        {/* Save Preset */}
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              className="flex-1"
            />
            <Button onClick={handleSavePreset} variant="secondary" disabled={!presetName}>
              <Save className="w-4 h-4 mr-2" />
              Save Preset
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleApply} variant="primary" className="flex-1">
            Apply Filters
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}



