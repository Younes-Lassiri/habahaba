import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { Clock, Save, Power, RefreshCw, AlertCircle } from 'lucide-react'
import Button from '../Button'
import Toast from '../Toast'

export default function OperatingHoursSettings() {
  const [hours, setHours] = useState([])
  const [openStatus, setOpenStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [apiResponse, setApiResponse] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Fetching data from /operating-hours...')

      const hoursRes = await api.get('/operating-hours')
      console.log('Full API Response:', hoursRes)
      console.log('Response data:', hoursRes.data)
      console.log('Type of response.data:', typeof hoursRes.data)

      // Save the raw response for debugging
      setApiResponse(hoursRes.data)

      let hoursData = []

      // Check if it's an object that needs to be converted to array
      if (typeof hoursRes.data === 'object' && !Array.isArray(hoursRes.data)) {
        console.log('Converting object to array...')
        console.log('Object keys:', Object.keys(hoursRes.data))

        // Case 1: Object with nested array
        if (hoursRes.data.operating_hours && Array.isArray(hoursRes.data.operating_hours)) {
          hoursData = hoursRes.data.operating_hours
          console.log('Found operating_hours array:', hoursData)
        }
        // Case 2: Object with hours as property
        else if (hoursRes.data.hours && Array.isArray(hoursRes.data.hours)) {
          hoursData = hoursRes.data.hours
          console.log('Found hours array:', hoursData)
        }
        // Case 3: Object where keys are days (0-6)
        else if (Object.keys(hoursRes.data).some(key => !isNaN(key))) {
          // Convert object with numeric keys to array
          hoursData = Object.keys(hoursRes.data)
            .filter(key => !isNaN(key))
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => ({
              day_of_week: parseInt(key),
              ...hoursRes.data[key]
            }))
          console.log('Converted object with numeric keys to array:', hoursData)
        }
        // Case 4: Object where keys are day names
        else if (Object.keys(hoursRes.data).some(key =>
          ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].includes(key.toLowerCase())
        )) {
          const dayMap = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
          }

          hoursData = Object.entries(hoursRes.data)
            .filter(([key]) => dayMap[key.toLowerCase()] !== undefined)
            .map(([key, value]) => ({
              day_of_week: dayMap[key.toLowerCase()],
              ...value
            }))
            .sort((a, b) => a.day_of_week - b.day_of_week)
          console.log('Converted object with day names to array:', hoursData)
        }
        // Case 5: Try to extract any array from the object
        else {
          // Look for any property that is an array
          const arrayKeys = Object.keys(hoursRes.data).filter(key =>
            Array.isArray(hoursRes.data[key])
          )

          if (arrayKeys.length > 0) {
            hoursData = hoursRes.data[arrayKeys[0]]
            console.log(`Found array in property "${arrayKeys[0]}":`, hoursData)
          } else {
            console.log('No array found in object. Raw object:', hoursRes.data)
          }
        }
      }
      // If it's already an array
      else if (Array.isArray(hoursRes.data)) {
        hoursData = hoursRes.data
        console.log('Response is already an array:', hoursData)
      }

      console.log('Final hoursData:', hoursData)
      console.log('Is array:', Array.isArray(hoursData))
      console.log('Length:', hoursData?.length || 0)

      // Transform data to ensure consistent structure
      if (Array.isArray(hoursData) && hoursData.length > 0) {
        const transformedData = hoursData.map((item, index) => {
          // Extract data from various possible structures
          const dayData = {
            day_of_week: item.day_of_week ?? item.day ?? item.day_number ?? index,
            is_closed: item.is_closed ?? item.closed ?? item.isClosed ?? false,
            open_time: item.open_time ?? item.open ?? item.openTime ?? '09:00',
            close_time: item.close_time ?? item.close ?? item.closeTime ?? '17:00'
          }

          // Ensure time format is correct
          if (dayData.open_time && typeof dayData.open_time === 'string') {
            dayData.open_time = dayData.open_time.substring(0, 5) // Keep only HH:MM
          }
          if (dayData.close_time && typeof dayData.close_time === 'string') {
            dayData.close_time = dayData.close_time.substring(0, 5)
          }

          return dayData
        })

        setHours(transformedData)
      } else {
        console.warn('No valid hours data found, initializing empty')
        setHours([])
      }

      // Try to get open status
      try {
        const statusRes = await api.get('/open-status')
        setOpenStatus(statusRes.data?.is_open ?? statusRes.data?.isOpen ?? false)
      } catch (statusError) {
        console.warn('Could not fetch open status:', statusError)
        setOpenStatus(false)
      }

    } catch (error) {
      console.error('Error fetching operating hours:', error)
      console.error('Error response:', error.response?.data)
      setToast({
        message: `Failed to load operating hours: ${error.message}`,
        type: 'error'
      })
      setHours([])
    } finally {
      setLoading(false)
    }
  }

  const handleTimeChange = (index, field, value) => {
    const newHours = [...hours]
    if (newHours[index]) {
      newHours[index][field] = value
      setHours(newHours)
    }
  }

  const handleToggleClosed = (index) => {
    const newHours = [...hours]
    if (newHours[index]) {
      newHours[index].is_closed = !newHours[index].is_closed
      setHours(newHours)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Format data for bulk update
      const updates = hours.map(h => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed
      }))

      console.log('Saving updates:', updates)

      await api.put('/operating-hours/bulk', { hours: updates })
      setToast({ message: 'Operating hours saved successfully', type: 'success' })
    } catch (error) {
      console.error('Error saving hours:', error)
      setToast({
        message: `Failed to save operating hours: ${error.message}`,
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleOpenStatus = async () => {
    try {
      const newStatus = !openStatus
      await api.post('/toggle-open', { is_open: newStatus })
      setOpenStatus(newStatus)
      setToast({
        message: `Restaurant is now ${newStatus ? 'OPEN' : 'CLOSED'}`,
        type: 'success'
      })
    } catch (error) {
      console.error('Error toggling status:', error)
      setToast({
        message: `Failed to update restaurant status: ${error.message}`,
        type: 'error'
      })
    }
  }

  // Initialize with default hours
  const initializeDefaultHours = () => {
    const defaultHours = Array.from({ length: 7 }, (_, index) => ({
      day_of_week: index,
      is_closed: index === 0 || index === 6,
      open_time: '09:00',
      close_time: '17:00'
    }))
    setHours(defaultHours)
    setToast({
      message: 'Initialized with default hours. Click Save to apply.',
      type: 'info'
    })
  }

  // Days mapping
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-600">Loading operating hours...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Manual Override Control */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Power className={`w-5 h-5 ${openStatus ? 'text-green-500' : 'text-red-500'}`} />
              Restaurant Status Override
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              Manually open or close the restaurant regardless of the schedule.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${openStatus
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}>
              Currently {openStatus ? 'OPEN' : 'CLOSED'}
            </span>
            <Button
              onClick={handleToggleOpenStatus}
              variant={openStatus ? 'danger' : 'success'}
            >
              {openStatus ? 'Close Restaurant' : 'Open Restaurant'}
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              Weekly Schedule
            </h3>
            {hours.length === 0 && (
              <Button
                onClick={initializeDefaultHours}
                variant="outline"
                size="sm"
              >
                Initialize Default Hours
              </Button>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || hours.length === 0}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {hours.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Operating Hours Found</h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Unable to load operating hours from the API. The response structure might be different than expected.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={initializeDefaultHours}
                variant="primary"
              >
                Use Default Hours
              </Button>
              <Button
                onClick={fetchData}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Loading
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Close Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {hours.map((day, index) => {
                  const dayIndex = day?.day_of_week ?? index
                  const dayName = days[dayIndex] || `Day ${dayIndex}`

                  return (
                    <tr
                      key={`day-${dayIndex}-${index}`}
                      className={day?.is_closed ? 'bg-gray-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{dayName}</span>
                        <span className="text-xs text-gray-500 block">ID: {dayIndex}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!day?.is_closed}
                            onChange={() => handleToggleClosed(index)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          <span className="ml-3 text-sm font-medium text-gray-700">
                            {day?.is_closed ? 'Closed' : 'Open'}
                          </span>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="time"
                          disabled={day?.is_closed}
                          value={day?.open_time || '09:00'}
                          onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="time"
                          disabled={day?.is_closed}
                          value={day?.close_time || '17:00'}
                          onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}