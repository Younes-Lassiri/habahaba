import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons
const clientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const deliveryManIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export default function ActiveDeliveriesMap({ deliveries }) {
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current && deliveries.length > 0) {
      const map = mapRef.current
      const bounds = []

      deliveries.forEach((delivery) => {
        if (delivery.client_lat && delivery.client_lon) {
          bounds.push([delivery.client_lat, delivery.client_lon])
        }
        if (delivery.delivery_man_lat && delivery.delivery_man_lon) {
          bounds.push([delivery.delivery_man_lat, delivery.delivery_man_lon])
        }
      })

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [deliveries])

  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No active deliveries</p>
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
        {deliveries.map((delivery) => {
          const positions = []
          if (delivery.client_lat && delivery.client_lon) {
            positions.push([delivery.client_lat, delivery.client_lon])
          }
          if (delivery.delivery_man_lat && delivery.delivery_man_lon) {
            positions.push([delivery.delivery_man_lat, delivery.delivery_man_lon])
          }

          return (
            <div key={delivery.id}>
              {delivery.client_lat && delivery.client_lon && (
                <Marker position={[delivery.client_lat, delivery.client_lon]} icon={clientIcon}>
                  <Popup>
                    <div>
                      <p className="font-bold">Client Delivery Address</p>
                      <p>{delivery.customer_name}</p>
                      <p className="text-sm text-gray-600">
                        Order: {delivery.order_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {delivery.client_lat}, {delivery.client_lon}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
              {delivery.delivery_man_lat && delivery.delivery_man_lon && (
                <Marker
                  position={[delivery.delivery_man_lat, delivery.delivery_man_lon]}
                  icon={deliveryManIcon}
                >
                  <Popup>
                    <div>
                      <p className="font-bold">Delivery Man Current Location</p>
                      <p>{delivery.delivery_man_name}</p>
                      <p className="text-sm text-gray-600">
                        Order: {delivery.order_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {delivery.delivery_man_lat}, {delivery.delivery_man_lon}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
              {positions.length === 2 && (
                <Polyline
                  positions={positions}
                  pathOptions={{ color: 'blue', dashArray: '10, 10' }}
                />
              )}
            </div>
          )
        })}
      </MapContainer>
      <div className="mt-2 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Client Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Delivery Man Location</span>
        </div>
      </div>
    </div>
  )
}

