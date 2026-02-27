import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Star, User, MessageSquare, Calendar, Image as ImageIcon, Search, Filter, Download, ChevronDown, X } from 'lucide-react'
import { getImageUrl } from '../config/api'

export default function OrderRatings() {
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    min_food_quality: '',
    max_food_quality: '',
    min_delivery_service: '',
    max_delivery_service: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRating, setSelectedRating] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const params = { page, limit: 20 }
      if (search) params.search = search
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const res = await api.get('/order-ratings', { params })
      setRatings(res.data.ratings || [])
      setPagination(res.data.pagination || null)
    } catch (e) {
      console.error('Error fetching order ratings:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, search, filters])

  const handleExport = async () => {
    try {
      const params = {}
      if (search) params.search = search
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const res = await api.get('/order-ratings/export', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'order_ratings.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e) {
      console.error('Export error:', e)
    }
  }

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      min_food_quality: '',
      max_food_quality: '',
      min_delivery_service: '',
      max_delivery_service: ''
    })
    setSearch('')
    setPage(1)
  }

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < (rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`} fill={i < (rating || 0) ? 'currentColor' : 'none'} />
        ))}
        <span className="ml-1 text-gray-600">{rating || 0}/5</span>
      </div>
    )
  }

  if (loading && ratings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Star className="w-8 h-8 text-yellow-500" />
            Order Ratings
          </h1>
          <p className="text-gray-600 mt-1">Customer feedback with enriched order and product details</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by customer name, email, order number, or comment..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {(search || Object.values(filters).some(v => v)) && (
            <button onClick={clearFilters} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900">
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => { setFilters({...filters, start_date: e.target.value}); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => { setFilters({...filters, end_date: e.target.value}); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Food Quality</label>
              <select
                value={filters.min_food_quality}
                onChange={(e) => { setFilters({...filters, min_food_quality: e.target.value}); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Food Quality</label>
              <select
                value={filters.max_food_quality}
                onChange={(e) => { setFilters({...filters, max_food_quality: e.target.value}); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Delivery Service</label>
              <select
                value={filters.min_delivery_service}
                onChange={(e) => { setFilters({...filters, min_delivery_service: e.target.value}); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Delivery Service</label>
              <select
                value={filters.max_delivery_service}
                onChange={(e) => { setFilters({...filters, max_delivery_service: e.target.value}); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Man</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food Quality</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ratings.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRating(r)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    <div>
                      <div className="font-medium">{r.order_number || `#${r.order_id}`}</div>
                      <div className="text-xs text-gray-500">{r.status}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{r.customer_name || 'Unknown'}</span>
                      </div>
                      <div className="text-xs text-gray-500">{r.customer_email}</div>
                      <div className="text-xs text-gray-500">{r.customer_phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div>
                      <div>{r.delivery_man_name || '-'}</div>
                      <div className="text-xs text-gray-500">{r.delivery_man_phone || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Price: {parseFloat(r.final_price || 0).toFixed(2)} MAD</div>
                      <div className="line-clamp-2" title={r.products_in_order || ''}>
                        {r.products_in_order || '-'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {renderStars(r.food_quality)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {renderStars(r.delivery_service)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="line-clamp-2" title={r.comment || ''}>{r.comment || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {ratings.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-gray-500" colSpan={8}>No ratings found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} ratings
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50">Previous</button>
              <button onClick={() => setPage(page + 1)} disabled={page >= pagination.pages} className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Rating Detail Modal */}
      {selectedRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Rating Details</h2>
                <button onClick={() => setSelectedRating(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-medium">{selectedRating.order_number || `#${selectedRating.order_id}`}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Status</p>
                  <p className="font-medium">{selectedRating.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer Name</p>
                  <p className="font-medium">{selectedRating.customer_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer Email</p>
                  <p className="font-medium">{selectedRating.customer_email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer Phone</p>
                  <p className="font-medium">{selectedRating.customer_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Man</p>
                  <p className="font-medium">{selectedRating.delivery_man_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Man Phone</p>
                  <p className="font-medium">{selectedRating.delivery_man_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Final Price</p>
                  <p className="font-medium">${parseFloat(selectedRating.final_price || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Food Quality Rating</p>
                  <div>{renderStars(selectedRating.food_quality)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Service Rating</p>
                  <div>{renderStars(selectedRating.delivery_service)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-medium">{selectedRating.created_at ? new Date(selectedRating.created_at).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Updated At</p>
                  <p className="font-medium">{selectedRating.updated_at ? new Date(selectedRating.updated_at).toLocaleString() : '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Delivery Address</p>
                <p className="font-medium text-sm bg-gray-50 p-3 rounded">{selectedRating.delivery_address || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Products in Order</p>
                <p className="font-medium text-sm bg-gray-50 p-3 rounded">{selectedRating.products_in_order || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Customer Comment</p>
                <p className="font-medium text-sm bg-gray-50 p-3 rounded whitespace-pre-wrap">{selectedRating.comment || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
