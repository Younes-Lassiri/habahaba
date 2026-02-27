import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'
import { Search, Plus, Minus, Image as ImageIcon, Edit2, Trash2, Eye, Upload, X, Calendar, DollarSign, Package, Users, TrendingUp } from 'lucide-react'

import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import { getImageUrl } from '../config/api'

export default function Offers() {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [offers, setOffers] = useState([])
  const [filteredOffers, setFilteredOffers] = useState([])
  const [showOfferDetails, setShowOfferDetails] = useState(false)
  const [offerDetails, setOfferDetails] = useState(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [editingOffer, setEditingOffer] = useState(null)

  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [offerSearchTerm, setOfferSearchTerm] = useState('')
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const fileInputRef = useRef(null)

  // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
  const getDefaultStartDate = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };

  const getDefaultEndDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percentage',
    discount: '',
    description: '',
    start_at: getDefaultStartDate(),
    end_at: getDefaultEndDate(),
    is_active: true,
    products: []
  })
  const [productLimits, setProductLimits] = useState({})

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      console.log('Fetching offers and products...')
      const [offersRes, productsRes] = await Promise.allSettled([
        api.get('/offers'),
        api.get('/products')
      ])

      console.log('Offers response:', offersRes)
      console.log('Products response:', productsRes)

      if (offersRes.status === 'fulfilled') {
        setOffers(offersRes.value.data.offers || [])
        setFilteredOffers(offersRes.value.data.offers || [])
      } else {
        console.error('Offers API failed:', offersRes.reason)
        // Set empty array to prevent crashes
        setOffers([])
        setFilteredOffers([])
      }

      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value.data.products || [])
        setFilteredProducts(productsRes.value.data.products || [])
      } else {
        console.error('Products API failed:', productsRes.reason)
        // Set empty array to prevent crashes
        setProducts([])
        setFilteredProducts([])
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      // Set empty arrays to prevent crashes
      setOffers([])
      setFilteredOffers([])
      setProducts([])
      setFilteredProducts([])
      setLoading(false)
    }
  }

  const viewOfferDetails = async (offerId) => {
    try {
      setOfferDetails(null)
      const res = await api.get(`/offers/${offerId}`)
      setOfferDetails(res.data)
      setShowOfferDetails(true)
    } catch (e) {
      console.error('Error fetching offer details:', e)
      alert('Failed to load offer details')
    }
  }

  const editOffer = (offer) => {
    setEditingOffer(offer)
    setFormData({
      name: offer.name,
      discount_type: offer.discount_type,
      discount: offer.discount,
      description: offer.description,
      start_at: offer.start_at ? new Date(offer.start_at).toISOString().slice(0, 16) : getDefaultStartDate(),
      end_at: offer.end_at ? new Date(offer.end_at).toISOString().slice(0, 16) : getDefaultEndDate(),
      is_active: offer.is_active,
      products: []
    })
    setProductLimits({})
    setImagePreview(offer.image || '')
    setSelectedImage(null)
    setShowOfferForm(true)
  }

  const deleteOffer = async (offerId) => {
    if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/offers/${offerId}`)
      alert('Offer deleted successfully')
      fetchAllData()
    } catch (error) {
      console.error('Error deleting offer:', error)
      alert('Failed to delete offer')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)

      // Create FormData for file upload
      const submitData = new FormData()
      submitData.append('name', formData.name)
      submitData.append('discount_type', formData.discount_type)
      submitData.append('discount', formData.discount)
      submitData.append('description', formData.description)
      submitData.append('start_at', formData.start_at)
      submitData.append('end_at', formData.end_at)
      submitData.append('is_active', formData.is_active ? '1' : '0');

      // Add products with limits
      const productsWithLimits = formData.products.map(product => ({
        id: product.id,
        limited_use: productLimits[product.id] || null
      }))
      submitData.append('offer_products', JSON.stringify(productsWithLimits))

      // Add image if selected
      if (selectedImage) {
        submitData.append('image', selectedImage)
      }

      if (editingOffer) {
        await api.put(`/offers/${editingOffer.id}`, submitData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        alert('Offer updated successfully!')
      } else {
        await api.post('/create-offer', submitData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        alert('Offer created successfully!')
      }

      resetForm()
      fetchAllData()
    } catch (error) {
      console.error('Error saving offer:', error)
      alert('Failed to save offer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(term.toLowerCase()) ||
      product.category?.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredProducts(filtered)
  }

  const handleOfferSearch = (term) => {
    setOfferSearchTerm(term)
    const filtered = offers.filter(offer =>
      offer.name.toLowerCase().includes(term.toLowerCase()) ||
      offer.discount_type.toLowerCase().includes(term.toLowerCase()) ||
      offer.status.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredOffers(filtered)
  }

  const handleAddProduct = (product) => {
    if (!formData.products.find(p => p.id === product.id)) {
      setFormData(prev => ({
        ...prev,
        products: [...prev.products, product]
      }))
    }
    setShowProductSelector(false)
    setSearchTerm('')
    setFilteredProducts(products)
  }

  const handleRemoveProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId)
    }))
    // Remove limit for this product
    const newLimits = { ...productLimits }
    delete newLimits[productId]
    setProductLimits(newLimits)
  }

  const handleLimitChange = (productId, value) => {
    setProductLimits(prev => ({
      ...prev,
      [productId]: value ? parseInt(value) : ''
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      discount_type: 'percentage',
      discount: '',
      description: '',
      start_at: getDefaultStartDate(),
      end_at: getDefaultEndDate(),
      is_active: true,
      products: []
    })
    setProductLimits({})
    setSelectedImage(null)
    setImagePreview('')
    setEditingOffer(null)
    setShowOfferForm(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Inactive': 'bg-gray-100 text-gray-700 border-gray-200',
      'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
      'Expired': 'bg-red-100 text-red-700 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Offers Management</h1>
          <p className="text-gray-600 mt-1">Create and manage promotional offers</p>
        </div>
        <Button
          onClick={() => setShowOfferForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Offer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Offers</p>
              <p className="text-2xl font-bold text-gray-800">{offers.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Offers</p>
              <p className="text-2xl font-bold text-green-600">
                {offers.filter(o => o.status === 'Active').length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-gray-800">
                {offers.reduce((sum, o) => sum + (o.total_usage || 0), 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue Impact</p>
              <p className="text-2xl font-bold text-gray-800">
                {(offers && offers.length > 0 ? offers.reduce((sum, o) => sum + (parseFloat(o.total_revenue_impact) || 0), 0) : 0).toFixed(2)} MAD
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search offers by name, type, or status..."
              value={offerSearchTerm}
              onChange={(e) => handleOfferSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
            <p className="text-gray-500 mt-2">Loading offers...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No offers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impact</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {offer.image ? (
                          <img
                            src={offer.image.startsWith('http') ? offer.image : `https://haba-haba-api.ubua.cloud/${offer.image}`}
                            alt={offer.name}
                            className="w-10 h-10 object-cover rounded"
                            onError={(e) => {
                              console.log('Image failed to load:', offer.image);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center" style={{ display: offer.image ? 'none' : 'flex' }}>
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{offer.name}</p>
                          <p className="text-sm text-gray-500">{offer.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                        {offer.discount_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">
                        {offer.discount_type === 'percentage' ? `${offer.discount}%` : `${offer.discount} MAD`}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(offer.status)}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <div className="space-y-1">
                        <p>Start: {offer.start_at ? new Date(offer.start_at).toLocaleDateString() : '-'}</p>
                        <p>End: {offer.end_at ? new Date(offer.end_at).toLocaleDateString() : '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {offer.products_count || 0}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {offer.total_usage || 0}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      {parseFloat(offer.total_revenue_impact || 0).toFixed(2)} MAD
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewOfferDetails(offer.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => editOffer(offer)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Edit Offer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteOffer(offer.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete Offer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Offer Form Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
              </h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promotion Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Summer Sale, Weekend Special..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={formData.discount_type === 'percentage' ? '15' : '5.00'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promotion Image
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="space-y-3">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Offer preview"
                          className="w-full h-32 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={handleUploadClick}
                        className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-primary-400 transition-colors"
                      >
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload image</p>
                        <p className="text-xs text-gray-400">PNG, JPG, JPEG up to 5MB</p>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUploadClick}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Image
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe this promotion..."
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Products in Promotion ({formData.products.length})
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProductSelector(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Products
                  </Button>
                </div>

                {formData.products.length > 0 ? (
                  <div className="space-y-3">
                    {formData.products.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">{parseFloat(product.price || 0).toFixed(2)} MAD</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Usage Limit:</label>
                            <input
                              type="number"
                              min="1"
                              value={productLimits[product.id] || ''}
                              onChange={(e) => handleLimitChange(product.id, e.target.value)}
                              placeholder="Unlimited"
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(product.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No products selected</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add Products" to assign products to this promotion</p>
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Activate this promotion immediately
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="primary" disabled={submitting}>
                  {submitting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    editingOffer ? 'Update Offer' : 'Create Offer'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Selector Modal */}
      {showProductSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Select Products</h3>
              <button
                onClick={() => setShowProductSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleAddProduct(product)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg border"
                  >
                    {product.image ? (
                      <img
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{parseFloat(product.price || 0).toFixed(2)} MAD • {product.category}</p>
                    </div>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </button>
                ))}

                {filteredProducts.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No products found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Details Modal */}
      {showOfferDetails && offerDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Offer Details - {offerDetails.offer?.name}</h3>
              <button onClick={() => setShowOfferDetails(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Type:</strong> {offerDetails.offer?.discount_type}</p>
                  <p><strong>Discount:</strong> {offerDetails.offer?.discount}</p>
                  <p><strong>Active:</strong> {offerDetails.offer?.is_active ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p><strong>Start:</strong> {offerDetails.offer?.start_at ? new Date(offerDetails.offer.start_at).toLocaleString() : '-'}</p>
                  <p><strong>End:</strong> {offerDetails.offer?.end_at ? new Date(offerDetails.offer.end_at).toLocaleString() : '-'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Products</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Price</th>
                        <th className="px-3 py-2 text-left">Limited Use</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {offerDetails.products?.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2">{p.product_name}</td>
                          <td className="px-3 py-2">{parseFloat(p.product_price || 0).toFixed(2)} MAD</td>
                          <td className="px-3 py-2">{p.limited_use ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Usage</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left">Customer</th>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Usage Count</th>
                        <th className="px-3 py-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {offerDetails.usage?.map((u) => (
                        <tr key={u.id}>
                          <td className="px-3 py-2">{u.customer_name}</td>
                          <td className="px-3 py-2">{u.product_name}</td>
                          <td className="px-3 py-2">{u.usage_count || 0}</td>
                          <td className="px-3 py-2">{new Date(u.used_at).toLocaleString()}</td>
                        </tr>
                      ))}
                      {(!offerDetails.usage || offerDetails.usage.length === 0) && (
                        <tr><td className="px-3 py-6 text-center text-gray-500" colSpan="4">No usage yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}