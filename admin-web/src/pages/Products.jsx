import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Plus, Edit, Trash2, Search, CheckSquare, Square, X, Grid, List } from 'lucide-react'
import { getImageUrl } from '../config/api'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    rating: '',
    category_id: '',
    delivery: '',
    promo: false,
    promoValue: '',
    badge: '',
    active: true,
    is_popular: false,
    best_for: '',
    for_cart: true,
  })
  const [imageFile, setImageFile] = useState(null)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [quickEditData, setQuickEditData] = useState({})
  const bestForOptions = [
    { value: 'dinner', label: 'Dinner' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'snacks', label: 'Snacks' },
  ]

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [search, categoryFilter, page])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.categories.filter((c) => c.active))
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (categoryFilter) params.category_id = categoryFilter
      const response = await api.get('/products', { params })
      setProducts(response.data.products)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const formDataToSend = new FormData()
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== '' && formData[key] !== null) {
          formDataToSend.append(key, formData[key])
        }
      })
      if (imageFile) formDataToSend.append('image', imageFile)

      await api.post('/products', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setShowCreateModal(false)
      resetForm()
      fetchProducts()
    } catch (error) {
      console.error('Error creating product:', error)
      alert(error.response?.data?.message || 'Failed to create product')
    }
  }

  const handleUpdate = async (e) => {
  e.preventDefault()
  try {
    const formDataToSend = new FormData()
    
    // Add all fields
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
        formDataToSend.append(key, formData[key])
      }
    })
    
    if (imageFile) formDataToSend.append('image', imageFile)

    console.log('Sending FormData with fields:')
    for (let [key, value] of formDataToSend.entries()) {
      console.log(`${key}: ${value} (type: ${typeof value})`)
    }

    await api.put(`/products/${selectedProduct.id}`, formDataToSend, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    
    setShowEditModal(false)
    setSelectedProduct(null)
    resetForm()
    fetchProducts()
  } catch (error) {
    console.error('Error updating product:', error)
    console.error('Error response:', error.response?.data)
    alert(error.response?.data?.message || 'Failed to update product')
  }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      await api.delete(`/products/${id}`)
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert(error.response?.data?.message || 'Failed to delete product')
    }
  }

  const openEditModal = (product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      rating: product.rating || '',
      category_id: product.category_id,
      delivery: product.delivery || '',
      promo: product.promo === 1 || product.promo === true,
      promoValue: product.promoValue || '',
      badge: product.badge || '',
      active: product.active !== undefined ? (product.active === 1 || product.active === true) : true,
      is_popular: product.is_popular === 1 || product.is_popular === true,
      best_for: product.best_for || '',
      for_cart: product.for_cart === 1 || product.for_cart === true,
    })
    setImageFile(null)
    setShowEditModal(true)
  }

  const handleToggleActive = async (id, currentActive) => {
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('active', (!currentActive) ? 'true' : 'false')
      
      await api.put(`/products/${id}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      fetchProducts()
    } catch (error) {
      console.error('Error toggling active status:', error)
      alert(error.response?.data?.message || 'Failed to update active status')
    }
  }

  const handleToggleForCart = async (id, currentValue) => {
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('for_cart', (!currentValue) ? 'true' : 'false')

      await api.put(`/products/${id}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      fetchProducts()
    } catch (error) {
      console.error('Error toggling for_cart status:', error)
      alert(error.response?.data?.message || 'Failed to update cart visibility')
    }
  }

  const handleQuickEdit = (product, field, value) => {
    setEditingProduct({ id: product.id, field })
    setQuickEditData({ ...quickEditData, [product.id]: { ...quickEditData[product.id], [field]: value } })
  }

  const saveQuickEdit = async (productId) => {
    try {
      const edits = quickEditData[productId]
      if (!edits || Object.keys(edits).length === 0) {
        setEditingProduct(null)
        return
      }

      const formDataToSend = new FormData()
      Object.keys(edits).forEach(key => {
        formDataToSend.append(key, edits[key])
      })

      await api.put(`/products/${productId}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      setEditingProduct(null)
      setQuickEditData({})
      fetchProducts()
    } catch (error) {
      console.error('Error saving quick edit:', error)
      alert(error.response?.data?.message || 'Failed to save changes')
    }
  }

  const handleBulkAction = async (action, value) => {
    if (selectedProducts.length === 0) {
      alert('Please select at least one product')
      return
    }

    try {
      const updates = {}
      if (action === 'active') {
        updates.active = value
      } else if (action === 'category') {
        updates.category_id = value
      }

      await api.post('/products/bulk-update', {
        product_ids: selectedProducts,
        updates
      })
      
      setSelectedProducts([])
      fetchProducts()
      alert(`${selectedProducts.length} product(s) updated successfully`)
    } catch (error) {
      console.error('Error performing bulk action:', error)
      alert(error.response?.data?.message || 'Failed to perform bulk action')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      rating: '',
      category_id: '',
      delivery: '',
      promo: false,
      promoValue: '',
      badge: '',
      active: true,
      is_popular: false,
      best_for: '',
      for_cart: true,
    })
    setImageFile(null)
  }

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-800">Products</h1>
          <p className="text-gray-600 mt-1">Manage restaurant products</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 space-y-4">
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
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>
            <div className="w-px bg-gray-300"></div>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-800">
              {selectedProducts.length} product(s) selected
            </span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => handleBulkAction('active', true)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('active', false)}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Deactivate
              </button>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAction('category', e.target.value)
                    e.target.value = ''
                  }
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">Change Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSelectedProducts([])}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const isSelected = selectedProducts.includes(product.id)
            const isEditing = editingProduct?.id === product.id
            const productActive = product.active !== undefined ? (product.active === 1 || product.active === true) : true
            
            return (
              <div
                key={product.id}
                className={`bg-white rounded-lg shadow-md border-2 overflow-hidden ${
                  isSelected ? 'border-primary-500' : 'border-gray-200'
                }`}
              >
                {/* Selection Checkbox */}
                <div className="p-2 bg-gray-50 border-b flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleProductSelection(product.id)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleForCart(product.id, product.for_cart === 1 || product.for_cart === true)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        product.for_cart === 1 || product.for_cart === true
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title="Toggle visibility in cart"
                    >
                      {product.for_cart === 1 || product.for_cart === true ? 'In Cart' : 'Hidden'}
                    </button>
                    <button
                      onClick={() => handleToggleActive(product.id, productActive)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        productActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                      title="Click to toggle active status"
                    >
                      {productActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {product.image ? (
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
                    {product.promo && product.promo === 1 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                          -{product.promoValue}%
                        </span>
                      ): null}
                    {product.is_popular && product.is_popular === 1 ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          Popular
                        </span>
                      ) : null}
                  </div>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {product.description}
                  </p>
                  
                  {/* Quick Edit Price */}
                  <div className="flex items-center justify-between mb-2">
                    {isEditing && editingProduct.field === 'price' ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          step="0.01"
                          value={quickEditData[product.id]?.price || product.price}
                          onChange={(e) => handleQuickEdit(product, 'price', e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => saveQuickEdit(product.id)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(null)
                            setQuickEditData({})
                          }}
                          className="px-2 py-1 bg-gray-200 rounded text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p 
                        className="text-xl font-bold text-primary-600 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        onClick={() => handleQuickEdit(product, 'price', product.price)}
                        title="Click to edit price"
                      >
                        {parseFloat(product.price).toFixed(2)} MAD
                      </p>
                    )}
                    <p className="text-sm text-gray-500">{product.category_name}</p>
                  </div>

                  {/* Quick Edit Category */}
                  <div className="mb-2">
                    {isEditing && editingProduct.field === 'category_id' ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={quickEditData[product.id]?.category_id || product.category_id}
                          onChange={(e) => handleQuickEdit(product, 'category_id', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => saveQuickEdit(product.id)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(null)
                            setQuickEditData({})
                          }}
                          className="px-2 py-1 bg-gray-200 rounded text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p 
                        className="text-sm text-gray-500 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded inline-block"
                        onClick={() => handleQuickEdit(product, 'category_id', product.category_id)}
                        title="Click to change category"
                      >
                        {product.category_name}
                      </p>
                    )}
                  </div>

                  {/* Quick Edit Best For */}
                  <div className="mb-2">
                    {isEditing && editingProduct.field === 'best_for' ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={quickEditData[product.id]?.best_for || product.best_for || ''}
                          onChange={(e) => handleQuickEdit(product, 'best_for', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        >
                          <option value="">Select...</option>
                          {bestForOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => saveQuickEdit(product.id)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(null)
                            setQuickEditData({})
                          }}
                          className="px-2 py-1 bg-gray-200 rounded text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p
                        className="text-sm text-gray-500 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded inline-block"
                        onClick={() => handleQuickEdit(product, 'best_for', product.best_for || '')}
                        title="Click to change best for"
                      >
                        {product.best_for || '—'}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm"
                    >
                      <Edit className="w-4 h-4 inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase font-medium border-b border-gray-200">
              <tr>
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="text-gray-500 hover:text-gray-700">
                    {selectedProducts.length === products.length && products.length > 0 ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Best For</th>
                <th className="p-4">Price</th>
                <th className="p-4">Status</th>
                <th className="p-4">For Cart</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const isSelected = selectedProducts.includes(product.id)
                const isEditing = editingProduct?.id === product.id
                const productActive = product.active !== undefined ? (product.active === 1 || product.active === true) : true
                
                return (
                  <tr key={product.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="p-4">
                      <button onClick={() => toggleProductSelection(product.id)} className="text-primary-600 hover:text-primary-800">
                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.image ? (
                            <img src={getImageUrl(product.image)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{product.name}</p>
                          <div className="flex gap-2 mt-1">
                            {product.promo && (
                              <span className="text-xs bg-red-100 text-red-800 px-1.5 rounded">-{product.promoValue}%</span>
                            )}
                            {product.is_popular && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 rounded">Popular</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {isEditing && editingProduct.field === 'category_id' ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={quickEditData[product.id]?.category_id || product.category_id}
                            onChange={(e) => handleQuickEdit(product, 'category_id', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                          <button onClick={() => saveQuickEdit(product.id)} className="text-green-600"><CheckSquare className="w-4 h-4"/></button>
                          <button onClick={() => { setEditingProduct(null); setQuickEditData({}) }} className="text-gray-500"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <span 
                          onClick={() => handleQuickEdit(product, 'category_id', product.category_id)}
                          className="cursor-pointer hover:text-primary-600 border-b border-dashed border-gray-300 hover:border-primary-600"
                        >
                          {product.category_name}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {isEditing && editingProduct.field === 'best_for' ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={quickEditData[product.id]?.best_for || product.best_for || ''}
                            onChange={(e) => handleQuickEdit(product, 'best_for', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          >
                            <option value="">Select...</option>
                            {bestForOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <button onClick={() => saveQuickEdit(product.id)} className="text-green-600"><CheckSquare className="w-4 h-4"/></button>
                          <button onClick={() => { setEditingProduct(null); setQuickEditData({}) }} className="text-gray-500"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <span 
                          onClick={() => handleQuickEdit(product, 'best_for', product.best_for || '')}
                          className="cursor-pointer hover:text-primary-600 border-b border-dashed border-gray-300 hover:border-primary-600"
                        >
                          {product.best_for || '—'}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {isEditing && editingProduct.field === 'price' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={quickEditData[product.id]?.price || product.price}
                            onChange={(e) => handleQuickEdit(product, 'price', e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                          <button onClick={() => saveQuickEdit(product.id)} className="text-green-600"><CheckSquare className="w-4 h-4"/></button>
                          <button onClick={() => { setEditingProduct(null); setQuickEditData({}) }} className="text-gray-500"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <span 
                          onClick={() => handleQuickEdit(product, 'price', product.price)}
                          className="font-medium text-gray-900 cursor-pointer hover:text-primary-600 border-b border-dashed border-gray-300 hover:border-primary-600"
                        >
                          {parseFloat(product.price).toFixed(2)} MAD
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(product.id, productActive)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          productActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {productActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleForCart(product.id, product.for_cart === 1 || product.for_cart === true)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          product.for_cart === 1 || product.for_cart === true
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                        title="Toggle visibility in cart"
                      >
                        {product.for_cart === 1 || product.for_cart === true ? 'In Cart' : 'Hidden'}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditModal(product)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.pages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal - Similar structure to Categories */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {showCreateModal ? 'Add Product' : 'Edit Product'}
            </h2>
            <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Delivery Time</label>
                  <input
                    type="text"
                    value={formData.delivery}
                    onChange={(e) => setFormData({ ...formData, delivery: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 30-45 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Badge</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Popular, New"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.promo}
                    onChange={(e) => setFormData({ ...formData, promo: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm">Promo</label>
                </div>
                {formData.promo && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.promoValue}
                      onChange={(e) => setFormData({ ...formData, promoValue: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">Popular Product</label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Best For</label>
                <select
                  value={formData.best_for}
                  onChange={(e) => setFormData({ ...formData, best_for: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select...</option>
                  <option value="dinner">Dinner</option>
                  <option value="lunch">Lunch</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="snacks">Snacks</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">Active</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.for_cart}
                  onChange={(e) => setFormData({ ...formData, for_cart: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">Show in Cart</label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Image {showEditModal && '(leave empty to keep current)'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {showCreateModal ? 'Create' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                    setSelectedProduct(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

