import { useState, useEffect } from 'react'
import api from '../api/axios'
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react'
import ReportBuilder from '../components/reports/ReportBuilder'
import ReportViewer from '../components/reports/ReportViewer'
import ReportFilters from '../components/reports/ReportFilters'
import Button from '../components/Button'
import { useModal } from '../hooks/useModal'
import Toast from '../components/Toast'

export default function Reports() {
  const [reportType, setReportType] = useState('revenue')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    dateRange: 'month',
    startDate: null,
    endDate: null,
  })
  const { isOpen: showBuilder, open: openBuilder, close: closeBuilder } = useModal()
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchReport()
  }, [reportType, filters])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const params = {
        type: reportType,
        date_range: filters.dateRange,
      }
      if (filters.startDate) params.start_date = filters.startDate
      if (filters.endDate) params.end_date = filters.endDate

      const response = await api.get(`/reports/${reportType}`, { params })
      setReportData(response.data)
    } catch (error) {
      console.error('Error fetching report:', error)
      setToast({ message: 'Failed to fetch report data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format = 'csv') => {
    try {
      const params = {
        type: reportType,
        format,
        date_range: filters.dateRange,
      }
      if (filters.startDate) params.start_date = filters.startDate
      if (filters.endDate) params.end_date = filters.endDate

      const response = await api.get(`/reports/${reportType}/export`, {
        params,
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format}`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      setToast({ message: 'Report exported successfully', type: 'success' })
    } catch (error) {
      console.error('Error exporting report:', error)
      setToast({ message: 'Failed to export report', type: 'error' })
    }
  }

  const reportTypes = [
    { value: 'revenue', label: 'Revenue Report', icon: TrendingUp },
    { value: 'orders', label: 'Order Analytics', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Reports & Analytics
          </h1>
          <p className="text-gray-600 mt-1">Generate comprehensive reports and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openBuilder} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Custom Report
          </Button>
          {reportData && (
            <>
              <Button onClick={() => handleExport('csv')} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => handleExport('pdf')} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-800">Report Type</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {reportTypes.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.value}
                onClick={() => setReportType(type.value)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  reportType === type.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="text-sm font-medium text-gray-800">{type.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <ReportFilters filters={filters} onFilterChange={setFilters} />

      {/* Report Viewer */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <ReportViewer reportType={reportType} data={reportData} />
      )}

      {/* Report Builder Modal */}
      <ReportBuilder isOpen={showBuilder} onClose={closeBuilder} />

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}



