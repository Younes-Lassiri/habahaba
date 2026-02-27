import { useState } from 'react'
import { FileText, Plus, X } from 'lucide-react'
import Modal from '../Modal'
import Button from '../Button'
import Select from '../Select'
import Input from '../Input'

export default function ReportBuilder({ isOpen, onClose }) {
  const [reportName, setReportName] = useState('')
  const [selectedFields, setSelectedFields] = useState([])
  const [filters, setFilters] = useState([])

  const availableFields = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'orders', label: 'Orders' },
    { value: 'products', label: 'Products' },
    { value: 'clients', label: 'Clients' },
    { value: 'delivery_time', label: 'Delivery Time' },
  ]

  const addField = (field) => {
    if (!selectedFields.includes(field)) {
      setSelectedFields([...selectedFields, field])
    }
  }

  const removeField = (field) => {
    setSelectedFields(selectedFields.filter((f) => f !== field))
  }

  const handleSave = () => {
    // Save custom report configuration
    console.log('Saving custom report:', { reportName, selectedFields, filters })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Custom Report Builder" size="lg">
      <div className="space-y-4">
        <Input
          label="Report Name"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          placeholder="Enter report name"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Fields
          </label>
          <Select
            onChange={(e) => {
              if (e.target.value) {
                addField(e.target.value)
                e.target.value = ''
              }
            }}
            options={availableFields.filter((f) => !selectedFields.includes(f.value))}
            placeholder="Add field to report"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedFields.map((field) => {
              const fieldLabel = availableFields.find((f) => f.value === field)?.label
              return (
                <div
                  key={field}
                  className="flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-lg text-sm"
                >
                  <span>{fieldLabel}</span>
                  <button
                    onClick={() => removeField(field)}
                    className="hover:text-primary-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} variant="primary" className="flex-1" disabled={!reportName || selectedFields.length === 0}>
            Save Report
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}



