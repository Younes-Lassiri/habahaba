import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Users, Plus, Shield, Clock, Edit, Trash2, Key } from 'lucide-react'
import AdminList from '../components/admins/AdminList'
import AdminForm from '../components/admins/AdminForm'
import RoleManager from '../components/admins/RoleManager'
import PermissionMatrix from '../components/admins/PermissionMatrix'
import LoginHistory from '../components/admins/LoginHistory'
import { useModal } from '../hooks/useModal'
import Button from '../components/Button'
import Toast from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Admins() {
  const [admins, setAdmins] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('admins') // 'admins', 'roles', 'permissions', 'history'
  const [toast, setToast] = useState(null)
  const { isOpen: showForm, open: openForm, close: closeForm, data: formData } = useModal()
  const { isOpen: showRoles, open: openRoles, close: closeRoles } = useModal()
  const { isOpen: showPermissions, open: openPermissions, close: closePermissions } = useModal()
  const { isOpen: showHistory, open: openHistory, close: closeHistory, data: historyData } = useModal()

  useEffect(() => {
    fetchAdmins()
    fetchRoles()
  }, [])

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admins')
      setAdmins(response.data.admins || [])
    } catch (error) {
      console.error('Error fetching admins:', error)
      setToast({ message: 'Failed to fetch admins', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles')
      setRoles(response.data.roles || [])
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const handleCreate = () => {
    openForm(null)
  }

  const handleEdit = (admin) => {
    openForm(admin)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this admin? This action cannot be undone.')) return

    try {
      await api.delete(`/admins/${id}`)
      setToast({ message: 'Admin deleted successfully', type: 'success' })
      fetchAdmins()
    } catch (error) {
      console.error('Error deleting admin:', error)
      setToast({ message: 'Failed to delete admin', type: 'error' })
    }
  }

  const handleSuccess = () => {
    fetchAdmins()
    closeForm()
  }

  const tabs = [
    { id: 'admins', label: 'Admins', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'history', label: 'Login History', icon: Clock },
  ]

  if (loading && admins.length === 0) {
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
            <Users className="w-8 h-8" />
            Admin Management
          </h1>
          <p className="text-gray-600 mt-1">Manage admin users, roles, and permissions</p>
        </div>
        {activeTab === 'admins' && (
          <Button onClick={handleCreate} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            New Admin
          </Button>
        )}
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

      {/* Tab Content */}
      {activeTab === 'admins' && (
        <AdminList
          admins={admins}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewHistory={(admin) => openHistory(admin)}
          loading={loading}
        />
      )}

      {activeTab === 'roles' && (
        <RoleManager roles={roles} onUpdate={fetchRoles} />
      )}

      {activeTab === 'permissions' && (
        <PermissionMatrix roles={roles} />
      )}

      {activeTab === 'history' && (
        <LoginHistory />
      )}

      {/* Admin Form Modal */}
      {showForm && (
        <AdminForm
          isOpen={showForm}
          onClose={closeForm}
          admin={formData}
          roles={roles}
          onSuccess={handleSuccess}
        />
      )}

      {/* Login History Modal */}
      {showHistory && historyData && (
        <LoginHistory adminId={historyData.id} isModal={true} onClose={closeHistory} />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

