import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom icons
const clientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const deliveryManIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default function OrderMap({ clientLat, clientLon, deliveryManLat, deliveryManLon, clientAddress, deliveryManName }) {
  const hasClientLocation = clientLat && clientLon
  const hasDeliveryManLocation = deliveryManLat && deliveryManLon

  // Calculate center point
  const getCenter = () => {
    if (hasClientLocation && hasDeliveryManLocation) {
      return [
        (parseFloat(clientLat) + parseFloat(deliveryManLat)) / 2,
        (parseFloat(clientLon) + parseFloat(deliveryManLon)) / 2
      ]
    }
    if (hasClientLocation) {
      return [parseFloat(clientLat), parseFloat(clientLon)]
    }
    if (hasDeliveryManLocation) {
      return [parseFloat(deliveryManLat), parseFloat(deliveryManLon)]
    }
    // Default to Morocco center
    return [33.5731, -7.5898]
  }

  const getZoom = () => {
    if (hasClientLocation && hasDeliveryManLocation) {
      return 13
    }
    return 12
  }

  const center = getCenter()
  const zoom = getZoom()

  // Create polyline coordinates if both locations exist
  const polylineCoordinates = []
  if (hasClientLocation && hasDeliveryManLocation) {
    polylineCoordinates.push(
      [parseFloat(clientLat), parseFloat(clientLon)],
      [parseFloat(deliveryManLat), parseFloat(deliveryManLon)]
    )
  }

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Client Location Marker */}
        {hasClientLocation && (
          <Marker
            position={[parseFloat(clientLat), parseFloat(clientLon)]}
            icon={clientIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-red-600">📍 Client Delivery Address</p>
                <p className="mt-1 font-medium">{clientAddress || 'Delivery Address'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Coordinates: {parseFloat(clientLat).toFixed(6)}, {parseFloat(clientLon).toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Delivery Man Location Marker */}
        {hasDeliveryManLocation && (
          <Marker
            position={[parseFloat(deliveryManLat), parseFloat(deliveryManLon)]}
            icon={deliveryManIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-blue-600">🚚 Delivery Man Current Location</p>
                <p className="mt-1 font-medium">{deliveryManName || 'Delivery Man'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Current Coordinates: {parseFloat(deliveryManLat).toFixed(6)}, {parseFloat(deliveryManLon).toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Polyline connecting both locations */}
        {polylineCoordinates.length > 0 && (
          <Polyline
            positions={polylineCoordinates}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </div>
  )
}

