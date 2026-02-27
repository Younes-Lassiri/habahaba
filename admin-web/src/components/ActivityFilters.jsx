import { Filter } from 'lucide-react'
import Select from './Select'
import Input from './Input'
import DateRangePicker from './DateRangePicker'

export default function ActivityFilters({ filters, onFilterChange, className = '' }) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow-md border border-gray-200 space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-800">Filters</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select
          label="Action Type"
          value={filters.actionType || ''}
          onChange={(e) => onFilterChange({ ...filters, actionType: e.target.value })}
          options={[
            { value: '', label: 'All Actions' },
            { value: 'create', label: 'Create' },
            { value: 'update', label: 'Update' },
            { value: 'delete', label: 'Delete' },
            { value: 'login', label: 'Login' },
            { value: 'logout', label: 'Logout' },
          ]}
        />
        <Select
          label="Entity Type"
          value={filters.entityType || ''}
          onChange={(e) => onFilterChange({ ...filters, entityType: e.target.value })}
          options={[
            { value: '', label: 'All Entities' },
            { value: 'order', label: 'Order' },
            { value: 'product', label: 'Product' },
            { value: 'client', label: 'Client' },
            { value: 'delivery_man', label: 'Delivery Man' },
            { value: 'category', label: 'Category' },
          ]}
        />
        <Input
          label="User ID"
          type="number"
          value={filters.userId || ''}
          onChange={(e) => onFilterChange({ ...filters, userId: e.target.value })}
          placeholder="Filter by user ID"
        />
        <div className="flex items-end">
          <DateRangePicker
            onDateRangeChange={(range) => onFilterChange({ ...filters, dateRange: range })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}



