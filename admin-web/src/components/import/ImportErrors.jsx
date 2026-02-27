import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default function ImportErrors({ validation }) {
  if (!validation) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No validation performed</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-600">
            {validation.isValid ? 'Valid' : validation.errors.length === 0 ? 'Valid' : 'Invalid'}
          </p>
          <p className="text-xs text-green-600 mt-1">Status</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-600">{validation.errors.length}</p>
          <p className="text-xs text-red-600 mt-1">Errors</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-yellow-600">{validation.warnings.length}</p>
          <p className="text-xs text-yellow-600 mt-1">Warnings</p>
        </div>
      </div>

      {/* Errors */}
      {validation.errors.length > 0 && (
        <div>
          <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Errors ({validation.errors.length})
          </h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-48 overflow-y-auto">
            <div className="space-y-1">
              {validation.errors.slice(0, 20).map((error, index) => (
                <div key={index} className="text-sm text-red-700">
                  <strong>Row {error.row}</strong> - {error.field}: {error.message}
                </div>
              ))}
              {validation.errors.length > 20 && (
                <p className="text-xs text-red-600 mt-2">
                  ... and {validation.errors.length - 20} more errors
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div>
          <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Warnings ({validation.warnings.length})
          </h4>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-48 overflow-y-auto">
            <div className="space-y-1">
              {validation.warnings.slice(0, 20).map((warning, index) => (
                <div key={index} className="text-sm text-yellow-700">
                  <strong>Row {warning.row}</strong> - {warning.field}: {warning.message}
                </div>
              ))}
              {validation.warnings.length > 20 && (
                <p className="text-xs text-yellow-600 mt-2">
                  ... and {validation.warnings.length - 20} more warnings
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {validation.isValid && validation.errors.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-medium">All data is valid and ready to import!</p>
        </div>
      )}
    </div>
  )
}

