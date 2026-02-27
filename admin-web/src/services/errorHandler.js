/**
 * Centralized error handling service
 */

export class ErrorHandler {
  static getErrorMessage(error) {
    if (!error) return 'An unexpected error occurred'

    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return 'Network error. Please check your connection and try again.'
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }

    // API errors
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message

      switch (status) {
        case 400:
          return message || 'Invalid request. Please check your input.'
        case 401:
          return 'Your session has expired. Please log in again.'
        case 403:
          return 'You do not have permission to perform this action.'
        case 404:
          return message || 'The requested resource was not found.'
        case 422:
          return message || 'Validation error. Please check your input.'
        case 429:
          return 'Too many requests. Please try again later.'
        case 500:
          return 'Server error. Please try again later.'
        case 503:
          return 'Service unavailable. Please try again later.'
        default:
          return message || `Error ${status}. Please try again.`
      }
    }

    // Default error message
    return error.message || 'An unexpected error occurred'
  }

  static handleError(error, customHandler = null) {
    const message = this.getErrorMessage(error)

    if (customHandler) {
      customHandler(message, error)
      return
    }

    // Default: log to console (in production, this could be sent to error tracking service)
    console.error('Error:', error)
    console.error('User-friendly message:', message)

    return message
  }

  static isNetworkError(error) {
    return (
      error.code === 'NETWORK_ERROR' ||
      error.message === 'Network Error' ||
      !error.response
    )
  }

  static isAuthError(error) {
    return error.response?.status === 401 || error.response?.status === 403
  }

  static isValidationError(error) {
    return error.response?.status === 422 || error.response?.status === 400
  }
}

export default ErrorHandler



