import { useEffect, useState } from 'react'
import api from '../api/axios'
import { ADMIN_API_BASE_URL } from '../config/api'
import { Settings as SettingsIcon, User, Lock, Mail, CreditCard, Palette, Database, FileText, MapPin, Clock } from 'lucide-react'
import RestaurantLocation from '../components/settings/RestaurantLocation'
import OperatingHoursSettings from '../components/settings/OperatingHoursSettings'

export default function Settings() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile')
      setAdmin(response.data.admin)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'restaurant', label: 'Restaurant', icon: MapPin },
    { id: 'hours', label: 'Hours', icon: Clock },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your admin account and system preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
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
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Profile */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-800">Admin Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <p className="text-lg font-medium text-gray-800">{admin?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <p className="text-lg font-medium text-gray-800">{admin?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
              <p className="text-lg font-medium text-gray-800 capitalize">{admin?.role}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
              <span
                className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  admin?.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {admin?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {admin?.last_login && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Last Login
                </label>
                <p className="text-lg font-medium text-gray-800">
                  {new Date(admin.last_login).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-800">System Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                API Base URL
              </label>
              <p className="text-sm text-gray-800 font-mono bg-gray-50 p-2 rounded break-all">
                {ADMIN_API_BASE_URL}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Admin Panel Version
              </label>
              <p className="text-sm text-gray-800">1.0.0</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Database
              </label>
              <p className="text-sm text-gray-800">MySQL</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'restaurant' && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <RestaurantLocation />
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <OperatingHoursSettings />
        </div>
      )}
    </div>
  )
}

