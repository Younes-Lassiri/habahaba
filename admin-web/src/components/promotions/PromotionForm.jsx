import { useState, useEffect } from 'react'
import { Tag, Calendar, DollarSign, Percent, Palette, Code } from 'lucide-react'
import api from '../../api/axios'
import Modal from '../Modal'
import Button from '../Button'
import Input from '../Input'
import Select from '../Select'
import DateRangePicker from '../DateRangePicker'
import Toast from '../Toast'

export default function PromotionForm({formType, isOpen, onClose, initialData, onSuccess}) {
  const [formData, setFormData] = useState({
    code: '',
    title: '', // Changed from 'name' to 'title'
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: '', // Changed from 'min_order_value' to 'min_order_amount'
    max_discount: '',
    valid_from: '', // Changed from 'start_date' to 'valid_from'
    valid_until: '', // Changed from 'end_date' to 'valid_until'
    usage_limit: '',
    is_active: true, // Changed from 'active' to 'is_active'
    badge: '',
    color: '#3B82F6',
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Populate form with initial data when editing
  useEffect(() => {
    if (initialData && formType === 'old') {
      setFormData({
        code: initialData.code || '',
        title: initialData.title || '',
        description: initialData.description || '',
        discount_type: initialData.discount_type || 'percentage',
        discount_value: initialData.discount_value || '',
        min_order_amount: initialData.min_order_amount || '',
        max_discount: initialData.max_discount || '',
        valid_from: initialData.valid_from ? new Date(initialData.valid_from).toISOString().split('T')[0] : '',
        valid_until: initialData.valid_until ? new Date(initialData.valid_until).toISOString().split('T')[0] : '',
        usage_limit: initialData.usage_limit || '',
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
        badge: initialData.badge || '',
        color: initialData.color || '#3B82F6',
      })
    } else if (!initialData) {
      // Reset form for new promotion
      setFormData({
        code: '',
        title: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        min_order_amount: '',
        max_discount: '',
        valid_from: '',
        valid_until: '',
        usage_limit: '',
        is_active: true,
        badge: '',
        color: '#3B82F6',
      })
    }
  }, [initialData, formType, isOpen])

  const handleSubmit = async (e) => {
    console.log('Submitting form data:', formData);
    e.preventDefault()
    
    // Check required fields based on backend requirements
    if (!formData.code || !formData.title || !formData.discount_type || !formData.discount_value || !formData.valid_from || !formData.valid_until) {
      setToast({ 
        message: 'Please fill in all required fields: Code, Title, Discount Type, Discount Value, Start Date, and End Date', 
        type: 'error' 
      })
      return
    }

    try {
      setLoading(true)
      if (formType === 'old' && initialData) {
        // Update existing promotion
        await api.put(`/promo-codes/${initialData.id}`, formData)
        setToast({ message: 'Promotion updated successfully', type: 'success' })
      } else {
        // Create new promotion
        await api.post('/create-promo-code', formData)
        setToast({ message: 'Promotion created successfully', type: 'success' })
      }

      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 500)
      }
    } catch (error) {
      console.error('Error saving promotion:', error)
      setToast({
        message: error.response?.data?.message || 'Failed to save promotion',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  // Common badge options
  const badgeOptions = [
    { value: '', label: 'No Badge' },
    { value: 'sale', label: 'Sale' },
    { value: 'new', label: 'New' },
    { value: 'hot', label: 'Hot' },
    { value: 'limited', label: 'Limited Time' },
    { value: 'special', label: 'Special Offer' },
    { value: 'exclusive', label: 'Exclusive' },
    { value: 'flash', label: 'Flash Sale' },
  ]

  // Common color options for quick selection
  const colorOptions = [
    { value: '#EF4444', label: 'Red' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#10B981', label: 'Emerald' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#8B5CF6', label: 'Violet' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#000000', label: 'Black' },
  ]

  return (
    <>
      <Modal
        isOpen={isOpen}
        title={formType === 'old' ? 'Edit Promotion' : 'New Promotion'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code Input at the Top */}
          <Input
            label="Promo Code *"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            placeholder="e.g., SUMMER2024"
            icon={<Code className="w-4 h-4" />}
          />

          <Input
            label="Promotion Title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="e.g., Summer Sale 2024"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows="3"
              placeholder="Promotion description"
            />
          </div>

          {/* Badge and Color Section */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Badge Type"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
              options={badgeOptions}
              icon={<Tag className="w-4 h-4" />}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Badge Color
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 cursor-pointer rounded-lg border border-gray-300"
                  />
                  <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Custom</option>
                  {colorOptions.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div 
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="text-xs text-gray-500">{formData.color}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Discount Type *"
              value={formData.discount_type}
              onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
              options={[
                { value: 'percentage', label: 'Percentage' },
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'free_delivery', label: 'Free Delivery' },
              ]}
              required
            />

            <Input
              label={formData.discount_type === 'percentage' ? 'Discount Value % *' : 'Discount Amount (MAD) *'}
              type="number"
              min="0"
              max={formData.discount_type === 'percentage' ? '100' : undefined}
              step="0.01"
              value={formData.discount_value}
              onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Order Amount (MAD)"
              type="number"
              min="0"
              step="0.01"
              value={formData.min_order_amount}
              onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
              placeholder="0"
            />

            {formData.discount_type === 'percentage' && (
              <Input
                label="Max Discount (MAD)"
                type="number"
                min="0"
                step="0.01"
                value={formData.max_discount}
                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                placeholder="No limit"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valid From *"
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              required
            />

            <Input
              label="Valid Until *"
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              required
            />
          </div>

          <Input
            label="Usage Limit"
            type="number"
            min="0"
            value={formData.usage_limit}
            onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
            placeholder="Unlimited"
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" variant="primary" className="flex-1" loading={loading}>
              {formType === 'old' ? 'Update' : 'Create'} Promotion
            </Button>
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  )
}

