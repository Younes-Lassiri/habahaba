export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

export const formatDateTime = (date) => {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss')
}

export const formatDateShort = (date) => {
  return formatDate(date, 'MM/DD/YYYY')
}

export const getDateRange = (days = 30) => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start, end }
}

export const formatDateRange = (start, end) => {
  return `${formatDate(start)} to ${formatDate(end)}`
}

export const getStartOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export const getEndOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export const getStartOfMonth = (date = new Date()) => {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export const getEndOfMonth = (date = new Date()) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  d.setHours(23, 59, 59, 999)
  return d
}

export const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export const getEndOfWeek = (date = new Date()) => {
  const d = getStartOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

