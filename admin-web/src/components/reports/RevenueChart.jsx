import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import KPICard from '../dashboard/KPICard'

export default function RevenueChart({ data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <p className="text-gray-600">No revenue data available</p>
      </div>
    )
  }

  const chartData = data.dailyRevenue?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: parseFloat(item.revenue || 0),
    orders: item.orders || 0,
  })) || []

  const totalRevenue = data.totalRevenue || 0
  const averageRevenue = data.averageRevenue || 0
  const growth = data.growth || 0
  const previousPeriod = data.previousPeriod || 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={`${parseFloat(totalRevenue).toFixed(2)} MAD`}
          change={`${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
          changeType={growth >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
        />
        <KPICard
          title="Average Daily"
          value={`${parseFloat(averageRevenue).toFixed(2)} MAD`}
          subtitle="Per day average"
          icon={TrendingUp}
        />
        <KPICard
          title="Previous Period"
          value={`${parseFloat(previousPeriod).toFixed(2)} MAD`}
          subtitle="For comparison"
          icon={DollarSign}
        />
        <KPICard
          title="Total Orders"
          value={data.totalOrders || 0}
          subtitle="In period"
          icon={TrendingUp}
        />
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0ea5e9"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue (MAD)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue vs Orders */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Revenue vs Orders</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis yAxisId="left" stroke="#94a3b8" />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="revenue" fill="#0ea5e9" name="Revenue (MAD)" />
            <Bar yAxisId="right" dataKey="orders" fill="#10b981" name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}



