import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, Send } from 'lucide-react'
import api from '../api/axios'
import Table from './Table'
import Pagination from './Pagination'
import { usePagination } from '../hooks/usePagination'
import DateRangePicker from './DateRangePicker'

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(null)
  const { page, totalPages, total, goToPage, updateTotal } = usePagination()

  useEffect(() => {
    fetchHistory()
  }, [page, dateRange])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const params = { page, limit: 20 }
      if (dateRange?.start) params.start_date = dateRange.start
      if (dateRange?.end) params.end_date = dateRange.end

      const response = await api.get('/notifications/history', { params })
      setNotifications(response.data.notifications || [])
      if (response.data.pagination) {
        updateTotal(response.data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching notification history:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <span className={row.success ? 'text-green-600' : 'text-red-600'}>
            {row.success ? 'Sent' : 'Failed'}
          </span>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: 'target',
      header: 'Target',
      render: (row) => (
        <span className="text-sm text-gray-600 capitalize">{row.target}</span>
      ),
    },
    {
      key: 'recipients',
      header: 'Recipients',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.success_count || 0} / {row.total_count || 0}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Sent At',
      render: (row) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{new Date(row.created_at).toLocaleString()}</span>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Notification History</h3>
        <DateRangePicker
          onDateRangeChange={setDateRange}
          className="w-auto"
        />
      </div>

      <Table
        columns={columns}
        data={notifications}
        loading={loading}
        emptyMessage="No notification history"
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={20}
          onPageChange={goToPage}
        />
      )}
    </div>
  )
}



