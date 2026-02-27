import { useState, useRef, useEffect } from 'react'
import { Search, X, Clock, Filter } from 'lucide-react'
import Input from './Input'

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  showHistory = false,
  searchHistory = [],
  onHistorySelect,
  className = '',
  showAdvanced = false,
  onAdvancedClick,
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowHistoryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFocus = () => {
    setIsFocused(true)
    if (showHistory && searchHistory.length > 0) {
      setShowHistoryDropdown(true)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Delay to allow history item click
    setTimeout(() => setShowHistoryDropdown(false), 200)
  }

  const handleHistorySelect = (item) => {
    if (onHistorySelect) {
      onHistorySelect(item)
    }
    setShowHistoryDropdown(false)
    inputRef.current?.blur()
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            isFocused ? 'border-primary-500' : ''
          }`}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              onClick={() => {
                onChange('')
                if (onClear) onClear()
              }}
              className="p-1 hover:bg-gray-100 rounded"
              type="button"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {showAdvanced && (
            <button
              onClick={onAdvancedClick}
              className="p-1 hover:bg-gray-100 rounded"
              type="button"
              title="Advanced Filters"
            >
              <Filter className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search History Dropdown */}
      {showHistoryDropdown && searchHistory.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Recent Searches</span>
            </div>
          </div>
          {searchHistory.map((item, index) => (
            <button
              key={index}
              onClick={() => handleHistorySelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm">{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}



