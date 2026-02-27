import { useEffect, useRef } from 'react'
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

// Custom icon for delivered orders
const deliveredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export default function DeliveredOrdersMap({ deliveredOrders }) {
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current && deliveredOrders.length > 0) {
      const map = mapRef.current
      const bounds = []

      deliveredOrders.forEach((order) => {
        if (order.client_lat && order.client_lon) {
          bounds.push([order.client_lat, order.client_lon])
        }
      })

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [deliveredOrders])

  if (!deliveredOrders || deliveredOrders.length === 0) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-gray-500">No delivered orders to display</p>
        </div>
      </div>
    )
  }

  // Default to Morocco if no coordinates
  const defaultCenter = [31.7917, -7.0926]
  const defaultZoom = 6

  return (
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
        {deliveredOrders.map((order) => (
          order.client_lat && order.client_lon && (
            <Marker 
              key={order.id} 
              position={[order.client_lat, order.client_lon]} 
              icon={deliveredIcon}
            >
              <Popup>
                <div className="min-w-48">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="font-bold text-green-700">Delivered Order</p>
                  </div>
                  <p className="font-semibold text-gray-800">{order.order_number}</p>
                  <p className="text-sm text-gray-600 mb-1">{order.customer_name}</p>
                  <p className="text-sm text-gray-600 mb-2">{order.delivery_address}</p>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-lg font-bold text-indigo-600">
                      {parseFloat(order.final_price).toFixed(2)} MAD
                    </p>
                    <p className="text-xs text-gray-500">
                      Delivered: {new Date(order.delivered_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm font-medium text-gray-700">Delivered Orders</span>
          </div>
          <span className="text-sm font-semibold text-gray-600">
            {deliveredOrders.length} locations
          </span>
        </div>
      </div>
    </div>
  )
}
