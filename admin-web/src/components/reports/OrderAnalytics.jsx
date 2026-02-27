import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ShoppingCart } from 'lucide-react'
import KPICard from '../dashboard/KPICard'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function OrderAnalytics({ data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <p className="text-gray-600">No order analytics data available</p>
      </div>
    )
  }

  const statusData = data.ordersByStatus?.map((item) => ({
    name: item.status,
    value: item.count,
  })) || []

  const paymentData = data.ordersByPayment?.map((item) => ({
    name: item.payment_status,
    value: item.count,
  })) || []

  const dailyOrders = data.dailyOrders?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    orders: item.count,
    revenue: parseFloat(item.revenue || 0),
  })) || []

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Orders"
          value={data.totalOrders || 0}
          icon={ShoppingCart}
        />
        <KPICard
          title="Average Order Value"
          value={`${parseFloat(data.averageOrderValue || 0).toFixed(2)} MAD`}
        />
        <KPICard
          title="Completed Orders"
          value={data.completedOrders || 0}
          change={`${((data.completedOrders / data.totalOrders) * 100 || 0).toFixed(1)}%`}
          changeType="positive"
        />
        <KPICard
          title="Cancelled Orders"
          value={data.cancelledOrders || 0}
          change={`${((data.cancelledOrders / data.totalOrders) * 100 || 0).toFixed(1)}%`}
          changeType="negative"
        />
      </div>

      {/* Orders by Status */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Orders by Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Orders by Payment Status */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Orders by Payment Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={paymentData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {paymentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Orders Trend */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Daily Orders Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyOrders}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend />
            <Bar dataKey="orders" fill="#0ea5e9" name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}



