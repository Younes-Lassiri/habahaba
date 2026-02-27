import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Plus, Eye, Edit, Search, MapPin, TrendingUp, History } from 'lucide-react'
import DeliveryManMap from '../components/DeliveryManMap'
import DeliveryManPerformance from '../components/DeliveryManPerformance'
import LoadingSpinner from '../components/LoadingSpinner'
import Toast from '../components/Toast'

export default function DeliveryMen() {
  const [deliveryMen, setDeliveryMen] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedDeliveryMan, setSelectedDeliveryMan] = useState(null)
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [performance, setPerformance] = useState(null)
  const [earnings, setEarnings] = useState(null)
  const [locationHistory, setLocationHistory] = useState([])
  const [selectedDeliveryManForHistory, setSelectedDeliveryManForHistory] = useState(null)
  const [isActiveFilter, setIsActiveFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [toast, setToast] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    vehicle_type: 'Motorcycle',
    license_number: '',
  })

  useEffect(() => {
    fetchDeliveryMen()
  }, [search, isActiveFilter, page, sortBy])

  const fetchDeliveryMen = async () => {
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (isActiveFilter) params.is_active = isActiveFilter
      if (sortBy) params.sort_by = sortBy
      const response = await api.get('/delivery-men', { params })
      setDeliveryMen(response.data.deliveryMen)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Error fetching delivery men:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDeliveryTime = (seconds) => {
    if (!seconds) return 'N/A'
    const totalSeconds = Math.round(seconds)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  const fetchPerformance = async (id) => {
    try {
      const [perfRes, earningsRes] = await Promise.allSettled([
        api.get(`/delivery-men/${id}/performance`),
        api.get(`/delivery-men/${id}/earnings`),
      ])
      
      if (perfRes.status === 'fulfilled') {
        setPerformance(perfRes.value.data)
      } else {
        console.error('Performance fetch failed:', perfRes.reason)
        setPerformance(null)
      }
      
      if (earningsRes.status === 'fulfilled') {
        setEarnings(earningsRes.value.data)
      } else {
        console.error('Earnings fetch failed:', earningsRes.reason)
        setEarnings(null)
      }
      
      setShowPerformanceModal(true)
    } catch (error) {
      console.error('Error fetching performance:', error)
      setToast({ message: error.response?.data?.message || 'Failed to fetch performance data', type: 'error' })
      setPerformance(null)
      setEarnings(null)
    }
  }

  const fetchLocationHistory = async (id) => {
    try {
      const response = await api.get(`/delivery-men/${id}/location-history`)
      setSelectedDeliveryManForHistory(response.data.delivery_man)
      setLocationHistory(response.data.locations || [])
      setShowHistoryModal(true)
    } catch (error) {
      console.error('Error fetching location history:', error)
      setToast({ message: 'Failed to fetch location history', type: 'error' })
    }
  }

  const fetchDeliveryManDetails = async (id) => {
    try {
      const response = await api.get(`/delivery-men/${id}`)
      setSelectedDeliveryMan(response.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching delivery man details:', error)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/delivery-men', formData)
      setShowCreateModal(false)
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        vehicle_type: 'Motorcycle',
        license_number: '',
      })
      fetchDeliveryMen()
    } catch (error) {
      console.error('Error creating delivery man:', error)
      alert(error.response?.data?.message || 'Failed to create delivery man')
    }
  }

  const handleUpdateStatus = async (id, isActive) => {
    try {
      await api.put(`/delivery-men/${id}`, { is_active: isActive })
      fetchDeliveryMen()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-800">Delivery Men</h1>
          <p className="text-gray-600 mt-1">Manage delivery personnel</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          Add Delivery Man
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Sort By</option>
            <option value="name">Name</option>
            <option value="avg_delivery_time">Avg Delivery Time</option>
            <option value="total_fees">Total Fees</option>
            <option value="deliveries_count">Deliveries Count</option>
          </select>
        </div>
      </div>

      {/* Delivery Men Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Delivery Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Fees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveryMen.map((dm) => (
                <tr key={dm.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {dm.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dm.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dm.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dm.vehicle_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <p className="font-medium">{dm.total_orders || 0}</p>
                      <p className="text-xs text-gray-400">
                        {dm.deliveries_count || 0} delivered
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dm.avg_delivery_time ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        dm.avg_delivery_seconds && dm.avg_delivery_seconds < 1800
                          ? 'bg-green-100 text-green-800'
                          : dm.avg_delivery_seconds && dm.avg_delivery_seconds < 3600
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {dm.avg_delivery_time}
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {parseFloat(dm.total_fees || 0).toFixed(2)} MAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dm.last_login ? (
                      <span>{new Date(dm.last_login).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleUpdateStatus(dm.id, !dm.is_active)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        dm.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {dm.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchDeliveryManDetails(dm.id)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {dm.current_latitude && dm.current_longitude && (
                        <button
                          onClick={() => {
                            setSelectedDeliveryMan({ deliveryMan: dm })
                            setShowMapModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Location"
                        >
                          <MapPin className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => fetchPerformance(dm.id)}
                        className="text-green-600 hover:text-green-900"
                        title="View Performance"
                      >
                        <TrendingUp className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => fetchLocationHistory(dm.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Location History"
                      >
                        <History className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of{' '}
              {pagination.total} delivery men
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Add Delivery Man</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Vehicle Type</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Bicycle">Bicycle</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Car">Car</option>
                  <option value="Van">Van</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">License Number</label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedDeliveryMan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedDeliveryMan.deliveryMan.name}
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{selectedDeliveryMan.deliveryMan.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{selectedDeliveryMan.deliveryMan.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vehicle Type</p>
                  <p className="font-medium">{selectedDeliveryMan.deliveryMan.vehicle_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${
                      selectedDeliveryMan.deliveryMan.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedDeliveryMan.deliveryMan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Login</p>
                  <p className="font-medium">
                    {selectedDeliveryMan.deliveryMan.last_login 
                      ? new Date(selectedDeliveryMan.deliveryMan.last_login).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Deliveries</p>
                  <p className="font-medium">{selectedDeliveryMan.deliveryMan.deliveries_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Delivery Time</p>
                  <p className="font-medium">
                    {selectedDeliveryMan.deliveryMan.avg_delivery_time || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Fees</p>
                  <p className="font-medium">
                    {parseFloat(selectedDeliveryMan.deliveryMan.total_fees || 0).toFixed(2)} MAD
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Sensitive Info</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-sm text-gray-600">License Number</p>
                    <p className="font-medium">{selectedDeliveryMan.deliveryMan.license_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created At</p>
                    <p className="font-medium">{selectedDeliveryMan.deliveryMan.created_at ? new Date(selectedDeliveryMan.deliveryMan.created_at).toLocaleString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Latitude</p>
                    <p className="font-medium">{selectedDeliveryMan.deliveryMan.current_latitude ? parseFloat(selectedDeliveryMan.deliveryMan.current_latitude).toFixed(6) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Longitude</p>
                    <p className="font-medium">{selectedDeliveryMan.deliveryMan.current_longitude ? parseFloat(selectedDeliveryMan.deliveryMan.current_longitude).toFixed(6) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Location Update</p>
                    <p className="font-medium">{selectedDeliveryMan.deliveryMan.last_location_update ? new Date(selectedDeliveryMan.deliveryMan.last_location_update).toLocaleString() : '-'}</p>
                  </div>
                  {selectedDeliveryMan.deliveryMan.image && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Profile Image</p>
                      <img src={selectedDeliveryMan.deliveryMan.image} alt="Profile" className="w-24 h-24 object-cover rounded border" onError={(e)=>{e.target.style.display='none'}} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Assigned Orders</h3>
                <div className="space-y-2">
                  {selectedDeliveryMan.orders.length === 0 ? (
                    <p className="text-gray-500">No orders assigned</p>
                  ) : (
                    selectedDeliveryMan.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-gray-500">{order.customer_name}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            order.status === 'Delivered'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Modal */}
      {showPerformanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Performance & Earnings</h2>
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <DeliveryManPerformance performance={performance} earnings={earnings} />
          </div>
        </div>
      )}

      {/* Location Map Modal */}
      {showMapModal && selectedDeliveryMan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Current Location</h2>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <DeliveryManMap
              lat={selectedDeliveryMan.deliveryMan.current_latitude}
              lon={selectedDeliveryMan.deliveryMan.current_longitude}
              name={selectedDeliveryMan.deliveryMan.name}
              lastUpdate={selectedDeliveryMan.deliveryMan.last_location_update}
            />
          </div>
        </div>
      )}

      {/* Location History Modal */}
      {showHistoryModal && selectedDeliveryManForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Location History - {selectedDeliveryManForHistory.name}
              </h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedDeliveryManForHistory(null)
                  setLocationHistory([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {/* Delivery Man Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-sm text-gray-900">{selectedDeliveryManForHistory.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-sm text-gray-900">{selectedDeliveryManForHistory.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="text-sm text-gray-900">{selectedDeliveryManForHistory.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Vehicle Type</p>
                  <p className="text-sm text-gray-900">{selectedDeliveryManForHistory.vehicle_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedDeliveryManForHistory.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedDeliveryManForHistory.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                {selectedDeliveryManForHistory.current_latitude && selectedDeliveryManForHistory.current_longitude && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Current Location</p>
                    <p className="text-sm text-gray-900">
                      {parseFloat(selectedDeliveryManForHistory.current_latitude).toFixed(6)},{' '}
                      {parseFloat(selectedDeliveryManForHistory.current_longitude).toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
              {selectedDeliveryManForHistory.last_location_update && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-600">Last Location Update</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedDeliveryManForHistory.last_location_update).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Location History */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Location Points</h3>
              {locationHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No location history available</p>
              ) : (
                locationHistory.map((location, index) => (
                  <div key={location.id || index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-gray-800">
                        {location.order_number ? `Order: ${location.order_number}` : 'Location Update'}
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        location.order_status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        location.order_status === 'OutForDelivery' ? 'bg-blue-100 text-blue-800' :
                        location.order_status ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {location.order_status || 'Tracking'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Coordinates:</p>
                        <p className="text-gray-900">
                          {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Time:</p>
                        <p className="text-gray-900">
                          {new Date(location.created_at).toLocaleString()}
                        </p>
                      </div>
                      {location.accuracy && (
                        <div>
                          <p className="text-gray-600">Accuracy:</p>
                          <p className="text-gray-900">{location.accuracy}m</p>
                        </div>
                      )}
                      {location.speed && (
                        <div>
                          <p className="text-gray-600">Speed:</p>
                          <p className="text-gray-900">{location.speed} km/h</p>
                        </div>
                      )}
                      {location.heading && (
                        <div>
                          <p className="text-gray-600">Heading:</p>
                          <p className="text-gray-900">{location.heading}°</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

