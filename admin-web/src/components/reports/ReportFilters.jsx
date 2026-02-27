import { Calendar } from 'lucide-react'
import Select from '../Select'
import DateRangePicker from '../DateRangePicker'

export default function ReportFilters({ filters, onFilterChange }) {
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ]

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-800">Date Range</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Quick Select"
          value={filters.dateRange || 'month'}
          onChange={(e) => {
            const range = e.target.value
            onFilterChange({
              ...filters,
              dateRange: range,
              startDate: range === 'custom' ? filters.startDate : null,
              endDate: range === 'custom' ? filters.endDate : null,
            })
          }}
          options={dateRangeOptions}
        />
        {filters.dateRange === 'custom' && (
          <>
            <DateRangePicker
              onDateRangeChange={(range) => {
                onFilterChange({
                  ...filters,
                  startDate: range.start,
                  endDate: range.end,
                })
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}



