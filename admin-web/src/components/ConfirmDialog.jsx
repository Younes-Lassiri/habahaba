import { AlertTriangle, X } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
}) {
  const typeColors = {
    warning: 'text-yellow-600 bg-yellow-50',
    danger: 'text-red-600 bg-red-50',
    info: 'text-blue-600 bg-blue-50',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className={`flex items-start gap-3 p-4 rounded-lg ${typeColors[type]}`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{message}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={onConfirm} variant={type === 'danger' ? 'danger' : 'primary'} className="flex-1">
            {confirmText}
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            {cancelText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
