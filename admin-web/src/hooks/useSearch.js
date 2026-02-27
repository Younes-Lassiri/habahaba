import { useState, useCallback, useEffect } from 'react'

export function useSearch(initialQuery = '', options = {}) {
  const {
    debounceMs = 300,
    minLength = 0,
    onSearch,
    searchHistoryKey = null,
  } = options

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])

  // Load search history from localStorage
  useEffect(() => {
    if (searchHistoryKey) {
      const stored = localStorage.getItem(`search-history-${searchHistoryKey}`)
      if (stored) {
        try {
          setSearchHistory(JSON.parse(stored))
        } catch (e) {
          console.error('Error loading search history:', e)
        }
      }
    }
  }, [searchHistoryKey])

  // Save search to history
  const saveToHistory = useCallback(
    (searchTerm) => {
      if (!searchHistoryKey || !searchTerm || searchTerm.length < minLength) {
        return
      }

      setSearchHistory((prev) => {
        const updated = [searchTerm, ...prev.filter((item) => item !== searchTerm)].slice(0, 10)
        localStorage.setItem(`search-history-${searchHistoryKey}`, JSON.stringify(updated))
        return updated
      })
    },
    [searchHistoryKey, minLength]
  )

  // Debounced search
  useEffect(() => {
    if (query.length < minLength) {
      setResults([])
      return
    }

    const timer = setTimeout(() => {
      if (onSearch) {
        setIsSearching(true)
        onSearch(query)
          .then((data) => {
            setResults(data || [])
            saveToHistory(query)
          })
          .catch((error) => {
            console.error('Search error:', error)
            setResults([])
          })
          .finally(() => {
            setIsSearching(false)
          })
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs, minLength, onSearch, saveToHistory])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  const clearHistory = useCallback(() => {
    if (searchHistoryKey) {
      localStorage.removeItem(`search-history-${searchHistoryKey}`)
      setSearchHistory([])
    }
  }, [searchHistoryKey])

  return {
    query,
    setQuery,
    results,
    isSearching,
    searchHistory,
    clearSearch,
    clearHistory,
  }
}



