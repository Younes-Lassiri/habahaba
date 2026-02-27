import { useState } from 'react'
import { Edit, Trash2, Download, Upload, CheckSquare, Square } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'
import Select from './Select'
import ConfirmDialog from './ConfirmDialog'

export default function BulkActions({
  selectedCount,
  onBulkUpdate,
  onBulkDelete,
  onBulkExport,
  onBulkImport,
  updateFields = [],
  className = '',
}) {
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [updateField, setUpdateField] = useState('')
  const [updateValue, setUpdateValue] = useState('')

  const handleBulkUpdate = () => {
    if (updateField && updateValue && onBulkUpdate) {
      onBulkUpdate(updateField, updateValue)
      setShowUpdateModal(false)
      setUpdateField('')
      setUpdateValue('')
    }
  }

  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete()
    }
    setShowDeleteModal(false)
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <div className={`bg-primary-50 border border-primary-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-primary-800">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onBulkUpdate && updateFields.length > 0 && (
            <Button
              onClick={() => setShowUpdateModal(true)}
              variant="primary"
              size="sm"
            >
              <Edit className="w-4 h-4 mr-1" />
              Update
            </Button>
          )}
          {onBulkExport && (
            <Button
              onClick={onBulkExport}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}
          {onBulkDelete && (
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="danger"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Update Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Bulk Update"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Field to Update"
            value={updateField}
            onChange={(e) => setUpdateField(e.target.value)}
            options={updateFields}
            required
          />
          <input
            type="text"
            value={updateValue}
            onChange={(e) => setUpdateValue(e.target.value)}
            placeholder="New value"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <div className="flex gap-2">
            <Button onClick={handleBulkUpdate} variant="primary" className="flex-1" disabled={!updateField || !updateValue}>
              Update {selectedCount} Items
            </Button>
            <Button
              onClick={() => setShowUpdateModal(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Confirm Bulk Delete"
        message={`Are you sure you want to delete ${selectedCount} selected item(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  )
}



