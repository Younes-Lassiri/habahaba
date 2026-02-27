import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Eye, Edit, Search, Download, MapPin, Heart, Key, CheckCircle, XCircle, Calendar } from 'lucide-react'
import ClientMap from '../components/ClientMap'
import ClientFavorites from '../components/ClientFavorites'
import ClientActivityLog from '../components/ClientActivityLog'
import DateRangePicker from '../components/DateRangePicker'
import ConfirmDialog from '../components/ConfirmDialog'
import Toast from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'
import { getImageUrl } from '../config/api'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showFavoritesModal, setShowFavoritesModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [clientFavorites, setClientFavorites] = useState([])
  const [clientActivity, setClientActivity] = useState([])
  const [dateRange, setDateRange] = useState(null)
  const [toast, setToast] = useState(null)
  const [hasFavoritesFilter, setHasFavoritesFilter] = useState('')

  useEffect(() => {
    fetchClients()
  }, [search, dateRange, page, hasFavoritesFilter])

  const fetchClients = async () => {
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (dateRange?.start) params.start_date = dateRange.start
      if (dateRange?.end) params.end_date = dateRange.end
      if (hasFavoritesFilter) params.has_favorites = hasFavoritesFilter
      const response = await api.get('/clients', { params })
      setClients(response.data.clients)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (dateRange?.start) params.start_date = dateRange.start
      if (dateRange?.end) params.end_date = dateRange.end

      const response = await api.get('/clients/export', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `clients_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setToast({ message: 'Clients exported successfully', type: 'success' })
    } catch (error) {
      console.error('Error exporting clients:', error)
      setToast({ message: 'Failed to export clients', type: 'error' })
    }
  }

  const handleToggleStatus = async (clientId, currentStatus) => {
    try {
      await api.put(`/clients/${clientId}/toggle-status`)
      setToast({ message: 'Client status updated', type: 'success' })
      fetchClients()
      if (selectedClient?.client?.id === clientId) {
        fetchClientDetails(clientId)
      }
    } catch (error) {
      console.error('Error toggling status:', error)
      setToast({ message: 'Failed to update status', type: 'error' })
    }
  }

  const handleToggleVerification = async (clientId) => {
    try {
      await api.put(`/clients/${clientId}/toggle-verification`)
      setToast({ message: 'Verification status updated', type: 'success' })
      fetchClients()
      if (selectedClient?.client?.id === clientId) {
        fetchClientDetails(clientId)
      }
    } catch (error) {
      console.error('Error toggling verification:', error)
      setToast({ message: 'Failed to update verification', type: 'error' })
    }
  }

  const handleResetPassword = async (clientId) => {
    const newPassword = prompt('Enter new password (min 6 characters):')
    if (!newPassword || newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' })
      return
    }

    try {
      await api.post(`/clients/${clientId}/reset-password`, { newPassword })
      setToast({ message: 'Password reset successfully', type: 'success' })
    } catch (error) {
      console.error('Error resetting password:', error)
      setToast({ message: 'Failed to reset password', type: 'error' })
    }
  }

  const fetchClientFavorites = async (clientId) => {
    try {
      const response = await api.get(`/clients/${clientId}/favorites`)
      setClientFavorites(response.data.favorites)
      setShowFavoritesModal(true)
    } catch (error) {
      console.error('Error fetching favorites:', error)
      setToast({ message: 'Failed to fetch favorites', type: 'error' })
    }
  }

  const fetchClientActivity = async (clientId) => {
    try {
      const response = await api.get(`/clients/${clientId}/activity`)
      setClientActivity(response.data.activity || [])
      setShowActivityModal(true)
    } catch (error) {
      console.error('Error fetching activity:', error)
      setToast({ message: error.response?.data?.message || 'Failed to fetch activity', type: 'error' })
      setClientActivity([])
    }
  }

  const fetchClientDetails = async (id) => {
    try {
      const response = await api.get(`/clients/${id}`)
      setSelectedClient(response.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching client details:', error)
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
          <h1 className="text-3xl font-bold text-gray-800">Clients</h1>
          <p className="text-gray-600 mt-1">Manage all restaurant clients</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 space-y-4">
        <div className="relative">
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
        <div className="flex items-center gap-4">
          <DateRangePicker
            onDateRangeChange={(range) => {
              setDateRange(range)
              setPage(1)
            }}
          />
          <select
            value={hasFavoritesFilter}
            onChange={(e) => {
              setHasFavoritesFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Clients</option>
            <option value="true">Has Favorites</option>
            <option value="false">No Favorites</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Clients Table */}
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
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Favorites
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
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.total_orders || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {parseFloat(client.total_spent || 0).toFixed(2)} MAD
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Heart className={`w-4 h-4 ${client.favorites_count > 0 ? 'text-pink-500' : 'text-gray-300'}`} />
                      <span className="font-medium">{client.favorites_count || 0}</span>
                      {client.favorites_count > 0 && (
                        <button
                          onClick={() => {
                            fetchClientFavorites(client.id)
                            fetchClientDetails(client.id)
                          }}
                          className="text-xs text-pink-600 hover:text-pink-800 underline ml-2"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          client.is_verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {client.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          client.is_active !== false
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {client.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchClientDetails(client.id)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
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
              {pagination.total} clients
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

      {/* Client Details Modal */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedClient.client.name}
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      if (selectedClient.client.lat && selectedClient.client.lon) {
                        setShowMapModal(true)
                      } else {
                        setToast({ message: 'No location data available', type: 'error' })
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    <MapPin className="w-4 h-4" />
                    View Location
                  </button>
                  <button
                    onClick={() => fetchClientFavorites(selectedClient.client.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200"
                  >
                    <Heart className="w-4 h-4" />
                    Favorites
                  </button>
                  <button
                    onClick={() => fetchClientActivity(selectedClient.client.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Calendar className="w-4 h-4" />
                    Activity
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleVerification(selectedClient.client.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      selectedClient.client.is_verified
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {selectedClient.client.is_verified ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        Unverify
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Verify
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleResetPassword(selectedClient.client.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    <Key className="w-4 h-4" />
                    Reset Password
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{selectedClient.client.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{selectedClient.client.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Verification Status</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedClient.client.is_verified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {selectedClient.client.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                {selectedClient.client.lat && selectedClient.client.lon && (
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="text-xs text-gray-500">
                      {parseFloat(selectedClient.client.lat).toFixed(6)}, {parseFloat(selectedClient.client.lon).toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              {/* Favorites Section */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Sensitive Info</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-sm text-gray-600">Created At</p>
                    <p className="font-medium">{selectedClient.client.created_at ? new Date(selectedClient.client.created_at).toLocaleString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="font-medium">{selectedClient.client.is_active !== 0 ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email Verified</p>
                    <p className="font-medium">{selectedClient.client.is_verified ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Verified</p>
                    <p className="font-medium">{selectedClient.client.isPhoneVerified ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Verification Code</p>
                    <p className="font-medium">{selectedClient.client.verification_code || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reset Password Code</p>
                    <p className="font-medium">{selectedClient.client.resetPasswordCode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Verification Code</p>
                    <p className="font-medium">{selectedClient.client.phoneVerificationCode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Code Expire</p>
                    <p className="font-medium">{selectedClient.client.phoneVerificationCodeExpire ? new Date(selectedClient.client.phoneVerificationCodeExpire).toLocaleString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reset Code Expire</p>
                    <p className="font-medium">{selectedClient.client.resetPasswordExpire ? new Date(selectedClient.client.resetPasswordExpire).toLocaleString() : '-'}</p>
                  </div>
                  {selectedClient.client.adresses && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Addresses</p>
                      <p className="font-medium break-words">{selectedClient.client.adresses}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Favorites Section */}
              {selectedClient.favorites && selectedClient.favorites.length > 0 && (
                <div className="border-t pt-4">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <h3 className="font-medium flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500" />
                        Favorites ({selectedClient.favorites_count || selectedClient.favorites.length})
                      </h3>
                      <span className="text-sm text-gray-500 group-open:hidden">Click to expand</span>
                      <span className="text-sm text-gray-500 hidden group-open:inline">Click to collapse</span>
                    </summary>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedClient.favorites.map((fav) => (
                        <div
                          key={fav.favorite_id}
                          className={`p-3 rounded-lg border ${
                            fav.is_deleted 
                              ? 'bg-gray-50 border-gray-200' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          {fav.is_deleted ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-500">Removed Item</p>
                                <p className="text-xs text-gray-400">Product no longer available</p>
                              </div>
                              <button
                                onClick={async () => {
                                  try {
                                    await api.delete(`/clients/${selectedClient.client.id}/favorites/${fav.favorite_id}`)
                                    fetchClientDetails(selectedClient.client.id)
                                    setToast({ message: 'Broken favorite removed', type: 'success' })
                                  } catch (error) {
                                    setToast({ message: 'Failed to remove favorite', type: 'error' })
                                  }
                                }}
                                className="text-xs text-red-600 hover:text-red-800 underline"
                              >
                                Clear
                              </button>
                            </div>
                          ) : (
                            <div>
                              {fav.product_image && (
                                <img
                                  src={getImageUrl(fav.product_image)}
                                  alt={fav.product_name}
                                  className="w-full h-24 object-cover rounded mb-2"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                  }}
                                />
                              )}
                              <p className="text-sm font-medium text-gray-800">{fav.product_name}</p>
                              <p className="text-xs text-gray-500">
                                {parseFloat(fav.product_price || 0).toFixed(2)} MAD
                              </p>
                              {fav.product_active === 0 && (
                                <span className="text-xs text-red-600">(Inactive)</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-2">Order History</h3>
                <div className="space-y-2">
                  {selectedClient.orders.length === 0 ? (
                    <p className="text-gray-500">No orders yet</p>
                  ) : (
                    selectedClient.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {parseFloat(order.final_price).toFixed(2)} MAD
                          </p>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              order.status === 'Delivered'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Location Map Modal */}
      {showMapModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Client Location</h2>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ClientMap
              lat={selectedClient.client.lat}
              lon={selectedClient.client.lon}
              address={selectedClient.client.adresses}
              name={selectedClient.client.name}
            />
          </div>
        </div>
      )}

      {/* Client Favorites Modal */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Favorite Products</h2>
              <button
                onClick={() => setShowFavoritesModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ClientFavorites favorites={clientFavorites} />
          </div>
        </div>
      )}

      {/* Client Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Activity Log</h2>
              <button
                onClick={() => setShowActivityModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ClientActivityLog activity={clientActivity} />
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

