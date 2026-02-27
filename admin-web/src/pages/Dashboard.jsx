import { useEffect, useState } from 'react'
import api from '../api/axios'
import {
  ShoppingCart,
  Users,
  Truck,
  DollarSign,
  Clock,
  TrendingUp,
  Package,
  Award,
  ArrowUp,
  ArrowDown,
  Activity,
  MapPin,
  CheckCircle,
  BarChart3,
  X,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import ActiveDeliveriesMap from '../components/ActiveDeliveriesMap'
import DeliveredOrdersMap from '../components/DeliveredOrdersMap'
import AllOrdersModal from '../components/AllOrdersModal'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [topClients, setTopClients] = useState([])
  const [deliveryPerformance, setDeliveryPerformance] = useState(null)
  const [activeDeliveries, setActiveDeliveries] = useState([])
  const [deliveredOrders, setDeliveredOrders] = useState([])
  const [allOrdersForMap, setAllOrdersForMap] = useState([])
  const [showAllOrdersModal, setShowAllOrdersModal] = useState(false)
  const [allOrders, setAllOrders] = useState([])
  const [revenueTrends, setRevenueTrends] = useState(null)
  const [hourlyPerformance, setHourlyPerformance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [statsRes, productsRes, clientsRes, perfRes, deliveriesRes, deliveredRes, allOrdersRes, trendsRes, hourlyRes] = 
        await Promise.allSettled([
          api.get('/dashboard/stats'),
          api.get('/dashboard/top-products', { params: { limit: 5 } }),
          api.get('/dashboard/top-clients', { params: { limit: 5 } }),
          api.get('/dashboard/delivery-performance'),
          api.get('/dashboard/active-deliveries'),
          api.get('/dashboard/delivered-orders', { params: { limit: 20 } }),
          api.get('/orders'),
          api.get('/dashboard/revenue-trends'),
          api.get('/dashboard/hourly-performance'),
        ])

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data.stats)
        setRecentOrders(statsRes.value.data.recentOrders || [])
      } else {
        console.error('Failed to fetch stats:', statsRes.reason)
      }

      if (productsRes.status === 'fulfilled') {
        setTopProducts(productsRes.value.data.products || [])
      } else {
        console.error('Failed to fetch top products:', productsRes.reason)
      }

      if (clientsRes.status === 'fulfilled') {
        setTopClients(clientsRes.value.data.clients || [])
      } else {
        console.error('Failed to fetch top clients:', clientsRes.reason)
      }

      if (perfRes.status === 'fulfilled') {
        setDeliveryPerformance(perfRes.value.data)
      } else {
        console.error('Failed to fetch delivery performance:', perfRes.reason)
      }

      if (deliveriesRes.status === 'fulfilled') {
        setActiveDeliveries(deliveriesRes.value.data.deliveries || [])
      } else {
        console.error('Failed to fetch active deliveries:', deliveriesRes.reason)
      }

      if (trendsRes.status === 'fulfilled') {
        setRevenueTrends(trendsRes.value.data)
      } else {
        console.error('Failed to fetch revenue trends:', trendsRes.reason)
      }

      if (deliveredRes.status === 'fulfilled') {
        setDeliveredOrders(deliveredRes.value.data.orders || [])
      } else {
        console.error('Failed to fetch delivered orders:', deliveredRes.reason)
      }

      if (allOrdersRes.status === 'fulfilled') {
        setAllOrders(allOrdersRes.value.data.orders || allOrdersRes.value.data || [])
        setAllOrdersForMap(allOrdersRes.value.data.orders || allOrdersRes.value.data || [])
      } else {
        console.error('Failed to fetch all orders:', allOrdersRes.reason)
      }

      if (hourlyRes.status === 'fulfilled') {
        setHourlyPerformance(hourlyRes.value.data)
      } else {
        console.error('Failed to fetch hourly performance:', hourlyRes.reason)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Calculate growth percentages (mock for now - you can enhance this based on historical data)
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0
    return (((current - previous) / previous) * 100).toFixed(1)
  }

  const statCards = [
    {
      title: 'Today',
      value: stats?.orders?.today?.count || 0,
      revenue: stats?.orders?.today?.revenue || 0,
      icon: ShoppingCart,
      gradient: 'from-blue-500 to-blue-600',
      change: '+12%',
      positive: true,
    },
    {
      title: 'This Week',
      value: stats?.orders?.week?.count || 0,
      revenue: stats?.orders?.week?.revenue || 0,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-emerald-600',
      change: '+8%',
      positive: true,
    },
    {
      title: 'This Month',
      value: stats?.orders?.month?.count || 0,
      revenue: stats?.orders?.month?.revenue || 0,
      icon: Activity,
      gradient: 'from-purple-500 to-purple-600',
      change: '+18%',
      positive: true,
    },
    {
      title: 'Global Revenue',
      value: stats?.globalMetrics?.totalRevenue ? `${(stats.globalMetrics.totalRevenue / 1000).toFixed(1)}K` : '0',
      revenue: stats?.globalMetrics?.totalRevenue || 0,
      icon: DollarSign,
      gradient: 'from-green-500 to-green-600',
      change: 'All Time',
      positive: true,
    },
    {
      title: 'Delivery Fees',
      value: stats?.globalMetrics?.totalDeliveryFees ? `${(stats.globalMetrics.totalDeliveryFees / 1000).toFixed(1)}K` : '0',
      revenue: stats?.globalMetrics?.totalDeliveryFees || 0,
      icon: Truck,
      gradient: 'from-orange-500 to-orange-600',
      change: `${stats?.globalMetrics?.deliveredOrders || 0} delivered`,
      positive: true,
    },
    {
      title: 'Total Orders',
      value: stats?.globalMetrics?.totalOrders || 0,
      icon: Package,
      gradient: 'from-pink-500 to-pink-600',
      change: 'All Time',
      positive: true,
    },
    {
      title: 'Total Clients',
      value: stats?.clients || 0,
      icon: Users,
      gradient: 'from-orange-500 to-orange-600',
      change: 'Total',
      positive: true,
    },
    {
      title: 'Active Drivers',
      value: stats?.deliveryMen || 0,
      icon: Truck,
      gradient: 'from-red-500 to-red-600',
      change: 'Online',
      positive: true,
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      gradient: 'from-amber-500 to-amber-600',
      change: 'Waiting',
      positive: true,
    },
  ]

  const pieChartData = stats?.ordersByStatus?.map((item) => ({
    name: item.status,
    value: item.count,
  })) || []

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444']

  const revenueChartData = revenueTrends?.dailyRevenue?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    revenue: parseFloat(item.revenue),
  })) || []

  const getStatusColor = (status) => {
    const colors = {
      Pending: 'bg-amber-100 text-amber-700 border-amber-200',
      Processing: 'bg-blue-100 text-blue-700 border-blue-200',
      Delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Cancelled: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-slate-600 mt-1">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAllOrdersModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Display All Orders with Status
              </span>
            </button>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Activity className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-semibold text-slate-700">
                {loading ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
            <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200">
              <p className="text-xs text-slate-500">Last updated</p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                    {stat.revenue !== undefined && (
                      <p className="text-sm font-semibold text-slate-600 mt-2">
                        {parseFloat(stat.revenue).toFixed(2)} <span className="text-slate-400">MAD</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-3">
                      {stat.positive ? (
                        <ArrowUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-xs font-semibold ${stat.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Admin Insights Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Business Insights</h2>
              <p className="text-sm text-white/80">AI-powered recommendations for today</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Peak Hours Insight */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-yellow-300 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Peak Hours Alert</p>
                  <p className="text-xs text-white/80">
                    {(() => {
                      if (hourlyPerformance?.peakHours?.length > 0) {
                        const peakHour = hourlyPerformance.peakHours[0];
                        return `Busiest time: ${peakHour.hour}:00 with ${peakHour.order_count} orders. Consider scheduling more drivers during this period.`;
                      }
                      return 'Analyzing peak hours...';
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Revenue Performance */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-green-300 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Revenue Performance</p>
                  <p className="text-xs text-white/80">
                    {(() => {
                      const todayRevenue = parseFloat(stats?.orders?.today?.revenue || 0);
                      const avgOrderValue = recentOrders.length > 0 
                        ? (todayRevenue / recentOrders.length).toFixed(2)
                        : '0.00';
                      return `Average order value: ${avgOrderValue} MAD. ${todayRevenue > 500 ? 'Excellent performance!' : 'Focus on upselling to increase revenue.'}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Operations Alert */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-blue-300 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Operations Status</p>
                  <p className="text-xs text-white/80">
                    {(() => {
                      const pendingCount = stats?.pendingOrders || 0;
                      const activeDrivers = stats?.deliveryMen || 0;
                      if (pendingCount > activeDrivers * 5) {
                        return `High demand detected! ${pendingCount} pending orders with ${activeDrivers} drivers. Consider activating backup drivers.`;
                      } else if (pendingCount > 0) {
                        return `${pendingCount} orders pending. Current driver capacity seems adequate.`;
                      }
                      return 'All systems running smoothly. No pending orders.';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status Probability */}
        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Payment Status Distribution</h2>
              <p className="text-sm text-slate-500">Payment completion rates and probabilities</p>
            </div>
          </div>
          
          {/* Daily Revenue Tags */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Today's Revenue by Payment Status</h3>
            {stats?.globalMetrics?.dailyRevenueByStatus?.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {stats.globalMetrics.dailyRevenueByStatus.map((item, index) => {
                  const statusConfig = {
                    'Paid': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
                    'Pending': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
                    'Failed': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
                    'Refunded': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' }
                  };
                  const config = statusConfig[item.payment_status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
                  
                  return (
                    <div key={index} className={`px-4 py-2 rounded-full ${config.bg} ${config.text} ${config.border} border font-semibold text-sm`}>
                      {item.payment_status}: {parseFloat(item.revenue || 0).toFixed(2)} MAD ({item.order_count} orders)
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No daily revenue data available</div>
            )}
          </div>
          
          {stats?.globalMetrics?.paymentStatusDistribution?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.globalMetrics.paymentStatusDistribution.map((payment, index) => {
                const statusConfig = {
                  'Paid': { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                  'Pending': { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                  'Failed': { icon: X, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                  'Refunded': { icon: ArrowDown, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
                };
                const config = statusConfig[payment.payment_status] || { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
                const Icon = config.icon;
                
                return (
                  <div key={index} className={`p-4 rounded-xl ${config.bg} ${config.border} border`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className="text-sm font-semibold text-slate-700">{payment.payment_status}</span>
                      </div>
                      <span className={`text-lg font-bold ${config.color}`}>
                        {payment.percentage}%
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">Orders</span>
                        <span className="text-sm font-bold text-slate-800">{payment.count}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            payment.payment_status === 'Paid' ? 'bg-emerald-500' :
                            payment.payment_status === 'Pending' ? 'bg-amber-500' :
                            payment.payment_status === 'Failed' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${payment.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No payment data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Revenue Trends */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Revenue Trends</h2>
                <p className="text-sm text-slate-500 mt-1">Daily revenue over the past week</p>
              </div>
              {revenueTrends && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">This Month</p>
                    <p className="text-lg font-bold text-slate-800">
                      {parseFloat(revenueTrends.currentMonth || 0).toFixed(2)} MAD
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full ${(revenueTrends.growth || 0) >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <span className={`text-sm font-bold ${(revenueTrends.growth || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {(revenueTrends.growth || 0) >= 0 ? '+' : ''}
                      {(revenueTrends.growth || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `${value.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value) => [`${parseFloat(value).toFixed(2)} MAD`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No revenue data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Hourly Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">24-Hour Performance</h2>
                <p className="text-sm text-slate-500">Complete hourly breakdown</p>
              </div>
            </div>

            {hourlyPerformance?.hourlyData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyPerformance.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="hourRange" 
                    stroke="#94a3b8"
                    style={{ fontSize: '9px' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={1}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value) => [`${value} orders`, 'Orders']}
                  />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No hourly data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Delivery Stats</h2>
                <p className="text-sm text-slate-500">Performance metrics</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Avg Time</span>
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-indigo-600">
                  {deliveryPerformance ? parseInt(deliveryPerformance.avgDeliveryTimeMinutes) || 0 : 0}
                  <span className="text-sm text-slate-500 ml-1">min</span>
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Success Rate</span>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {deliveryPerformance ? (deliveryPerformance.completionRate || 0).toFixed(1) : '0.0'}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Today</p>
                  <p className="text-xl font-bold text-slate-800">
                    {deliveryPerformance ? deliveryPerformance.todayDeliveries || 0 : 0}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Active</p>
                  <p className="text-xl font-bold text-slate-800">
                    {deliveryPerformance ? deliveryPerformance.activeDeliveryMen || 0 : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Status Analysis */}
        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Hourly Order Distribution & Status Timing</h2>
              <p className="text-sm text-slate-500">All-time hourly patterns with average status change times</p>
            </div>
          </div>

          {stats?.hourlyStatusAnalysis?.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.hourlyStatusAnalysis}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                    yAxisId="left"
                    label={{ value: 'Order Count', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    stroke="#ef4444"
                    style={{ fontSize: '12px' }}
                    yAxisId="right"
                    orientation="right"
                    label={{ value: 'Avg Time (min)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value, name) => {
                      if (name.includes('Time')) return [`${parseFloat(value || 0).toFixed(1)} min`, name];
                      return [`${value} orders`, name];
                    }}
                    labelFormatter={(label) => `Hour: ${label}:00`}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="total_orders"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                    name="Total Orders"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="delivered"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Delivered"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="pending"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Pending"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avg_completion_time"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Avg Completion Time"
                  />
                </LineChart>
              </ResponsiveContainer>
              
              {/* Status Timing Insights */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-semibold text-blue-800">Peak Hour Activity</h4>
                  </div>
                  <p className="text-xs text-blue-600">
                    {(() => {
                      const peakHour = stats.hourlyStatusAnalysis.reduce((max, curr) => 
                        curr.total_orders > max.total_orders ? curr : max
                      );
                      return `Busiest at ${peakHour.hour}:00 with ${peakHour.total_orders} orders`;
                    })()}
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="text-sm font-semibold text-green-800">Fastest Completion</h4>
                  </div>
                  <p className="text-xs text-green-600">
                    {(() => {
                      const validTimes = stats.hourlyStatusAnalysis.filter(h => h.avg_completion_time > 0);
                      if (validTimes.length === 0) return 'No completion data';
                      const fastest = validTimes.reduce((min, curr) => 
                        curr.avg_completion_time < min.avg_completion_time ? curr : min
                      );
                      return `${fastest.hour}:00 - ${parseFloat(fastest.avg_completion_time || 0).toFixed(1)} min avg`;
                    })()}
                  </p>
                </div>
                
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <h4 className="text-sm font-semibold text-amber-800">Delivery Efficiency</h4>
                  </div>
                  <p className="text-xs text-amber-600">
                    {(() => {
                      const validDeliveryTimes = stats.hourlyStatusAnalysis.filter(h => h.avg_to_delivery_time > 0);
                      if (validDeliveryTimes.length === 0) return 'No delivery data';
                      const avgTime = validDeliveryTimes.reduce((sum, curr) => sum + curr.avg_to_delivery_time, 0) / validDeliveryTimes.length;
                      return `Average: ${avgTime.toFixed(1)} min to delivery`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No hourly status data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders by Status */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Orders by Status</h2>
                <p className="text-sm text-slate-500">Real-time order distribution</p>
              </div>
            </div>
            
            {pieChartData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} orders`, name]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Enhanced Status List with Percentages */}
                <div className="mt-4 space-y-2">
                  {(() => {
                    const totalOrders = pieChartData.reduce((sum, item) => sum + item.value, 0);
                    return pieChartData.map((item, index) => {
                      const percentage = totalOrders > 0 ? ((item.value / totalOrders) * 100).toFixed(1) : 0;
                      const statusConfig = {
                        'Pending': { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                        'Processing': { icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                        'Preparing': { icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
                        'OutForDelivery': { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        'Delivered': { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        'Cancelled': { icon: X, color: 'text-red-600', bg: 'bg-red-50' }
                      };
                      const config = statusConfig[item.name] || { icon: Package, color: 'text-gray-600', bg: 'bg-gray-50' };
                      const Icon = config.icon;
                      
                      return (
                        <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${config.bg} border border-slate-200`}>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${config.color}`} />
                              <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-800">{item.value}</span>
                            <span className={`text-xs font-semibold ${config.color} bg-white px-2 py-1 rounded-full`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Quick Insights */}
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-800">Quick Insight</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {(() => {
                          const delivered = pieChartData.find(item => item.name === 'Delivered')?.value || 0;
                          const pending = pieChartData.find(item => item.name === 'Pending')?.value || 0;
                          const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
                          const completionRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : 0;
                          
                          if (pending > 0) {
                            return `${pending} orders pending attention. ${completionRate}% completion rate today.`;
                          } else {
                            return `All orders being processed! ${completionRate}% completion rate today.`;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No order data</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No recent orders</p>
                </div>
              </div>
            ) : (
              <div className="h-80 overflow-y-auto space-y-3 pr-2">
                {recentOrders.map((order, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{order.order_number}</p>
                        <p className="text-sm text-slate-600">{order.customer_name}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-indigo-600">
                      {parseFloat(order.final_price).toFixed(2)} MAD
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Top Products Performance</h2>
                <p className="text-sm text-slate-500">Revenue trends for best-selling products</p>
              </div>
            </div>
            
            {topProducts.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8"
                      style={{ fontSize: '10px' }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `${value.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(value, name) => [
                        name === 'revenue' ? `${parseFloat(value).toFixed(2)} MAD` : value,
                        name === 'revenue' ? 'Revenue' : 'Sales Count'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_revenue" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                {/* Product Details */}
                <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                  {topProducts.slice(0, 3).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate max-w-32">{product.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-indigo-600">{parseFloat(product.total_revenue || 0).toFixed(2)} MAD</p>
                        <p className="text-xs text-slate-500">{product.sales_count || 0} sales</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No products data</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Top Clients</h2>
          {topClients.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No clients data</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topClients.map((client, index) => (
                <div
                  key={index}
                  className="p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 hover:from-amber-50 hover:to-orange-50 transition-all border border-slate-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.total_orders || 0} orders</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Total Spent</p>
                    <p className="text-xl font-bold text-amber-600">
                      {parseFloat(client.total_spent || 0).toFixed(2)} <span className="text-sm text-slate-400">MAD</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivered Orders Map */}
        {deliveredOrders.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">Delivered Orders Map</h2>
                <p className="text-sm text-slate-500">Recent delivery locations with markers</p>
              </div>
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm shadow-md">
                {deliveredOrders.length} Delivered
              </div>
            </div>

            {/* Map Container */}
            <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner bg-slate-50">
              <DeliveredOrdersMap deliveredOrders={deliveredOrders} />
            </div>
          </div>
        )}

        {/* Active Deliveries Map */}
        {activeDeliveries.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">Active Deliveries</h2>
                <p className="text-sm text-slate-500">Real-time delivery tracking on map</p>
              </div>
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-md">
                {activeDeliveries.length} Active
              </div>
            </div>

            {/* Map Container */}
            <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner bg-slate-50">
              <ActiveDeliveriesMap deliveries={activeDeliveries} />
            </div>
          </div>
        )}
      </div>

      {/* All Orders Modal */}
      <AllOrdersModal 
        isOpen={showAllOrdersModal}
        onClose={() => setShowAllOrdersModal(false)}
        orders={allOrders}
      />
    </div>
  )
}