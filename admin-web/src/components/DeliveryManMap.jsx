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

const deliveryManIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export default function DeliveryManMap({ lat, lon, name, lastUpdate }) {
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current && lat && lon) {
      const map = mapRef.current
      map.setView([lat, lon], 15)
    }
  }, [lat, lon])

  if (!lat || !lon) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No location data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={[lat, lon]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lon]} icon={deliveryManIcon}>
            <Popup>
              <div>
                <p className="font-bold">Delivery Man Current Location</p>
                {name && <p>{name}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  {parseFloat(lat).toFixed(6)}, {parseFloat(lon).toFixed(6)}
                </p>
                {lastUpdate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last update: {new Date(lastUpdate).toLocaleString()}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      <div className="text-sm text-gray-600">
        <p>Coordinates: {parseFloat(lat).toFixed(6)}, {parseFloat(lon).toFixed(6)}</p>
        {lastUpdate && (
          <p>Last update: {new Date(lastUpdate).toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}

