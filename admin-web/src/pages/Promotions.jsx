import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Tag, Plus, Edit, Trash2, TrendingUp, Calendar } from 'lucide-react'
import PromotionForm from '../components/promotions/PromotionForm'
import PromotionList from '../components/promotions/PromotionList'
import PromotionAnalytics from '../components/promotions/PromotionAnalytics'
import DiscountCodeGenerator from '../components/promotions/DiscountCodeGenerator'
import { useModal } from '../hooks/useModal'
import Button from '../components/Button'
import Toast from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Promotions() {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('analytics') // 'list', 'analytics', 'codes'
  const [toast, setToast] = useState(null)
  const { isOpen: showForm, open: openForm, close: closeForm, data: formData } = useModal()
  const { isOpen: showGenerator, open: openGenerator, close: closeGenerator } = useModal()

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    try {
      setLoading(true)
      const response = await api.get('/promo-codes')
      setPromotions(response.data.promotions || [])
    } catch (error) {
      console.error('Error fetching promotions:', error)
      setToast({ message: 'Failed to fetch promotions', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    openForm(null)
  }

  const handleEdit = (promotion) => {
    openForm(promotion)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this promotion?')) return

    try {
      await api.delete(`/promotions/${id}`)
      setToast({ message: 'Promotion deleted successfully', type: 'success' })
      fetchPromotions()
    } catch (error) {
      console.error('Error deleting promotion:', error)
      setToast({ message: 'Failed to delete promotion', type: 'error' })
    }
  }

  const handleSuccess = () => {
    fetchPromotions()
    closeForm()
  }

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'codes', label: 'Discount Codes', icon: Tag },
  ]

  if (loading && promotions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Tag className="w-8 h-8" />
            Promotions & Discounts
          </h1>
          <p className="text-gray-600 mt-1">Manage promotions and discount codes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openGenerator} variant="outline">
            Generate Codes
          </Button>
          <Button onClick={handleCreate} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            New Promotion
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'analytics' && <PromotionAnalytics />}

      {activeTab === 'codes' && (
        <PromotionList/>
      )}

      {/* Promotion Form Modal */}
      {showForm && (
        <PromotionForm
          isOpen={showForm}
          onClose={closeForm}
          promotion={formData}
          onSuccess={handleSuccess}
        />
      )}

      {/* Code Generator Modal */}
      {showGenerator && (
        <DiscountCodeGenerator isOpen={showGenerator} onClose={closeGenerator} />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}



