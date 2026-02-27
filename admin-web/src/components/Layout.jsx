import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  FolderOpen,
  Package,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  Activity,
  Box,
  Tag,
  Star,
  Shield,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import NotificationCenter from './NotificationCenter'
import LiveIndicator from './LiveIndicator'
import RealtimeNotifications from './RealtimeNotifications'
import { useRealtime } from '../hooks/useRealtime'

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/orders', icon: ShoppingCart, label: 'Orders' },
  { path: '/offers', icon: Tag, label: 'Offers' },
  { path: '/clients', icon: Users, label: 'Clients' },
  { path: '/delivery-men', icon: Truck, label: 'Delivery Men' },
  { path: '/categories', icon: FolderOpen, label: 'Categories' },
  { path: '/products', icon: Package, label: 'Products' },
  { path: '/promotions', icon: Tag, label: 'Promotions' },
  { path: '/order-ratings', icon: Star, label: 'Order Ratings' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { admin, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isConnected } = useRealtime('realtime:connected')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
        <div className="flex items-center gap-2">
          <LiveIndicator isConnected={isConnected} />
          <NotificationCenter />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-white border-r border-gray-200 fixed lg:static h-full z-40 transition-all duration-300 flex flex-col ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h1 className={`font-bold text-xl text-gray-800 ${!sidebarOpen && 'hidden'}`}>
              Admin Panel
            </h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:block hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className={!sidebarOpen && 'lg:hidden'}>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <div className={`mb-4 ${!sidebarOpen && 'lg:hidden'}`}>
              <p className="text-sm font-medium text-gray-800">{admin?.name}</p>
              <p className="text-xs text-gray-500">{admin?.email}</p>
            </div>
            <div className={`mb-2 ${!sidebarOpen && 'lg:hidden'}`}>
              <NotificationCenter />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className={!sidebarOpen && 'lg:hidden'}>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-0 overflow-y-auto">
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <LiveIndicator isConnected={isConnected} />
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
            </div>
          </div>
          
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Real-time notifications overlay */}
      <RealtimeNotifications />
    </div>
  )
}

