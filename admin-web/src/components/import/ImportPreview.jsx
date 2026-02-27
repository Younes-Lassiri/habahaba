import { FileText } from 'lucide-react'

export default function ImportPreview({ data }) {
  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No data to preview</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>{data.totalRows}</strong> rows found
        </p>
        <p className="text-sm text-gray-600">
          <strong>{data.headers.length}</strong> columns: {data.headers.join(', ')}
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {data.headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.rows.slice(0, 10).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {data.headers.map((header, colIndex) => (
                    <td key={colIndex} className="px-3 py-2 text-gray-700">
                      {row[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.rows.length > 10 && (
          <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 text-center">
            Showing first 10 of {data.rows.length} rows
          </div>
        )}
      </div>
    </div>
  )
}



