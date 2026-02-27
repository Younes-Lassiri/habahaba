import * as XLSX from 'xlsx'

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

        // First row as headers
        const headers = jsonData[0] || []
        const rows = jsonData.slice(1).map((row) => {
          const obj = {}
          headers.forEach((header, index) => {
            obj[header] = row[index] || ''
          })
          return obj
        })

        resolve({ headers, rows, totalRows: rows.length })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

export const validateImportData = (data, schema) => {
  const errors = []
  const warnings = []

  data.forEach((row, index) => {
    schema.forEach((field) => {
      const value = row[field.key]

      // Required field check
      if (field.required && (!value || value.toString().trim() === '')) {
        errors.push({
          row: index + 2, // +2 because index is 0-based and we skip header
          field: field.key,
          message: `${field.label} is required`,
        })
      }

      // Type validation
      if (value && field.type) {
        if (field.type === 'number' && isNaN(parseFloat(value))) {
          errors.push({
            row: index + 2,
            field: field.key,
            message: `${field.label} must be a number`,
          })
        }

        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({
            row: index + 2,
            field: field.key,
            message: `${field.label} must be a valid email`,
          })
        }
      }

      // Custom validation
      if (value && field.validate) {
        const validationResult = field.validate(value, row)
        if (!validationResult.valid) {
          if (validationResult.severity === 'error') {
            errors.push({
              row: index + 2,
              field: field.key,
              message: validationResult.message,
            })
          } else {
            warnings.push({
              row: index + 2,
              field: field.key,
              message: validationResult.message,
            })
          }
        }
      }
    })
  })

  return { errors, warnings, isValid: errors.length === 0 }
}

export const generateImportTemplate = (schema, filename = 'template.xlsx') => {
  const headers = schema.map((field) => field.label || field.key)
  const exampleRow = schema.map((field) => {
    if (field.example) return field.example
    if (field.type === 'number') return 0
    if (field.type === 'email') return 'example@email.com'
    return ''
  })

  const data = [headers, exampleRow]

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  XLSX.writeFile(wb, filename)
}



