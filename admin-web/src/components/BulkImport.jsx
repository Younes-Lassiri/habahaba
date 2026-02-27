import { useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Download } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import ProgressBar from './ProgressBar'
import api from '../api/axios'
import Toast from './Toast'

export default function BulkImport({
  isOpen,
  onClose,
  entityType, // 'products', 'categories', 'clients'
  onImportComplete,
  templateUrl,
}) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [toast, setToast] = useState(null)

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      // Preview first few rows
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target.result
        const lines = text.split('\n').slice(0, 5)
        setPreview(lines)
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setToast({ message: 'Please select a file', type: 'error' })
      return
    }

    try {
      setImporting(true)
      setProgress(0)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('entity_type', entityType)

      const response = await api.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setProgress(percentCompleted)
        },
      })

      setResults(response.data)
      setToast({ message: 'Import completed successfully', type: 'success' })

      if (onImportComplete) {
        onImportComplete(response.data)
      }
    } catch (error) {
      console.error('Import error:', error)
      setToast({
        message: error.response?.data?.message || 'Import failed',
        type: 'error',
      })
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    if (templateUrl) {
      window.open(templateUrl, '_blank')
    } else {
      // Generate a simple CSV template
      const template = generateTemplate(entityType)
      const blob = new Blob([template], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${entityType}_template.csv`
      link.click()
      window.URL.revokeObjectURL(url)
    }
  }

  const generateTemplate = (type) => {
    const templates = {
      products: 'name,description,price,category_id,rating,delivery\n',
      categories: 'name,description,active\n',
      clients: 'name,email,phone\n',
    }
    return templates[type] || ''
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setProgress(0)
    setResults(null)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          reset()
          onClose()
        }}
        title={`Import ${entityType?.charAt(0).toUpperCase() + entityType?.slice(1)}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Download Template */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Need a template? Download the CSV template
                </span>
              </div>
              <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Download Template
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File (CSV or Excel)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-primary-600 hover:text-primary-700"
              >
                Click to upload or drag and drop
              </label>
              {file && (
                <p className="mt-2 text-sm text-gray-600">{file.name}</p>
              )}
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview (first 5 rows)
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-40 overflow-auto">
                <pre className="text-xs text-gray-700">{preview.join('\n')}</pre>
              </div>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <ProgressBar
              progress={progress}
              total={100}
              label="Importing..."
              showPercentage
            />
          )}

          {/* Results */}
          {results && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Import Complete</span>
              </div>
              <div className="bg-gray-50 rounded p-3 text-sm">
                <p>Success: {results.success || 0}</p>
                <p>Failed: {results.failed || 0}</p>
                {results.errors && results.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-red-600">Errors:</p>
                    <ul className="list-disc list-inside text-red-600">
                      {results.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-xs">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleImport}
              variant="primary"
              className="flex-1"
              disabled={!file || importing}
              loading={importing}
            >
              Import
            </Button>
            <Button
              onClick={() => {
                reset()
                onClose()
              }}
              variant="outline"
              className="flex-1"
              disabled={importing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}



