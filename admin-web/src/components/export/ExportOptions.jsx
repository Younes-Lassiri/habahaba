import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, File, FileJson } from 'lucide-react'
import { exportToCSV, exportToExcel, exportToPDF, exportToJSON } from '../../utils/export'
import Modal from '../Modal'
import Button from '../Button'

export default function ExportOptions({
  isOpen,
  onClose,
  data,
  filename,
  title,
  columns = [],
}) {
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState('csv')

  const handleExport = () => {
    if (!data || data.length === 0) {
      alert('No data to export')
      return
    }

    setExporting(true)

    try {
      const baseFilename = filename || `export_${new Date().toISOString().split('T')[0]}`

      switch (format) {
        case 'csv':
          exportToCSV(data, `${baseFilename}.csv`)
          break
        case 'excel':
          exportToExcel(data, `${baseFilename}.xlsx`, 'Sheet1', columns)
          break
        case 'pdf':
          exportToPDF(data, `${baseFilename}.pdf`, title || 'Report', columns)
          break
        case 'json':
          exportToJSON(data, `${baseFilename}.json`)
          break
        default:
          exportToCSV(data, `${baseFilename}.csv`)
      }

      setTimeout(() => {
        setExporting(false)
        onClose()
      }, 500)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data')
      setExporting(false)
    }
  }

  const formats = [
    { value: 'csv', label: 'CSV', icon: FileText, description: 'Comma-separated values' },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel format' },
    { value: 'pdf', label: 'PDF', icon: File, description: 'Portable Document Format' },
    { value: 'json', label: 'JSON', icon: FileJson, description: 'JavaScript Object Notation' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Data" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Format
          </label>
          <div className="space-y-2">
            {formats.map((fmt) => {
              const Icon = fmt.icon
              return (
                <button
                  key={fmt.value}
                  onClick={() => setFormat(fmt.value)}
                  className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                    format === fmt.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-800">{fmt.label}</p>
                      <p className="text-xs text-gray-500">{fmt.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>{data?.length || 0}</strong> records will be exported
          </p>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleExport}
            variant="primary"
            className="flex-1"
            loading={exporting}
            disabled={exporting}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1" disabled={exporting}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}



