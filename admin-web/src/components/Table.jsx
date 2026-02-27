import { useMemo } from 'react'

export default function Table({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
}) {
  const hasData = data && data.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key || index}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.className || ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={column.key || colIndex}
                    className={`px-6 py-4 whitespace-nowrap ${column.cellClassName || ''}`}
                  >
                    {column.render ? column.render(row, rowIndex) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



