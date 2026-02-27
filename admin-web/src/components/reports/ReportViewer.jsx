import RevenueChart from './RevenueChart'
import OrderAnalytics from './OrderAnalytics'
import { FileText } from 'lucide-react'
import EmptyState from '../EmptyState'

export default function ReportViewer({ reportType, data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12">
        <EmptyState
          icon="empty"
          title="No Report Data"
          description="Select filters and generate a report to view data"
        />
      </div>
    )
  }

  const renderReport = () => {
    switch (reportType) {
      case 'revenue':
        return <RevenueChart data={data} />
      case 'orders':
        return <OrderAnalytics data={data} />
      case 'products':
        return (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Product Performance</h3>
            <p className="text-gray-600">Product performance report coming soon...</p>
          </div>
        )
      case 'clients':
        return (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Client Analytics</h3>
            <p className="text-gray-600">Client analytics report coming soon...</p>
          </div>
        )
      case 'delivery':
        return (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Delivery Performance</h3>
            <p className="text-gray-600">Delivery performance report coming soon...</p>
          </div>
        )
      default:
        return (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <p className="text-gray-600">Select a report type to view data</p>
          </div>
        )
    }
  }

  return <div className="space-y-6">{renderReport()}</div>
}



