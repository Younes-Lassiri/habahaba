import { useEffect, useState } from 'react'
import { TrendingUp, DollarSign, Users, Tag } from 'lucide-react'
import api from '../../api/axios'
import KPICard from '../dashboard/KPICard'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import LoadingSpinner from '../LoadingSpinner'

export default function PromotionAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await api.get('/promotions/analytics')
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error fetching promotion analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  const chartData = analytics.usageByPromotion?.map((item) => ({
    name: item.name,
    usage: item.usage_count || 0,
    revenue: parseFloat(item.revenue || 0),
  })) || []

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Promotions"
          value={analytics.total_promotions || 0}
          icon={Tag}
        />
        <KPICard
          title="Active Promotions"
          value={analytics.active_promotions || 0}
          icon={Tag}
        />
        <KPICard
          title="Total Usage"
          value={analytics.total_usage || 0}
          icon={Users}
        />
        <KPICard
          title="Revenue Generated"
          value={`${parseFloat(analytics.total_revenue || 0).toFixed(2)} MAD`}
          icon={DollarSign}
        />
      </div>

      {/* Usage Chart */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Promotion Usage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#94a3b8" />
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
            <Bar dataKey="usage" fill="#0ea5e9" name="Usage Count" />
            <Bar dataKey="revenue" fill="#10b981" name="Revenue (MAD)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}



