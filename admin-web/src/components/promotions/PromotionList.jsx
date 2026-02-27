import React, { useState, useEffect } from 'react'
import { Edit2, Trash2, Copy, CheckCircle, AlertCircle, Clock, Calendar, DollarSign, Percent, Truck } from 'lucide-react'
import api from '../../api/axios'
import { useModal } from '../../hooks/useModal'
import PromotionForm from './PromotionForm'
import Modal from '../Modal'

export default function PromotionList() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const { isOpen: showForm, open: openForm, close: closeForm, data: formData } = useModal()
  const { isOpen: showGenerator, open: openGenerator, close: closeGenerator } = useModal()

  const fetchPromoCodes = async () => {
    try {
      setLoading(true)
      const response = await api.get('/promo-codes')
      console.log('API Response:', response)
      console.log('Response data:', response.data)
      
      // Handle different possible response structures
      let promoData = response.data
      
      // If response.data is not an array, check common patterns
      if (!Array.isArray(promoData)) {
        if (promoData && Array.isArray(promoData.data)) {
          promoData = promoData.data // Handle { data: [] } pattern
        } else if (promoData && Array.isArray(promoData.promoCodes)) {
          promoData = promoData.promoCodes // Handle { promoCodes: [] } pattern
        } else if (promoData && Array.isArray(promoData.results)) {
          promoData = promoData.results // Handle { results: [] } pattern
        } else {
          // If still not an array, set empty array and show error
          console.error('Unexpected API response structure:', promoData)
          showToast('Unexpected data format received', 'error')
          promoData = []
        }
      }
      
      setCodes(promoData || [])
      
    } catch (error) {
      console.error('Error fetching promo codes:', error)
      showToast('Failed to fetch promo codes', 'error')
      setCodes([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch promo codes from API
  useEffect(() => {
    fetchPromoCodes()
  }, [])
  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedId(code)
    showToast(`Copied: ${code}`, 'success')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (id, code) => {
    if (confirm(`Delete promo code "${code}"? This action cannot be undone.`)) {
      setCodes(codes.filter(c => c.id !== id))
      showToast('Promo code deleted successfully', 'success')
    }
  }

  const handleEdit = (code) => {
    openForm(code)
  }

  const handleFormSuccess = () => {
    fetchPromoCodes()
    closeForm()
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getDiscountIcon = (type) => {
    switch(type) {
      case 'percentage': return <Percent className="w-4 h-4" />
      case 'fixed': return <DollarSign className="w-4 h-4" />
      case 'free_delivery': return <Truck className="w-4 h-4" />
      default: return null
    }
  }

  const getDiscountLabel = (type, value) => {
    switch(type) {
      case 'percentage': return `${value}% OFF`
      case 'fixed': return `${value} MAD OFF`
      case 'free_delivery': return 'FREE DELIVERY'
      default: return ''
    }
  }

  const getStatusColor = (isActive, validUntil) => {
    const now = new Date()
    const until = new Date(validUntil)
    if (!isActive) return 'bg-gray-100 text-gray-700'
    if (until < now) return 'bg-red-100 text-red-700'
    return 'bg-green-100 text-green-700'
  }

  const getStatusText = (isActive, validUntil) => {
    const now = new Date()
    const until = new Date(validUntil)
    if (!isActive) return 'Inactive'
    if (until < now) return 'Expired'
    return 'Active'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getUsagePercentage = (used, limit) => {
    if (!limit) return null
    return Math.round((used / limit) * 100)
  }

  // Safe array access for statistics
  const totalCodes = Array.isArray(codes) ? codes.length : 0
  const activeCodes = Array.isArray(codes) ? codes.filter(c => c.is_active && new Date(c.valid_until) > new Date()).length : 0
  const totalUses = Array.isArray(codes) ? codes.reduce((sum, c) => sum + (c.used_count || 0), 0) : 0
  const inactiveCodes = Array.isArray(codes) ? codes.filter(c => !c.is_active || new Date(c.valid_until) < new Date()).length : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading promo codes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Modal
        isOpen={showForm}
        title={formData?.id ? 'Edit Promotion' : 'New Promotion'}
        size="lg"
        onClose={closeForm}
      >
        <PromotionForm 
          formType={formData?.id ? 'old' : 'new'}
          isOpen={showForm}
          onClose={closeForm}
          initialData={formData}
          onSuccess={handleFormSuccess}
        />
      </Modal>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
        {/* Header Stats */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalCodes}</div>
            <div className="text-sm text-gray-600">Total Codes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{activeCodes}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{totalUses}</div>
            <div className="text-sm text-gray-600">Total Uses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{inactiveCodes}</div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Offer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Validity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.isArray(codes) && codes.length > 0 ? (
                codes.map((code) => {
                  const usagePercentage = getUsagePercentage(code.used_count, code.usage_limit)
                  return (
                    <tr key={code.id} className="hover:bg-gray-50 transition-colors group">
                      {/* Code Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleCopy(code.code)}
                            className="group/copy flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-blue-100 rounded-lg transition-all"
                          >
                            <code className="font-mono font-bold text-gray-800 group-hover/copy:text-blue-600">
                              {code.code}
                            </code>
                            {copiedId === code.code ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400 group-hover/copy:text-blue-600" />
                            )}
                          </button>
                          {code.badge && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full" style={{
                              backgroundColor: code.color + '20',
                              color: code.color,
                              border: `1px solid ${code.color}40`
                            }}>
                              {code.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{code.title}</p>
                      </td>

                      {/* Offer Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: code.color + '15' }}>
                            <span style={{ color: code.color }}>
                              {getDiscountIcon(code.discount_type)}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{getDiscountLabel(code.discount_type, code.discount_value)}</div>
                            <p className="text-xs text-gray-500">Min: {code.min_order_amount} MAD</p>
                          </div>
                        </div>
                      </td>

                      {/* Validity Column */}
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-gray-700">
                            <Calendar className="w-3 h-3" />
                            {formatDate(code.valid_from)}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-3 h-3" />
                            {formatDate(code.valid_until)}
                          </div>
                        </div>
                      </td>

                      {/* Usage Column */}
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">{code.used_count} used</span>
                            {code.usage_limit && (
                              <span className="text-xs text-gray-500">of {code.usage_limit}</span>
                            )}
                          </div>
                          {usagePercentage !== null && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${usagePercentage}%`,
                                  backgroundColor: usagePercentage > 80 ? '#EF4444' : usagePercentage > 50 ? '#F59E0B' : '#10B981'
                                }}
                              />
                            </div>
                          )}
                          {!code.usage_limit && (
                            <div className="text-xs text-gray-500">Unlimited</div>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(code.is_active, code.valid_until)}`}>
                          {!code.is_active || new Date(code.valid_until) < new Date() ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          {getStatusText(code.is_active, code.valid_until)}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(code)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group/edit"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleDelete(code.id, code.code)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group/delete"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-500 mb-1">No promo codes found</h3>
                    <p className="text-gray-400">Create your first promo code to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white animate-bounce ${
          toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

