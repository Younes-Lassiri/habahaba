import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons for different order statuses
const pendingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const preparingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const outForDeliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const deliveredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const cancelledIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export default function AllOrdersMap({ orders, onStatusFilter }) {
  const mapRef = useRef(null)
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    if (mapRef.current && orders.length > 0) {
      const map = mapRef.current
      const bounds = []

      orders.forEach((order) => {
        if (order.client_lat && order.client_lon) {
          bounds.push([order.client_lat, order.client_lon])
        }
      })

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [orders])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return pendingIcon
      case 'Preparing':
        return preparingIcon
      case 'OutForDelivery':
        return outForDeliveryIcon
      case 'Delivered':
        return deliveredIcon
      case 'Cancelled':
        return cancelledIcon
      default:
        return pendingIcon
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'Preparing':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'OutForDelivery':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'Cancelled':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus)

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})

  const statusFilters = [
    { key: 'all', label: 'All Orders', color: 'bg-gray-500', count: orders.length },
    { key: 'Pending', label: 'Pending', color: 'bg-yellow-500', count: statusCounts.Pending || 0 },
    { key: 'Preparing', label: 'Preparing', color: 'bg-blue-500', count: statusCounts.Preparing || 0 },
    { key: 'OutForDelivery', label: 'Out for Delivery', color: 'bg-orange-500', count: statusCounts.OutForDelivery || 0 },
    { key: 'Delivered', label: 'Delivered', color: 'bg-green-500', count: statusCounts.Delivered || 0 },
    { key: 'Cancelled', label: 'Cancelled', color: 'bg-red-500', count: statusCounts.Cancelled || 0 },
  ]

  if (!orders || orders.length === 0) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-gray-500">No orders to display on map</p>
        </div>
      </div>
    )
  }

  // Default to Morocco if no coordinates
  const defaultCenter = [31.7917, -7.0926]
  const defaultZoom = 6

  return (
    <div className="space-y-4">
      {/* Status Filter Buttons */}
      <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg border border-gray-200">
        {statusFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => {
              setSelectedStatus(filter.key)
              if (onStatusFilter) {
                onStatusFilter(filter.key)
              }
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStatus === filter.key
                ? `${filter.color} text-white shadow-md`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredOrders.map((order) => (
            order.client_lat && order.client_lon && (
              <Marker 
                key={order.id} 
                position={[order.client_lat, order.client_lon]} 
                icon={getStatusIcon(order.status)}
              >
                <Popup>
                  <div className="min-w-56">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${
                        order.status === 'Pending' ? 'bg-yellow-500' :
                        order.status === 'Preparing' ? 'bg-blue-500' :
                        order.status === 'OutForDelivery' ? 'bg-orange-500' :
                        order.status === 'Delivered' ? 'bg-green-500' :
                        'bg-red-500'
                      }`}></div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-gray-800">{order.order_number}</p>
                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                        <p className="text-sm text-gray-600">{order.customer_phone}</p>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Delivery Address:</p>
                        <p className="text-sm text-gray-700">{order.delivery_address}</p>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-lg font-bold text-indigo-600">
                          {parseFloat(order.final_price).toFixed(2)} MAD
                        </p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
                          {order.delivered_at && (
                            <p>Delivered: {new Date(order.delivered_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-semibold text-gray-700 mb-3">Order Status Legend:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Preparing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm text-gray-600">Out for Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Delivered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  )
}
