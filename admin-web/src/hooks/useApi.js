import { useState, useCallback } from 'react'
import api from '../api/axios'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const request = useCallback(async (apiCall, onSuccess, onError) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiCall()
      if (onSuccess) {
        onSuccess(response.data)
      }
      return response.data
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || 'An error occurred'
      setError(errorMessage)
      if (onError) {
        onError(err, errorMessage)
      }
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const get = useCallback(
    (url, config = {}) => {
      return request(() => api.get(url, config))
    },
    [request]
  )

  const post = useCallback(
    (url, data, config = {}) => {
      return request(() => api.post(url, data, config))
    },
    [request]
  )

  const put = useCallback(
    (url, data, config = {}) => {
      return request(() => api.put(url, data, config))
    },
    [request]
  )

  const del = useCallback(
    (url, config = {}) => {
      return request(() => api.delete(url, config))
    },
    [request]
  )

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    delete: del,
    clearError: () => setError(null),
  }
}



