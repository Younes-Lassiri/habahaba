/**
 * Data formatting utilities
 */

export const formatCurrency = (amount, currency = 'MAD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatNumber = (number, decimals = 2, locale = 'en-US') => {
  if (number === null || number === undefined || isNaN(number)) return '0'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number)
}

export const formatDate = (date, format = 'short', locale = 'en-US') => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const options = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
    date: { year: 'numeric', month: '2-digit', day: '2-digit' },
  }

  return new Intl.DateTimeFormat(locale, options[format] || options.short).format(d)
}

export const formatRelativeTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const now = new Date()
  const diffInSeconds = Math.floor((now - d) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`

  return formatDate(d, 'short')
}

export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0s'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '0 B'
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export const formatPhoneNumber = (phone, countryCode = '+212') => {
  if (!phone) return ''
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')
  
  // Format Moroccan phone numbers
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${countryCode} ${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  
  return phone
}

export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0%'
  return `${parseFloat(value).toFixed(decimals)}%`
}

export const formatTruncate = (text, maxLength = 50, suffix = '...') => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength - suffix.length) + suffix
}

export const formatInitials = (name) => {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export const formatSlug = (text) => {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const formatOrderNumber = (id, prefix = 'ORD') => {
  if (!id) return ''
  return `${prefix}-${String(id).padStart(6, '0')}`
}

export const formatStatus = (status) => {
  if (!status) return ''
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export const formatAddress = (address) => {
  if (!address || typeof address !== 'object') return ''
  const parts = []
  if (address.street) parts.push(address.street)
  if (address.city) parts.push(address.city)
  if (address.state) parts.push(address.state)
  if (address.zip) parts.push(address.zip)
  if (address.country) parts.push(address.country)
  return parts.join(', ')
}

export const formatFullName = (firstName, lastName) => {
  const parts = [firstName, lastName].filter(Boolean)
  return parts.join(' ') || ''
}

export const formatArray = (array, separator = ', ', maxItems = null) => {
  if (!Array.isArray(array) || array.length === 0) return ''
  const items = maxItems ? array.slice(0, maxItems) : array
  const result = items.join(separator)
  return maxItems && array.length > maxItems ? `${result} (+${array.length - maxItems} more)` : result
}

export const formatJSON = (obj, indent = 2) => {
  try {
    return JSON.stringify(obj, null, indent)
  } catch {
    return String(obj)
  }
}

export const formatBytes = (bytes, decimals = 2) => {
  return formatFileSize(bytes)
}

export const formatTimeAgo = (date) => {
  return formatRelativeTime(date)
}



