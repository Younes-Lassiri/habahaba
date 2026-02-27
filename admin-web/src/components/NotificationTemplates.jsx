import { useState, useEffect } from 'react'
import { FileText, Plus, Edit, Trash2 } from 'lucide-react'
import api from '../api/axios'
import Button from './Button'
import Modal from './Modal'
import Input from './Input'
import Toast from './Toast'

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    body: '',
    category: 'order',
  })
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/notification-templates')
      setTemplates(response.data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await api.put(`/notification-templates/${editingTemplate.id}`, formData)
        setToast({ message: 'Template updated successfully', type: 'success' })
      } else {
        await api.post('/notification-templates', formData)
        setToast({ message: 'Template created successfully', type: 'success' })
      }
      fetchTemplates()
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving template:', error)
      setToast({ message: 'Failed to save template', type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return

    try {
      await api.delete(`/notification-templates/${id}`)
      setToast({ message: 'Template deleted successfully', type: 'success' })
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      setToast({ message: 'Failed to delete template', type: 'error' })
    }
  }

  const handleEdit = (template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      title: template.title,
      body: template.body,
      category: template.category,
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({ name: '', title: '', body: '', category: 'order' })
    setEditingTemplate(null)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Notification Templates</h3>
          <Button onClick={() => {
            resetForm()
            setShowModal(true)
          }} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Template
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-800">{template.name}</h4>
                  <span className="text-xs text-gray-500">{template.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium mb-1">{template.title}</p>
              <p className="text-sm text-gray-500 line-clamp-2">{template.body}</p>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={[
              { value: 'order', label: 'Order' },
              { value: 'system', label: 'System' },
              { value: 'promotion', label: 'Promotion' },
            ]}
          />
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows="4"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} variant="primary" className="flex-1">
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
            <Button
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  )
}



