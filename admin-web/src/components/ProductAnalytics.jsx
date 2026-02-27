import { Package, TrendingUp, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ProductAnalytics({ analytics }) {
  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No analytics data available</p>
      </div>
    )
  }

  const monthlyChartData = analytics.monthlySales?.map((item) => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    quantity: item.quantity_sold,
    orders: item.order_count,
  })) || []

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.salesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Quantity Sold</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.totalQuantitySold}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">
                {parseFloat(analytics.totalRevenue).toFixed(2)} MAD
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg per Sale</p>
              <p className="text-2xl font-bold text-gray-800">
                {analytics.salesCount > 0
                  ? (parseFloat(analytics.totalRevenue) / analytics.salesCount).toFixed(2)
                  : 0}{' '}
                MAD
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Sales Chart */}
      {monthlyChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Sales (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quantity" fill="#0ea5e9" name="Quantity Sold" />
              <Bar dataKey="orders" fill="#10b981" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

