import { useState, useEffect } from 'react'
import { Clock, Download, FileText, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import Table from '../Table'
import Pagination from '../Pagination'
import { usePagination } from '../../hooks/usePagination'

export default function ExportHistory() {
  const [exports, setExports] = useState([])
  const [loading, setLoading] = useState(true)
  const { page, totalPages, total, goToPage, updateTotal } = usePagination()

  useEffect(() => {
    fetchHistory()
  }, [page])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await api.get('/exports/history', { params: { page, limit: 20 } })
      setExports(response.data.exports || [])
      if (response.data.pagination) {
        updateTotal(response.data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching export history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (exportId) => {
    try {
      const response = await api.get(`/exports/${exportId}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `export_${exportId}.${response.data.type.split('/')[1]}`)
      link.click()
    } catch (error) {
      console.error('Error downloading export:', error)
    }
  }

  const handleDelete = async (exportId) => {
    if (!confirm('Delete this export record?')) return

    try {
      await api.delete(`/exports/${exportId}`)
      fetchHistory()
    } catch (error) {
      console.error('Error deleting export:', error)
    }
  }

  const getFormatIcon = (format) => {
    switch (format?.toLowerCase()) {
      case 'csv':
      case 'pdf':
      case 'json':
        return FileText
      case 'xlsx':
      case 'excel':
        return FileText
      default:
        return FileText
    }
  }

  const columns = [
    {
      key: 'filename',
      header: 'File Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{row.filename}</span>
        </div>
      ),
    },
    {
      key: 'format',
      header: 'Format',
      render: (row) => (
        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium uppercase">
          {row.format}
        </span>
      ),
    },
    {
      key: 'records',
      header: 'Records',
      render: (row) => <span>{row.record_count || 0}</span>,
    },
    {
      key: 'created_at',
      header: 'Exported At',
      render: (row) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{new Date(row.created_at).toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload(row.id)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Download"
          >
            <Download className="w-4 h-4 text-primary-600" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Export History</h3>
      <Table
        columns={columns}
        data={exports}
        loading={loading}
        emptyMessage="No export history"
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



