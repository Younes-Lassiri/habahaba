import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportToPDF = (data, options = {}) => {
  const {
    title = 'Report',
    filename = 'export.pdf',
    columns = [],
    orientation = 'portrait',
    unit = 'mm',
    format = 'a4',
  } = options

  const doc = new jsPDF({
    orientation,
    unit,
    format,
  })

  // Add title
  doc.setFontSize(16)
  doc.text(title, 14, 15)

  // Add date
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)

  if (data && data.length > 0) {
    // Extract headers from first row or use provided columns
    const headers = columns.length > 0
      ? columns.map((col) => col.label || col.key)
      : Object.keys(data[0])

    // Extract rows
    const rows = data.map((row) => {
      if (columns.length > 0) {
        return columns.map((col) => {
          const value = row[col.key]
          return value !== null && value !== undefined ? String(value) : ''
        })
      }
      return Object.values(row).map((val) =>
        val !== null && val !== undefined ? String(val) : ''
      )
    })

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 165, 233] }, // primary-500
    })
  } else {
    doc.setFontSize(12)
    doc.text('No data available', 14, 40)
  }

  // Save PDF
  doc.save(filename)
}

export const exportChartToPDF = (chartData, options = {}) => {
  const { title = 'Chart', filename = 'chart.pdf' } = options

  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text(title, 14, 15)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)

  // Note: For actual chart images, you'd need to convert canvas to image
  // This is a placeholder - implement with chart library's export functionality
  doc.text('Chart export requires chart library integration', 14, 40)

  doc.save(filename)
}

