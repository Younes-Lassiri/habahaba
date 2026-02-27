import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { getImageUrl } from '../config/api'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
  })
  const [imageFile, setImageFile] = useState(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.categories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('active', formData.active)
      if (imageFile) formDataToSend.append('image', imageFile)

      await api.post('/categories', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setShowCreateModal(false)
      setFormData({ name: '', description: '', active: true })
      setImageFile(null)
      fetchCategories()
    } catch (error) {
      console.error('Error creating category:', error)
      alert(error.response?.data?.message || 'Failed to create category')
    }
  }

  const handleUpdate = async (e) => {
  e.preventDefault()
  try {
    const formDataToSend = new FormData()
    if (formData.name) formDataToSend.append('name', formData.name)
    if (formData.description !== undefined) formDataToSend.append('description', formData.description)
    if (formData.active !== undefined) formDataToSend.append('active', formData.active ? 'true' : 'false')
    if (imageFile) formDataToSend.append('image', imageFile)

    const response = await api.put(`/categories/${selectedCategory.id}`, formDataToSend, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    // Update the categories list with the returned data
    if (response.data.category) {
      // Update your local state with the updated category
      fetchCategories() // Or update locally without refetching
    }
    
    setShowEditModal(false)
    setSelectedCategory(null)
    setFormData({ name: '', description: '', active: true })
    setImageFile(null)
    
  } catch (error) {
    console.error('Error updating category:', error)
    alert(error.response?.data?.message || 'Failed to update category')
  }
}

  const handleToggleActive = async (id, newActiveStatus) => {
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('active', newActiveStatus ? 'true' : 'false')
      
      await api.put(`/categories/${id}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      fetchCategories()
    } catch (error) {
      console.error('Error toggling active status:', error)
      alert(error.response?.data?.message || 'Failed to update active status')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      await api.delete(`/categories/${id}`)
      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert(error.response?.data?.message || 'Failed to delete category')
    }
  }

  const openEditModal = (category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      active: category.active,
    })
    setImageFile(null)
    setShowEditModal(true)
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
          <h1 className="text-3xl font-bold text-gray-800">Categories</h1>
          <p className="text-gray-600 mt-1">Manage product categories</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-lg shadow-md border-2 border-gray-200 overflow-hidden"
          >
            {category.image && (
              <img
                src={getImageUrl(category.image)}
                alt={category.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-800">{category.name}</h3>
                <button
                  onClick={() => handleToggleActive(category.id, !category.active)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    category.active
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                  title="Click to toggle active status"
                >
                  {category.active ? 'Active' : 'Inactive'}
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-2">{category.description}</p>
              <p className="text-gray-500 text-xs">Products: {category.product_count || 0}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openEditModal(category)}
                  className="flex-1 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm"
                >
                  <Edit className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Add Category</h2>
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
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
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

      {/* Edit Modal */}
      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Edit Category</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
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
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Image (leave empty to keep current)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedCategory(null)
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

