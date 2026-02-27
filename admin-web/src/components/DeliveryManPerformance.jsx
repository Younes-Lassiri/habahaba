import { TrendingUp, Clock, CheckCircle, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function DeliveryManPerformance({ performance, earnings }) {
  if (!performance) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No performance data available</p>
        <p className="text-sm mt-2">Performance metrics will appear once the delivery man completes orders.</p>
      </div>
    )
  }

  const performanceCards = [
    {
      title: 'Total Orders',
      value: performance.totalOrders,
      icon: TrendingUp,
      color: 'bg-blue-500',
    },
    {
      title: 'Completed Orders',
      value: performance.completedOrders,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      title: 'Completion Rate',
      value: `${(performance.completionRate || 0).toFixed(1)}%`,
      icon: CheckCircle,
      color: 'bg-purple-500',
    },
    {
      title: 'Avg Delivery Time',
      value: `${parseInt(performance.avgDeliveryTimeMinutes) || 0} min`,
      icon: Clock,
      color: 'bg-orange-500',
    },
    {
      title: 'Total Revenue',
      value: `${parseFloat(performance.totalRevenue || 0).toFixed(2)} MAD`,
      icon: DollarSign,
      color: 'bg-green-600',
    },
  ]

  const earningsChartData = earnings?.earnings?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: parseFloat(item.total_revenue),
    orders: item.order_count,
  })) || []

  return (
    <div className="space-y-6">
      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {performanceCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-2 rounded-full`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Earnings Chart */}
      {earnings && earnings.earnings && earnings.earnings.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Earnings Overview</h3>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-xl font-bold text-gray-800">{earnings.summary.totalOrders}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-gray-800">
                {parseFloat(earnings.summary.totalRevenue).toFixed(2)} MAD
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg per Order</p>
              <p className="text-xl font-bold text-gray-800">
                {parseFloat(earnings.summary.averagePerOrder).toFixed(2)} MAD
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={earningsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#0ea5e9" name="Revenue (MAD)" />
              <Bar dataKey="orders" fill="#10b981" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

