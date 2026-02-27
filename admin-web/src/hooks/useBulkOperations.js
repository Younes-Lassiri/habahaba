import { useState, useCallback } from 'react'

export function useBulkOperations(initialSelection = []) {
  const [selectedItems, setSelectedItems] = useState(initialSelection)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const toggleSelection = useCallback((id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  const toggleSelectAll = useCallback((allItems) => {
    if (selectedItems.length === allItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(allItems.map((item) => item.id))
    }
  }, [selectedItems.length])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  const executeBulkOperation = useCallback(
    async (operation, items, onProgress) => {
      setIsProcessing(true)
      setProgress(0)

      try {
        const total = items.length
        const results = []

        for (let i = 0; i < items.length; i++) {
          try {
            const result = await operation(items[i], i)
            results.push({ success: true, item: items[i], result })
          } catch (error) {
            results.push({ success: false, item: items[i], error })
          }

          const currentProgress = ((i + 1) / total) * 100
          setProgress(currentProgress)

          if (onProgress) {
            onProgress(i + 1, total, results)
          }
        }

        return results
      } finally {
        setIsProcessing(false)
        setProgress(0)
      }
    },
    []
  )

  return {
    selectedItems,
    setSelectedItems,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    isProcessing,
    progress,
    executeBulkOperation,
    hasSelection: selectedItems.length > 0,
    selectionCount: selectedItems.length,
  }
}



