import { useState, useCallback, useMemo } from 'react'
import { DEFAULT_PAGE_SIZE } from '../constants'

export function usePagination(initialPage = 1, initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [total, setTotal] = useState(0)

  const totalPages = useMemo(() => {
    return Math.ceil(total / pageSize)
  }, [total, pageSize])

  const goToPage = useCallback((newPage) => {
    setPage(newPage)
  }, [])

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage((prev) => prev + 1)
    }
  }, [page, totalPages])

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage((prev) => prev - 1)
    }
  }, [page])

  const reset = useCallback(() => {
    setPage(initialPage)
    setPageSize(initialPageSize)
    setTotal(0)
  }, [initialPage, initialPageSize])

  const updateTotal = useCallback((newTotal) => {
    setTotal(newTotal)
  }, [])

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      total,
      pages: totalPages,
    }),
    [page, pageSize, total, totalPages]
  )

  return {
    page,
    pageSize,
    total,
    totalPages,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    updateTotal,
    reset,
  }
}



