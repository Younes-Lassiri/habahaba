import { Package } from 'lucide-react'
import { getImageUrl } from '../config/api'

export default function ClientFavorites({ favorites }) {
  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No favorite products</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {favorites.map((favorite) => (
        <div
          key={favorite.id}
          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
        >
          {favorite.image && (
            <img
              src={getImageUrl(favorite.image)}
              alt={favorite.product_name}
              className="w-16 h-16 object-cover rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          )}
          <div className="flex-1">
            <p className="font-medium text-gray-800">{favorite.product_name}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>{parseFloat(favorite.price).toFixed(2)} MAD</span>
              {favorite.rating && (
                <span>⭐ {parseFloat(favorite.rating).toFixed(1)}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

