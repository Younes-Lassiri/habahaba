import { useState, useEffect } from 'react'
import { MapPin, Save, Navigation, Upload, Image, ToggleLeft, ToggleRight, Store } from 'lucide-react'
import api from '../../api/axios'
import Button from '../Button'
import Input from '../Input'
import Toast from '../Toast'

export default function RestaurantLocation() {
  const [settings, setSettings] = useState({
    restaurant_name: '',
    restaurant_phone: '',
    restaurant_email: '',
    restaurant_address: '',
    restaurant_latitude: '',
    restaurant_longitude: '',
    base_delivery_fee: 10.00,
    per_km_fee: 2.00,
    max_delivery_distance_km: 20.00,
    min_delivery_fee: 5.00,
    max_delivery_fee: 50.00,
    is_open: true,
    restaurant_logo: '',
    restaurant_home_screen_icon: '',
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [toast, setToast] = useState(null)
  const [geocoding, setGeocoding] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setFetching(true)
      const response = await api.get('/restaurant-settings')
      if (response.data.success && response.data.settings) {
        setSettings({
          restaurant_name: response.data.settings.restaurant_name || '',
          restaurant_phone: response.data.settings.phone || '',
          restaurant_email: response.data.settings.restaurant_email || '',
          restaurant_address: response.data.settings.restaurant_address || '',
          restaurant_latitude: response.data.settings.restaurant_latitude?.toString() || '',
          restaurant_longitude: response.data.settings.restaurant_longitude?.toString() || '',
          base_delivery_fee: response.data.settings.base_delivery_fee || 10.00,
          per_km_fee: response.data.settings.per_km_fee || 2.00,
          max_delivery_distance_km: response.data.settings.max_delivery_distance_km || 20.00,
          min_delivery_fee: response.data.settings.min_delivery_fee || 5.00,
          max_delivery_fee: response.data.settings.max_delivery_fee || 50.00,
          is_open: response.data.settings.is_open !== undefined ? Boolean(response.data.settings.is_open) : true,
          restaurant_logo: response.data.settings.restaurant_logo || '',
          restaurant_home_screen_icon: response.data.settings.restaurant_home_screen_icon || '',
        })
      }
    } catch (error) {
      console.error('Error fetching restaurant settings:', error)
      setToast({ message: 'Failed to load restaurant settings', type: 'error' })
    } finally {
      setFetching(false)
    }
  }

  const handleGeocode = async () => {
    if (!settings.restaurant_address) {
      setToast({ message: 'Please enter an address first', type: 'error' })
      return
    }

    try {
      setGeocoding(true)
      const encodedAddress = encodeURIComponent(settings.restaurant_address)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`
      )
      const data = await response.json()

      if (data && data.length > 0) {
        setSettings({
          ...settings,
          restaurant_latitude: parseFloat(data[0].lat).toFixed(8),
          restaurant_longitude: parseFloat(data[0].lon).toFixed(8),
        })
        setToast({ message: 'Location found successfully!', type: 'success' })
      } else {
        setToast({ message: 'Could not find location for this address', type: 'error' })
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      setToast({ message: 'Failed to geocode address', type: 'error' })
    } finally {
      setGeocoding(false)
    }
  }

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setToast({ message: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)', type: 'error' })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'File size must be less than 5MB', type: 'error' })
      return
    }

    try {
      setUploadingLogo(true)
      const formData = new FormData()
      formData.append('logo', file)

      const response = await api.post('/restaurant-settings/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        setSettings({
          ...settings,
          restaurant_logo: response.data.logo_path
        })
        setToast({ message: 'Restaurant logo uploaded successfully', type: 'success' })
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      setToast({
        message: error.response?.data?.message || 'Failed to upload logo',
        type: 'error'
      })
    } finally {
      setUploadingLogo(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleIconUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/x-icon']
    if (!allowedTypes.includes(file.type)) {
      setToast({ message: 'Please select a valid image file (JPEG, PNG, GIF, WebP, or ICO)', type: 'error' })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'File size must be less than 5MB', type: 'error' })
      return
    }

    try {
      setUploadingIcon(true)
      const formData = new FormData()
      formData.append('icon', file)

      const response = await api.post('/restaurant-settings/icon', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        setSettings({
          ...settings,
          restaurant_home_screen_icon: response.data.icon_path
        })
        setToast({ message: 'Restaurant icon uploaded successfully', type: 'success' })
      }
    } catch (error) {
      console.error('Error uploading icon:', error)
      setToast({
        message: error.response?.data?.message || 'Failed to upload icon',
        type: 'error'
      })
    } finally {
      setUploadingIcon(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      // Validation
      if (!settings.restaurant_latitude || !settings.restaurant_longitude) {
        setToast({ message: 'Please set restaurant location (latitude and longitude)', type: 'error' })
        return
      }

      if (parseFloat(settings.restaurant_latitude) < -90 || parseFloat(settings.restaurant_latitude) > 90) {
        setToast({ message: 'Invalid latitude (must be between -90 and 90)', type: 'error' })
        return
      }

      if (parseFloat(settings.restaurant_longitude) < -180 || parseFloat(settings.restaurant_longitude) > 180) {
        setToast({ message: 'Invalid longitude (must be between -180 and 180)', type: 'error' })
        return
      }

      await api.put('/restaurant-settings', {
        ...settings,
        phone: settings.restaurant_phone, // Map the field name
        restaurant_email: settings.restaurant_email // Include email field
      })
      setToast({ message: 'Restaurant settings saved successfully', type: 'success' })
    } catch (error) {
      console.error('Error saving restaurant settings:', error)
      setToast({
        message: error.response?.data?.message || 'Failed to save settings',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Restaurant Settings</h3>
        </div>

        {/* Restaurant Status */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-4">Restaurant Status</h4>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Restaurant Open/Closed</p>
              <p className="text-xs text-gray-500 mt-1">
                When closed, customers cannot add items to cart
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, is_open: !settings.is_open })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.is_open ? 'bg-green-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.is_open ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
              <span className="sr-only">Toggle restaurant status</span>
            </button>
          </div>

          <div className="mt-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${settings.is_open
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                }`}
            >
              {settings.is_open ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Restaurant is Open
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  Restaurant is Closed
                </>
              )}
            </span>
          </div>
        </div>

        {/* Restaurant Branding */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-4">Restaurant Branding</h4>

          <div className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Logo
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {settings.restaurant_logo ? (
                    <img
                      src={`https://haba-haba-api.ubua.cloud/${settings.restaurant_logo}`}
                      alt="Restaurant Logo"
                      className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-lg border border-gray-300 flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    JPEG, PNG, GIF, or WebP (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Home Screen Icon Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Home Screen Icon
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {settings.restaurant_home_screen_icon ? (
                    <img
                      src={`https://haba-haba-api.ubua.cloud/${settings.restaurant_home_screen_icon}`}
                      alt="Home Screen Icon"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg border border-gray-300 flex items-center justify-center">
                      <Store className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="icon-upload"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/x-icon"
                    onChange={handleIconUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="icon-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    JPEG, PNG, GIF, WebP, or ICO (max 5MB)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    This icon appears next to the restaurant name in the app header
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Restaurant Information */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-4">Restaurant Information</h4>

          <div className="space-y-4">
            <Input
              label="Restaurant Name"
              value={settings.restaurant_name}
              onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
              placeholder="Enter restaurant name"
            />
            <Input
              label="Restaurant Phone"
              value={settings.restaurant_phone}
              onChange={(e) => setSettings({ ...settings, restaurant_phone: e.target.value })}
              placeholder="Enter restaurant phone"
            />
            <Input
              label="Restaurant Email"
              type="email"
              value={settings.restaurant_email}
              onChange={(e) => setSettings({ ...settings, restaurant_email: e.target.value })}
              placeholder="restaurant@example.com"
              helperText="Email address for new order notifications"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Address
              </label>
              <div className="flex gap-2">
                <Input
                  value={settings.restaurant_address}
                  onChange={(e) => setSettings({ ...settings, restaurant_address: e.target.value })}
                  placeholder="Enter full address"
                  className="flex-1"
                />
                <Button
                  onClick={handleGeocode}
                  variant="secondary"
                  loading={geocoding}
                  className="whitespace-nowrap"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Find Location
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter address and click "Find Location" to automatically get coordinates
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude"
                type="number"
                step="0.00000001"
                value={settings.restaurant_latitude}
                onChange={(e) => setSettings({ ...settings, restaurant_latitude: e.target.value })}
                placeholder="e.g., 33.5731"
              />
              <Input
                label="Longitude"
                type="number"
                step="0.00000001"
                value={settings.restaurant_longitude}
                onChange={(e) => setSettings({ ...settings, restaurant_longitude: e.target.value })}
                placeholder="e.g., -7.5898"
              />
            </div>
          </div>
        </div>

        {/* Delivery Fee Settings */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-4">Delivery Fee Calculation</h4>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Base Delivery Fee (MAD)"
                type="number"
                step="0.01"
                value={settings.base_delivery_fee}
                onChange={(e) => setSettings({ ...settings, base_delivery_fee: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Per Kilometer Fee (MAD)"
                type="number"
                step="0.01"
                value={settings.per_km_fee}
                onChange={(e) => setSettings({ ...settings, per_km_fee: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <Input
              label="Maximum Delivery Distance (km)"
              type="number"
              step="0.1"
              value={settings.max_delivery_distance_km}
              onChange={(e) => setSettings({ ...settings, max_delivery_distance_km: parseFloat(e.target.value) || 0 })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Minimum Delivery Fee (MAD)"
                type="number"
                step="0.01"
                value={settings.min_delivery_fee}
                onChange={(e) => setSettings({ ...settings, min_delivery_fee: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Maximum Delivery Fee (MAD)"
                type="number"
                step="0.01"
                value={settings.max_delivery_fee}
                onChange={(e) => setSettings({ ...settings, max_delivery_fee: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Formula:</strong> Delivery Fee = Base Fee + (Distance × Per KM Fee)
              </p>
              <p className="text-xs text-blue-600 mt-2">
                The calculated fee will be clamped between Minimum and Maximum values.
                Orders beyond the maximum distance will be rejected.
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} variant="primary" loading={loading}>
          <Save className="w-4 h-4 mr-2" />
          Save Restaurant Settings
        </Button>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  )
}



