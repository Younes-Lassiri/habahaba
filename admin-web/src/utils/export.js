import * as XLSX from 'xlsx'
import { exportToPDF as pdfExport } from './pdfExport'

export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToExcel = (data, filename = 'export.xlsx', sheetName = 'Sheet1', columns = []) => {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  // Use provided columns or extract from data
  const headers = columns.length > 0
    ? columns.map((col) => col.label || col.key)
    : Object.keys(data[0])

  const rows = data.map((row) => {
    if (columns.length > 0) {
      return columns.map((col) => row[col.key] || '')
    }
    return Object.values(row).map((val) => (val !== null && val !== undefined ? val : ''))
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

export const exportToPDF = (data, filename = 'export.pdf', title = 'Report', columns = []) => {
  pdfExport(data, { title, filename, columns })
}

export const exportToJSON = (data, filename = 'export.json') => {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

