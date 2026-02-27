import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Clients from './pages/Clients'
import DeliveryMen from './pages/DeliveryMen'
import Categories from './pages/Categories'
import Products from './pages/Products'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import Promotions from './pages/Promotions'
import Layout from './components/Layout'
import Offers from './pages/Offers'
import OrderRatings from './pages/OrderRatings'
import TermsAndServices from './pages/TermsAndServices'
import PrivacyPolicy from './pages/PrivacyPolicy'
function PrivateRoute({ children }) {
  const { isAuthenticated, token, admin } = useAuthStore()
  
  // Check if we have valid auth data
  useEffect(() => {
    // Rehydrate auth state from localStorage
    const stored = localStorage.getItem('admin-auth-storage')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.state?.token && parsed.state?.admin) {
          useAuthStore.setState({ 
            isAuthenticated: true,
            token: parsed.state.token,
            admin: parsed.state.admin
          })
        }
      } catch (e) {
        console.error('Error parsing auth storage:', e)
      }
    }
  }, [])
  
  const hasAuth = (isAuthenticated && token && admin) || (token && admin)
  return hasAuth ? children : <Navigate to="/login" />
}

function App() {
  return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="terms-services" element={<TermsAndServices/>} />
          <Route path="privacy-policy" element={<PrivacyPolicy/>} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="clients" element={<Clients />} />
            <Route path="delivery-men" element={<DeliveryMen />} />
            <Route path="categories" element={<Categories />} />
            <Route path="products" element={<Products />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="reports" element={<Reports />} />
            <Route path="promotions" element={<Promotions />} />
            <Route path="offers" element={<Offers />} />
            <Route path="order-ratings" element={<OrderRatings />} />
          </Route>
        </Routes>
      </Router>
  )
}

export default App

