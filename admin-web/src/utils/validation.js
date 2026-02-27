/**
 * Enhanced validation utilities
 */

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePhone = (phone) => {
  const re = /^[\d\s\-\+\(\)]+$/
  return re.test(phone) && phone(/\D/g, '').length >= 10
}

export const validateURL = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const validateNumber = (value, min = null, max = null) => {
  const num = parseFloat(value)
  if (isNaN(num)) return false
  if (min !== null && num < min) return false
  if (max !== null && num > max) return false
  return true
}

export const validateRequired = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string' && value.trim() === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  return true
}

export const validateLength = (value, min = null, max = null) => {
  const length = typeof value === 'string' ? value.length : value?.length || 0
  if (min !== null && length < min) return false
  if (max !== null && length > max) return false
  return true
}

export const validateDate = (date, minDate = null, maxDate = null) => {
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  if (minDate && d < new Date(minDate)) return false
  if (maxDate && d > new Date(maxDate)) return false
  return true
}

export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return true // Let required validation handle this
  return new Date(startDate) <= new Date(endDate)
}

export const validatePassword = (password, minLength = 8) => {
  if (!password || password.length < minLength) return false
  // At least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  return hasLetter && hasNumber
}

export const validateCreditCard = (cardNumber) => {
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/\s|-/g, '')
  // Luhn algorithm
  let sum = 0
  let isEven = false
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i])
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    isEven = !isEven
  }
  return sum % 10 === 0 && cleaned.length >= 13 && cleaned.length <= 19
}

export const validateForm = (data, schema) => {
  const errors = {}
  
  Object.keys(schema).forEach((field) => {
    const rules = schema[field]
    const value = data[field]
    
    // Required validation
    if (rules.required && !validateRequired(value)) {
      errors[field] = rules.requiredMessage || `${field} is required`
      return
    }
    
    // Skip other validations if field is empty and not required
    if (!validateRequired(value)) return
    
    // Type validation
    if (rules.type) {
      if (rules.type === 'email' && !validateEmail(value)) {
        errors[field] = rules.emailMessage || 'Invalid email address'
        return
      }
      if (rules.type === 'number' && !validateNumber(value, rules.min, rules.max)) {
        errors[field] = rules.numberMessage || 'Invalid number'
        return
      }
      if (rules.type === 'url' && !validateURL(value)) {
        errors[field] = rules.urlMessage || 'Invalid URL'
        return
      }
      if (rules.type === 'phone' && !validatePhone(value)) {
        errors[field] = rules.phoneMessage || 'Invalid phone number'
        return
      }
      if (rules.type === 'date' && !validateDate(value, rules.minDate, rules.maxDate)) {
        errors[field] = rules.dateMessage || 'Invalid date'
        return
      }
      if (rules.type === 'password' && !validatePassword(value, rules.minLength)) {
        errors[field] = rules.passwordMessage || 'Password must be at least 8 characters with letters and numbers'
        return
      }
    }
    
    // Length validation
    if (rules.minLength || rules.maxLength) {
      if (!validateLength(value, rules.minLength, rules.maxLength)) {
        errors[field] = rules.lengthMessage || `Length must be between ${rules.minLength || 0} and ${rules.maxLength || '∞'}`
        return
      }
    }
    
    // Custom validation
    if (rules.validate && typeof rules.validate === 'function') {
      const customError = rules.validate(value, data)
      if (customError) {
        errors[field] = customError
        return
      }
    }
  })
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  // Remove potentially dangerous characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

export const sanitizeObject = (obj) => {
  const sanitized = {}
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key])
    } else if (Array.isArray(obj[key])) {
      sanitized[key] = obj[key].map((item) =>
        typeof item === 'string' ? sanitizeInput(item) : item
      )
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key])
    } else {
      sanitized[key] = obj[key]
    }
  })
  return sanitized
}



