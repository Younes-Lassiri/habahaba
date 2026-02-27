import { useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { parseExcelFile, validateImportData, generateImportTemplate } from '../../utils/excelImport'
import Modal from '../Modal'
import Button from '../Button'
import ProgressBar from '../ProgressBar'
import ImportPreview from './ImportPreview'
import ImportErrors from './ImportErrors'

export default function ImportWizard({
  isOpen,
  onClose,
  entityType,
  schema = [],
  onImport,
  templateUrl,
}) {
  const [step, setStep] = useState(1) // 1: Upload, 2: Preview, 3: Validate, 4: Import
  const [file, setFile] = useState(null)
  const [data, setData] = useState(null)
  const [validation, setValidation] = useState(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)

    try {
      const parsed = await parseExcelFile(selectedFile)
      setData(parsed)
      setStep(2)
    } catch (error) {
      console.error('Error parsing file:', error)
      alert('Failed to parse file. Please check the format.')
    }
  }

  const handleValidate = () => {
    if (!data || !schema.length) {
      setStep(3)
      return
    }

    const validationResult = validateImportData(data.rows, schema)
    setValidation(validationResult)
    setStep(3)
  }

  const handleImport = async () => {
    if (!data || !onImport) return

    setImporting(true)
    setProgress(0)

    try {
      // Filter out rows with errors
      const validRows = data.rows.filter((row, index) => {
        if (!validation) return true
        return !validation.errors.some((err) => err.row === index + 2)
      })

      await onImport(validRows, (current, total) => {
        setProgress((current / total) * 100)
      })

      setStep(4)
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    if (schema.length > 0) {
      generateImportTemplate(schema, `${entityType}_template.xlsx`)
    } else if (templateUrl) {
      window.open(templateUrl, '_blank')
    }
  }

  const reset = () => {
    setStep(1)
    setFile(null)
    setData(null)
    setValidation(null)
    setProgress(0)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Import ${entityType?.charAt(0).toUpperCase() + entityType?.slice(1)}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-800">Download template for correct format</span>
                </div>
                <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
                  Download Template
                </Button>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="cursor-pointer text-primary-600 hover:text-primary-700 font-medium"
              >
                Click to upload or drag and drop
              </label>
              {file && <p className="mt-2 text-sm text-gray-600">{file.name}</p>}
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && data && (
          <div>
            <ImportPreview data={data} />
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button onClick={handleValidate} variant="primary" className="flex-1">
                Validate
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Validation */}
        {step === 3 && validation && (
          <div>
            <ImportErrors validation={validation} />
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                Back
              </Button>
              {validation.isValid && (
                <Button onClick={handleImport} variant="primary" className="flex-1" disabled={importing}>
                  {importing ? 'Importing...' : 'Import'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Import Complete!</h3>
            <p className="text-gray-600 mb-4">
              {data?.rows.length || 0} records processed successfully
            </p>
            <Button onClick={handleClose} variant="primary">
              Close
            </Button>
          </div>
        )}

        {/* Progress Bar */}
        {importing && (
          <ProgressBar progress={progress} total={100} label="Importing..." showPercentage />
        )}
      </div>
    </Modal>
  )
}



