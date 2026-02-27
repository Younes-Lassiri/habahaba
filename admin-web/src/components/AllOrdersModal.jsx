import { useState } from 'react'
import { X, Search, Filter, Package, Clock, Truck, CheckCircle, AlertCircle, User, MapPin, DollarSign } from 'lucide-react'
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

export default function AllOrdersModal({ isOpen, onClose, orders }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'Preparing':
        return <Package className="w-4 h-4 text-blue-600" />
      case 'OutForDelivery':
        return <Truck className="w-4 h-4 text-orange-600" />
      case 'Delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'Cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Package className="w-4 h-4 text-gray-600" />
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

  // Calculate center point for all orders with coordinates
  const getMapCenter = () => {
    const ordersWithCoords = orders.filter(order => order.lat && order.lon);
    if (ordersWithCoords.length === 0) {
      return [31.7917, -7.0926]; // Default to Morocco
    }
    
    const avgLat = ordersWithCoords.reduce((sum, order) => sum + parseFloat(order.lat), 0) / ordersWithCoords.length;
    const avgLon = ordersWithCoords.reduce((sum, order) => sum + parseFloat(order.lon), 0) / ordersWithCoords.length;
    
    return [avgLat, avgLon];
  };

  const mapCenter = getMapCenter();

  const getMapIcon = (status) => {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Orders Map</h2>
              <p className="text-sm text-gray-500">Display all orders with status on interactive map</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Map Only */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Map Container */}
          <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
            {orders.filter((order) => (order.lat && order.lon)).length === 0 ? (
              <div className="h-full bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">No orders with location data to display on map</p>
                  <p className="text-sm text-gray-400 mt-1">Orders need GPS coordinates to be shown on the map</p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {orders.map((order) => (
                  order.lat && order.lon ? (
                    <Marker
                      key={order.id}
                      position={[order.lat, order.lon]}
                      icon={getMapIcon(order.status)}
                    >
                      <Popup>
                        <div className="w-64">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                order.status === 'Pending' ? 'bg-yellow-500' :
                                order.status === 'Preparing' ? 'bg-blue-500' :
                                order.status === 'OutForDelivery' ? 'bg-orange-500' :
                                order.status === 'Delivered' ? 'bg-green-500' :
                                'bg-red-500'
                              }`}></div>
                              <span className="text-xs font-semibold text-gray-700">{order.order_number}</span>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                          
                          {/* Content */}
                          <div className="space-y-3">
                            {/* Customer Info */}
                            <div className="flex items-start gap-2">
                              <User className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{order.customer_name || 'Unknown Customer'}</p>
                                <p className="text-xs text-gray-500">{order.customer_phone}</p>
                              </div>
                            </div>
                            
                            {/* Address */}
                            {order.delivery_address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                <p className="text-xs text-gray-600 flex-1 leading-relaxed">{order.delivery_address}</p>
                              </div>
                            )}
                            
                            {/* Driver Info */}
                            {order.delivery_man_name && (
                              <div className="flex items-start gap-2">
                                <Truck className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-600">Driver: <span className="font-medium">{order.delivery_man_name}</span></p>
                                </div>
                              </div>
                            )}
                            
                            {/* Price and Date */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-indigo-500" />
                                <span className="text-sm font-bold text-indigo-600">{parseFloat(order.final_price).toFixed(2)} MAD</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </p>
                                {order.delivered_at && (
                                  <p className="text-xs text-green-600 font-medium">
                                    Delivered: {new Date(order.delivered_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                ))}
              </MapContainer>
            )}
          </div>

          {/* Map Legend */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
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

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {orders.filter(order => order.lat && order.lon).length} orders with location data
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
