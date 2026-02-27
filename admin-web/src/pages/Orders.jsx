import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Eye, Truck, Edit, Download, Printer, X, CheckSquare, Square } from 'lucide-react'
import OrderMap from '../components/OrderMap'
import { getImageUrl } from '../config/api'
import OrderHistoryTimeline from '../components/OrderHistoryTimeline'
import OrderNotes from '../components/OrderNotes'
import DateRangePicker from '../components/DateRangePicker'
import ConfirmDialog from '../components/ConfirmDialog'
import { exportToCSV } from '../utils/export'
import Toast from '../components/Toast'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [deliveryMen, setDeliveryMen] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([])
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [restaurantSettings, setRestaurantSettings] = useState(null)
  const [dateRange, setDateRange] = useState(null)
  const [orderHistory, setOrderHistory] = useState([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [orderStats, setOrderStats] = useState(null)
  const [toast, setToast] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({})

  useEffect(() => {
    fetchOrders()
    fetchRestaurantSettings()
    calculateStats()
  }, [statusFilter, paymentStatusFilter, searchQuery, dateRange, page])

  const fetchRestaurantSettings = async () => {
    try {
      const response = await api.get('/restaurant-settings')
      // Handle the wrapped response structure
      if (response.data.success && response.data.settings) {
        setRestaurantSettings(response.data.settings)
      } else if (response.data.restaurant_name) {
        // Handle direct response (fallback)
        setRestaurantSettings(response.data)
      } else {
        console.log('Restaurant settings response:', response.data)
      }
    } catch (error) {
      console.error('Error fetching restaurant settings:', error)
    }
  }

  const calculateStats = () => {
    if (orders.length === 0) {
      setOrderStats(null)
      return
    }
    const total = orders.reduce((sum, o) => sum + parseFloat(o.final_price || 0), 0)
    const avg = total / orders.length
    const min = Math.min(...orders.map((o) => parseFloat(o.final_price || 0)))
    const max = Math.max(...orders.map((o) => parseFloat(o.final_price || 0)))
    setOrderStats({ total, avg, min, max, count: orders.length })
  }

  useEffect(() => {
    calculateStats()
  }, [orders])

  const fetchOrders = async () => {
    try {
      const params = { page, limit: 20 }
      if (statusFilter) params.status = statusFilter
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter
      if (searchQuery) params.search = searchQuery
      if (dateRange?.start) params.start_date = dateRange.start
      if (dateRange?.end) params.end_date = dateRange.end
      const response = await api.get('/orders', { params })
      setOrders(response.data.orders)
      setPagination(response.data.pagination)
      setSelectedOrders([])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderDetails = async (id) => {
    try {
      const response = await api.get(`/orders/${id}`)
      setSelectedOrder(response.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching order details:', error)
    }
  }

  const fetchOrderHistory = async (id) => {
    try {
      const response = await api.get(`/orders/${id}/history`)
      setOrderHistory(response.data.history)
      setShowHistoryModal(true)
    } catch (error) {
      console.error('Error fetching order history:', error)
    }
  }

  const handleExport = async () => {
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter
      if (searchQuery) params.search = searchQuery
      if (dateRange?.start) params.start_date = dateRange.start
      if (dateRange?.end) params.end_date = dateRange.end

      const response = await api.get('/orders/export', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setToast({ message: 'Orders exported successfully', type: 'success' })
    } catch (error) {
      console.error('Error exporting orders:', error)
      setToast({ message: 'Failed to export orders', type: 'error' })
    }
  }

  const handleBulkUpdate = async (newStatus) => {
    try {
      await api.post('/orders/bulk-update-status', {
        orderIds: selectedOrders,
        status: newStatus,
      })
      setShowBulkModal(false)
      setSelectedOrders([])
      fetchOrders()
      setToast({ message: `Updated ${selectedOrders.length} order(s)`, type: 'success' })
    } catch (error) {
      console.error('Error bulk updating:', error)
      setToast({ message: 'Failed to update orders', type: 'error' })
    }
  }

  const handlePaymentStatusUpdate = async (orderId, paymentStatus) => {
    try {
      await api.put(`/orders/${orderId}/payment-status`, { payment_status: paymentStatus })
      setShowPaymentModal(false)
      fetchOrders()
      if (selectedOrder?.order?.id === orderId) {
        fetchOrderDetails(orderId)
      }
      setToast({ message: 'Payment status updated', type: 'success' })
    } catch (error) {
      console.error('Error updating payment status:', error)
      setToast({ message: 'Failed to update payment status', type: 'error' })
    }
  }

  const handleCancelOrder = async (orderId, reason) => {
    try {
      await api.post(`/orders/${orderId}/cancel`, { reason })
      setShowCancelModal(false)
      fetchOrders()
      if (selectedOrder?.order?.id === orderId) {
        fetchOrderDetails(orderId)
      }
      setToast({ message: 'Order cancelled successfully', type: 'success' })
    } catch (error) {
      console.error('Error cancelling order:', error)
      setToast({ message: error.response?.data?.message || 'Failed to cancel order', type: 'error' })
    }
  }

  const handlePrintKitchenTicket = async () => {
    if (!selectedOrder) return

    // Ensure restaurant settings are loaded
    let restaurant = restaurantSettings
    if (!restaurant || !restaurant.restaurant_name) {
      try {
        const response = await api.get('/restaurant-settings')
        if (response.data.success && response.data.settings) {
          restaurant = response.data.settings
          setRestaurantSettings(response.data.settings)
        } else if (response.data.restaurant_name) {
          restaurant = response.data
          setRestaurantSettings(response.data)
        }
      } catch (error) {
        console.error('Error fetching restaurant settings for kitchen ticket:', error)
      }
    }

    const printWindow = window.open('', '_blank')
    const order = selectedOrder.order
    const items = selectedOrder.items || []

    // Calculate preparation priority and timing
    const orderTime = new Date(order.created_at)
    const currentTime = new Date()
    const timeDiff = Math.floor((currentTime - orderTime) / 1000 / 60) // minutes
    const isUrgent = timeDiff > 15 || order.status === 'OutForDelivery'

    // Group items by category for easier preparation
    const groupedItems = items.reduce((groups, item) => {
      const category = item.category_name || 'General'
      if (!groups[category]) groups[category] = []
      groups[category].push(item)
      return groups
    }, {})

    printWindow.document.write(`
      <html>
        <head>
          <title>Kitchen Ticket - ${order.order_number}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; font-size: 10px; }
              .no-print { display: none; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              padding: 15px; 
              max-width: 300px; 
              margin: 0 auto; 
              line-height: 1.2;
              color: #000;
              background: white;
            }
            .kitchen-ticket {
              border: 2px dashed #333;
              padding: 15px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 15px; 
              border-bottom: 3px double #333;
              padding-bottom: 10px;
            }
            .restaurant-name { 
              font-size: 18px; 
              font-weight: bold; 
              margin: 5px 0;
            }
            .ticket-title { 
              font-size: 14px; 
              font-weight: bold; 
              margin: 10px 0;
              text-align: center;
            }
            .order-number { 
              font-size: 20px; 
              font-weight: bold; 
              text-align: center;
              margin: 10px 0;
              padding: 8px;
              background: #f0f0f0;
              border: 2px solid #333;
            }
            .urgent {
              background: #ff6b6b !important;
              color: white !important;
              animation: blink 1s infinite;
            }
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0.5; }
            }
            .info-section {
              margin: 15px 0;
              padding: 10px;
              border: 1px solid #ccc;
              background: #f9f9f9;
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 5px 0;
              font-size: 11px;
            }
            .info-label { 
              font-weight: bold; 
            }
            .category-section {
              margin: 15px 0;
              page-break-inside: avoid;
            }
            .category-title {
              font-weight: bold;
              font-size: 12px;
              margin: 10px 0 5px 0;
              padding: 5px;
              background: #333;
              color: white;
              text-align: center;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 8px 0;
              padding: 5px;
              border-bottom: 1px dotted #ccc;
              font-size: 11px;
            }
            .item-name {
              flex: 1;
              font-weight: bold;
            }
            .item-quantity {
              font-size: 14px;
              font-weight: bold;
              margin: 0 10px;
              text-align: center;
              min-width: 30px;
            }
            .item-notes {
              font-size: 9px;
              font-style: italic;
              color: #666;
              margin-top: 3px;
            }
            .special-instructions {
              margin: 15px 0;
              padding: 10px;
              border: 2px solid #ff6b6b;
              background: #fff5f5;
              font-weight: bold;
              text-align: center;
            }
            .timing-info {
              margin: 10px 0;
              padding: 8px;
              background: #e3f2fd;
              border: 1px solid #2196f3;
              text-align: center;
            }
            .priority-high {
              border-color: #ff6b6b;
              background: #ffebee;
              color: #c62828;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 2px dashed #333;
              font-size: 9px;
            }
            .checkbox {
              display: inline-block;
              width: 15px;
              height: 15px;
              border: 2px solid #333;
              margin-right: 8px;
              vertical-align: middle;
            }
          </style>
        </head>
        <body>
          <div class="kitchen-ticket">
            <!-- Restaurant Header -->
            <div class="header">
              <div class="restaurant-name">${restaurant.restaurant_name || 'KITCHEN'}</div>
              <div class="ticket-title">🍳 KITCHEN TICKET 🍳</div>
              <div class="order-number ${isUrgent ? 'urgent' : ''}">
                #${order.order_number}
              </div>
            </div>

            <!-- Order Information -->
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Order Time:</span>
                <span>${orderTime.toLocaleTimeString()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Customer:</span>
                <span>${order.customer_name || 'Guest'}</span>
              </div>
              ${order.customer_phone ? `
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span>${order.customer_phone}</span>
              </div>` : ''}
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span>${order.status || 'Pending'}</span>
              </div>
              ${order.delivery_address ? `
              <div class="info-row">
                <span class="info-label">Address:</span>
                <span>${order.delivery_address}</span>
              </div>` : ''}
              ${order.order_type ? `
              <div class="info-row">
                <span class="info-label">Type:</span>
                <span>${order.order_type}</span>
              </div>` : ''}
            </div>

            <!-- Timing & Priority -->
            <div class="timing-info ${isUrgent ? 'priority-high' : ''}">
              <div style="font-weight: bold; margin-bottom: 5px;">
                ${isUrgent ? '⚠️ URGENT ORDER ⚠️' : '⏰ ORDER TIMING'}
              </div>
              <div>Wait Time: ${timeDiff} minutes</div>
              <div>Ordered: ${orderTime.toLocaleTimeString()}</div>
              ${isUrgent ? '<div style="font-weight: bold; margin-top: 5px;">PRIORITIZE THIS ORDER!</div>' : ''}
            </div>

            <!-- Special Instructions -->
            ${order.special_instructions || order.notes ? `
            <div class="special-instructions">
              📝 SPECIAL INSTRUCTIONS:<br>
              ${order.special_instructions || order.notes}
            </div>` : ''}

            <!-- Order Items by Category -->
            <div style="margin: 20px 0;">
              <div style="text-align: center; font-weight: bold; margin-bottom: 10px;">
                📋 ORDER ITEMS
              </div>
              
              ${Object.entries(groupedItems).map(([category, categoryItems]) => `
                <div class="category-section">
                  <div class="category-title">${category.toUpperCase()}</div>
                  ${categoryItems.map(item => `
                    <div class="item-row">
                      <span class="checkbox"></span>
                      <span class="item-name">${item.product_name || 'Product'}</span>
                      <span class="item-quantity">×${item.quantity}</span>
                    </div>
                    ${item.special_instructions || item.notes ? `
                      <div class="item-notes">
                        Note: ${item.special_instructions || item.notes}
                      </div>
                    ` : ''}
                  `).join('')}
                </div>
              `).join('')}
            </div>

            <!-- Preparation Checklist -->
            <div style="margin: 20px 0; padding: 10px; border: 1px solid #ccc;">
              <div style="font-weight: bold; margin-bottom: 10px; text-align: center;">
                ✅ PREPARATION CHECKLIST
              </div>
              <div style="font-size: 10px; line-height: 1.4;">
                <div><span class="checkbox"></span> Check all ingredients</div>
                <div><span class="checkbox"></span> Prepare items as listed</div>
                <div><span class="checkbox"></span> Check special instructions</div>
                <div><span class="checkbox"></span> Quality check completed</div>
                <div><span class="checkbox"></span> Packaging ready</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div style="font-weight: bold; margin-bottom: 5px;">
                Kitchen Copy - Do Not Give to Customer
              </div>
              <div>Generated: ${currentTime.toLocaleString()}</div>
              <div>${restaurant.phone || 'Kitchen Phone'}</div>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handlePrintReceipt = async () => {
    if (!selectedOrder) return

    // Ensure restaurant settings are loaded
    let restaurant = restaurantSettings
    if (!restaurant || !restaurant.restaurant_name) {
      try {
        const response = await api.get('/restaurant-settings')
        if (response.data.success && response.data.settings) {
          restaurant = response.data.settings
          setRestaurantSettings(response.data.settings)
        } else if (response.data.restaurant_name) {
          restaurant = response.data
          setRestaurantSettings(response.data)
        }
      } catch (error) {
        console.error('Error fetching restaurant settings for receipt:', error)
      }
    }

    const printWindow = window.open('', '_blank')
    const order = selectedOrder.order
    const items = selectedOrder.items || []

    // Debug logging
    console.log('Restaurant Settings for receipt:', restaurant)
    console.log('Order data for receipt:', order)

    // Determine payment status display
    const getPaymentStatusDisplay = (paymentStatus) => {
      if (paymentStatus === 'Paid') {
        return 'Paid (Online Payment)'
      } else if (paymentStatus === 'Unpaid') {
        return 'Unpaid (Cash on Delivery)'
      } else {
        return paymentStatus || 'Pending'
      }
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${order.order_number}</title>
          <style>
            @media print {
              body { margin: 0; padding: 15px; font-size: 12px; }
              .no-print { display: none; }
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 20px; 
              max-width: 400px; 
              margin: 0 auto; 
              line-height: 1.4;
              color: #333;
            }
            .receipt-container {
              border: 2px solid #ddd;
              padding: 20px;
              border-radius: 8px;
              background: white;
            }
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .logo { 
              width: 80px; 
              height: 80px; 
              margin-bottom: 10px;
              border-radius: 8px;
              object-fit: cover;
            }
            .restaurant-name { 
              font-size: 24px; 
              font-weight: bold; 
              margin: 5px 0;
              color: #222;
            }
            .restaurant-info { 
              font-size: 11px; 
              color: #666; 
              margin: 3px 0;
            }
            .order-title { 
              font-size: 18px; 
              font-weight: bold; 
              margin: 15px 0 10px 0;
              text-align: center;
              color: #333;
            }
            .order-number { 
              font-size: 14px; 
              font-weight: bold; 
              background: #f5f5f5;
              padding: 8px;
              border-radius: 4px;
              text-align: center;
              margin-bottom: 15px;
            }
            .section {
              margin: 20px 0;
            }
            .section-title {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 8px;
              color: #333;
              border-bottom: 1px solid #eee;
              padding-bottom: 4px;
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 6px 0;
              font-size: 12px;
            }
            .info-label { 
              font-weight: 600; 
              color: #555;
            }
            .info-value { 
              text-align: right; 
              font-weight: 500;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0;
              font-size: 11px;
            }
            th, td { 
              border: none; 
              padding: 8px 4px; 
              text-align: left; 
              border-bottom: 1px dotted #ddd;
            }
            th { 
              background-color: #f8f8f8; 
              font-weight: bold;
              color: #333;
            }
            .item-name { 
              font-weight: 500; 
              max-width: 150px;
            }
            .quantity { 
              text-align: center; 
              font-weight: 600;
            }
            .price { 
              text-align: right; 
              font-family: monospace;
            }
            .total-section { 
              margin-top: 20px; 
              padding-top: 15px;
              border-top: 2px solid #333;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 8px 0;
              font-size: 12px;
            }
            .grand-total { 
              font-weight: bold; 
              font-size: 16px; 
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
            }
            .status {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-preparing { background: #cce5ff; color: #004085; }
            .status-ready { background: #d4edda; color: #155724; }
            .status-outfordelivery { background: #e2e3e5; color: #383d41; }
            .status-delivered { background: #d1ecf1; color: #0c5460; }
            .status-cancelled { background: #f8d7da; color: #721c24; }
            .payment-paid { background: #d4edda; color: #155724; }
            .payment-unpaid { background: #fff3cd; color: #856404; }
            .footer {
              text-align: center;
              margin-top: 25px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              font-size: 10px;
              color: #888;
            }
            .thank-you {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <!-- Restaurant Header -->
            <div class="header">
              ${restaurant.restaurant_logo ?
        `<img src="${restaurant.restaurant_logo.startsWith('http') ? restaurant.restaurant_logo : `https://haba-haba-api.ubua.cloud/${restaurant.restaurant_logo}`}" 
                     alt="${restaurant.restaurant_name || 'Restaurant'}" class="logo">` :
        '<div style="width: 80px; height: 80px; background: #f0f0f0; margin: 0 auto 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">🍽️</div>'
      }
              <div class="restaurant-name">${restaurant.restaurant_name || 'Restaurant Name'}</div>
              <div class="restaurant-info">${restaurant.restaurant_address || 'Restaurant Address'}</div>
              <div class="restaurant-info">📞 ${restaurant.phone || 'Phone Number'}</div>
            </div>

            <!-- Order Information -->
            <div class="order-title">ORDER RECEIPT</div>
            <div class="order-number">#${order.order_number}</div>
            
            <div class="section">
              <div class="section-title">Order Details</div>
              <div class="info-row">
                <span class="info-label">Date & Time:</span>
                <span class="info-value">${new Date(order.created_at).toLocaleString()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Customer:</span>
                <span class="info-value">${order.customer_name || 'Guest'}</span>
              </div>
              ${order.customer_phone ? `
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${order.customer_phone}</span>
              </div>` : ''}
              ${order.delivery_address ? `
              <div class="info-row">
                <span class="info-label">Address:</span>
                <span class="info-value">${order.delivery_address}</span>
              </div>` : ''}
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">
                  <span class="status status-${order.status ? order.status.toLowerCase().replace(' ', '') : 'pending'}">
                    ${order.status || 'Pending'}
                  </span>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment:</span>
                <span class="info-value">
                  <span class="status ${order.payment_status}">
                    ${getPaymentStatusDisplay(order.payment_status)}
                  </span>
                </span>
              </div>
              ${order.delivery_man_name ? `
              <div class="info-row">
                <span class="info-label">Delivery:</span>
                <span class="info-value">${order.delivery_man_name}</span>
              </div>` : ''}
            </div>

            <!-- Order Items -->
            <div class="section">
              <div class="section-title">Order Items</div>
              <table>
                <thead>
                  <tr>
                    <th class="item-name">Item</th>
                    <th class="quantity">Qty</th>
                    <th class="price">Price</th>
                    <th class="price">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td class="item-name">${item.product_name || 'Product'}</td>
                      <td class="quantity">${item.quantity}</td>
                      <td class="price">${parseFloat(item.price_per_unit || item.price || 0).toFixed(2)} MAD</td>
                      <td class="price">${(parseFloat(item.price_per_unit || item.price || 0) * item.quantity).toFixed(2)} MAD</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Price Summary -->
            <div class="total-section">
              <div class="section-title">Payment Summary</div>
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${parseFloat(order.total_price || 0).toFixed(2)} MAD</span>
              </div>
              ${parseFloat(order.delivery_fee || 0) > 0 ? `
              <div class="total-row">
                <span>Delivery Fee:</span>
                <span>${parseFloat(order.delivery_fee || 0).toFixed(2)} MAD</span>
              </div>` : ''}
              ${parseFloat(order.discount || 0) > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span style="color: #28a745;">-${parseFloat(order.discount || 0).toFixed(2)} MAD</span>
              </div>` : ''}
              ${parseFloat(order.service_fee || 0) > 0 ? `
              <div class="total-row">
                <span>Service Fee:</span>
                <span>${parseFloat(order.service_fee || 0).toFixed(2)} MAD</span>
              </div>` : ''}
              <div class="total-row grand-total">
                <span>TOTAL ${order.payment_status === 'paid' || order.payment_method === 'online' ? 'PAID' : 'DUE'}:</span>
                <span>${parseFloat(order.final_price || order.total_price || 0).toFixed(2)} MAD</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="thank-you">Thank you for your order!</div>
              <div>We hope to see you again soon</div>
              <div style="margin-top: 10px;">
                ${restaurant.restaurant_name || 'Restaurant'} • ${restaurant.phone || 'Phone'}
              </div>
              <div style="margin-top: 5px; font-size: 9px;">
                Generated on ${new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map((o) => o.id))
    }
  }

  const fetchDeliveryMen = async () => {
    try {
      const response = await api.get('/delivery-men', { params: { limit: 100 } })
      setDeliveryMen(response.data.deliveryMen)
    } catch (error) {
      console.error('Error fetching delivery men:', error)
    }
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus })
      setShowStatusModal(false)
      fetchOrders()
      if (selectedOrder?.order?.id === orderId) {
        fetchOrderDetails(orderId)
      }
      setToast({ message: 'Order status updated successfully', type: 'success' })
    } catch (error) {
      console.error('Error updating status:', error)
      setToast({ message: 'Failed to update order status', type: 'error' })
    }
  }

  const handleEditOrder = (order) => {
    setEditFormData({
      id: order.id,
      status: order.status,
      payment_status: order.payment_status || 'Unpaid',
      delivery_address: order.delivery_address || '',
      total_price: order.total_price || 0,
      delivery_fee: order.delivery_fee || 0,
      discount: order.discount || 0,
      final_price: order.final_price || 0,
      delivery_man_id: order.delivery_man_id || null,
    })
    if (!deliveryMen.length) {
      fetchDeliveryMen()
    }
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    try {
      // Remove id from the payload as it's in the URL
      const { id, ...updateData } = editFormData
      const response = await api.put(`/orders/${id}`, updateData)
      setShowEditModal(false)
      setToast({ message: response.data.message || 'Order updated successfully', type: 'success' })
      fetchOrders()
      if (selectedOrder?.order?.id === id) {
        fetchOrderDetails(id)
      }
    } catch (error) {
      console.error('Error updating order:', error)
      setToast({
        message: error.response?.data?.message || 'Failed to update order. Please check the console for details.',
        type: 'error'
      })
    }
  }

  const handleAssignDeliveryMan = async (orderId, deliveryManId) => {
    try {
      await api.post('/orders/assign-delivery-man', {
        orderId,
        deliveryManId,
      })
      setShowAssignModal(false)
      fetchOrders()
      if (selectedOrder?.order?.id === orderId) {
        fetchOrderDetails(orderId)
      }
    } catch (error) {
      console.error('Error assigning delivery man:', error)
      alert('Failed to assign delivery man')
    }
  }

  const statusColors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Preparing: 'bg-blue-100 text-blue-800',
    OutForDelivery: 'bg-purple-100 text-purple-800',
    Delivered: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-800',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
          <p className="text-gray-600 mt-1">Manage all restaurant orders</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Preparing">Preparing</option>
              <option value="OutForDelivery">Out For Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Payment:</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search by order number, customer name or email..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <DateRangePicker
          onDateRangeChange={(range) => {
            setDateRange(range)
            setPage(1)
          }}
        />
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4">
            {selectedOrders.length > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Edit className="w-4 h-4" />
                Update {selectedOrders.length} Selected
              </button>
            )}
            {orderStats && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  Total: <strong>{parseFloat(orderStats.total).toFixed(2)} MAD</strong>
                </span>
                <span className="text-gray-600">
                  Avg: <strong>{parseFloat(orderStats.avg).toFixed(2)} MAD</strong>
                </span>
                <span className="text-gray-600">
                  Range: <strong>{parseFloat(orderStats.min).toFixed(2)} - {parseFloat(orderStats.max).toFixed(2)} MAD</strong>
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={toggleSelectAll} className="flex items-center">
                    {selectedOrders.length === orders.length && orders.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-primary-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Man
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => toggleOrderSelection(order.id)}>
                      {selectedOrders.includes(order.id) ? (
                        <CheckSquare className="w-5 h-5 text-primary-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.customer_name}
                      </p>
                      <p className="text-sm text-gray-500">{order.customer_phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {parseFloat(order.final_price).toFixed(2)} MAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColors[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <p className="truncate" title={order.delivery_address || 'No address'}>
                      {order.delivery_address || 'No address'}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <p>{order.delivery_man_name || 'Not assigned'}</p>
                      {order.delivery_man_lat && order.delivery_man_lon && (
                        <p className="text-xs text-gray-400">
                          📍 {parseFloat(order.delivery_man_lat).toFixed(6)}, {parseFloat(order.delivery_man_lon).toFixed(6)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchOrderDetails(order.id)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Order"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {!order.delivery_man_id && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                        <button
                          onClick={() => {
                            setSelectedOrder({ order: { id: order.id } })
                            fetchDeliveryMen()
                            setShowAssignModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Assign Delivery Man"
                        >
                          <Truck className="w-5 h-5" />
                        </button>
                      )}
                      {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                        <button
                          onClick={() => {
                            setSelectedOrder({ order: { id: order.id } })
                            setShowCancelModal(true)
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel Order"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of{' '}
              {pagination.total} orders
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Order {selectedOrder.order.order_number}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleEditOrder(selectedOrder.order)
                    setShowDetailsModal(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  title="Edit Order"
                >
                  <Edit className="w-4 h-4" />
                  Edit Order
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  title="Print Receipt"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={handlePrintKitchenTicket}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                  title="Print Kitchen Ticket"
                >
                  <Printer className="w-4 h-4" />
                  Kitchen
                </button>
                <button
                  onClick={() => fetchOrderHistory(selectedOrder.order.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  title="View History"
                >
                  History
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-medium">{selectedOrder.order.customer_name}</p>
                  <p className="text-sm text-gray-500">{selectedOrder.order.customer_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColors[selectedOrder.order.status]}`}
                  >
                    {selectedOrder.order.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${selectedOrder.order.payment_status === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : selectedOrder.order.payment_status === 'Refunded'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                    >
                      {selectedOrder.order.payment_status || 'Unpaid'}
                    </span>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      Change
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount ({selectedOrder.order.delivery_fee} MAD + {selectedOrder.order.total_price} MAD)</p>
                  <p className="font-medium text-lg">
                    {parseFloat(selectedOrder.order.final_price).toFixed(2)} MAD
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Address</p>
                  <p className="font-medium">{selectedOrder.order.delivery_address || 'No address'}</p>
                  {selectedOrder.order.client_lat && selectedOrder.order.client_lon && (
                    <p className="text-xs text-gray-500 mt-1">
                      📍 Client Location: {parseFloat(selectedOrder.order.client_lat).toFixed(6)}, {parseFloat(selectedOrder.order.client_lon).toFixed(6)}
                    </p>
                  )}
                </div>
                {selectedOrder.order.delivery_man_name && (
                  <div>
                    <p className="text-sm text-gray-600">Delivery Man Location</p>
                    {selectedOrder.order.delivery_man_lat && selectedOrder.order.delivery_man_lon ? (
                      <p className="font-medium text-sm">
                        📍 {parseFloat(selectedOrder.order.delivery_man_lat).toFixed(6)}, {parseFloat(selectedOrder.order.delivery_man_lon).toFixed(6)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Location not available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Map Section */}
              {(selectedOrder.order.client_lat && selectedOrder.order.client_lon) ||
                (selectedOrder.order.delivery_man_lat && selectedOrder.order.delivery_man_lon) ? (
                <div>
                  <h3 className="font-medium mb-2">Location Map</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedOrder.order.client_lat && selectedOrder.order.client_lon && (
                      <span className="inline-block mr-4">🔴 Red marker: Client delivery address</span>
                    )}
                    {selectedOrder.order.delivery_man_lat && selectedOrder.order.delivery_man_lon && (
                      <span className="inline-block">🔵 Blue marker: Delivery man current location</span>
                    )}
                  </p>
                  <OrderMap
                    clientLat={selectedOrder.order.client_lat}
                    clientLon={selectedOrder.order.client_lon}
                    deliveryManLat={selectedOrder.order.delivery_man_lat}
                    deliveryManLon={selectedOrder.order.delivery_man_lon}
                    clientAddress={selectedOrder.order.delivery_address}
                    deliveryManName={selectedOrder.order.delivery_man_name}
                  />
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">No location data available for this order.</p>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {item.product_image ? (
                          <img
                            src={getImageUrl(item.product_image)}
                            alt={item.product_name}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/64x64?text=No+Image' }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded" />
                        )}
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-gray-500">
                            Qty: {item.quantity} × {parseFloat(item.price_per_unit).toFixed(2)} MAD
                          </p>
                          {item.special_instructions && (
                            <p className="text-xs text-gray-500 mt-1">📝 Special Instructions : <strong> {item.special_instructions}</strong></p>
                          )}
                        </div>
                      </div>
                      <p className="font-medium">
                        {(parseFloat(item.price_per_unit) * item.quantity).toFixed(2)} MAD
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Order History</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <OrderHistoryTimeline history={orderHistory} />
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Bulk Update Status</h2>
            <p className="text-sm text-gray-600 mb-4">
              Update {selectedOrders.length} selected order(s)
            </p>
            <div className="space-y-2">
              {['Pending', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => handleBulkUpdate(status)}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 border border-gray-200"
                  >
                    {status}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setShowBulkModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && selectedOrder && (
        <ConfirmDialog
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={() => {
            const reason = prompt('Enter cancellation reason (optional):')
            handleCancelOrder(selectedOrder.order.id, reason || 'No reason provided')
          }}
          title="Cancel Order"
          message={`Are you sure you want to cancel order ${selectedOrder.order.order_number}?`}
          confirmText="Cancel Order"
          cancelText="Keep Order"
          type="danger"
        />
      )}

      {/* Payment Status Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Update Payment Status</h2>
            <div className="space-y-2">
              {['Paid', 'Unpaid', 'Refunded'].map((status) => (
                <button
                  key={status}
                  onClick={() => handlePaymentStatusUpdate(selectedOrder.order.id, status)}
                  className={`w-full text-left px-4 py-2 rounded-lg ${selectedOrder.order.payment_status === status
                      ? 'bg-primary-100 text-primary-700'
                      : 'hover:bg-gray-50'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Edit Order</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={editFormData.status || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Pending">Pending</option>
                  <option value="Preparing">Preparing</option>
                  <option value="OutForDelivery">Out For Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Payment Status</label>
                <select
                  value={editFormData.payment_status || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Delivery Address</label>
                <input
                  type="text"
                  value={editFormData.delivery_address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, delivery_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Total Price (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.total_price || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, total_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Delivery Fee (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.delivery_fee || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, delivery_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Discount (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.discount || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Final Price (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.final_price || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, final_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Delivery Man</label>
                <select
                  value={editFormData.delivery_man_id || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, delivery_man_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">No delivery man assigned</option>
                  {deliveryMen.map((dm) => (
                    <option key={dm.id} value={dm.id}>
                      {dm.name} - {dm.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Update Order Status</h2>
            <div className="space-y-2">
              {['Pending', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(selectedOrder.order.id, status)}
                    className={`w-full text-left px-4 py-2 rounded-lg ${selectedOrder.order.status === status
                        ? 'bg-primary-100 text-primary-700'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setShowStatusModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Assign Delivery Man Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Assign Delivery Man</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {deliveryMen.map((dm) => (
                <button
                  key={dm.id}
                  onClick={() => handleAssignDeliveryMan(selectedOrder.order.id, dm.id)}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 border border-gray-200"
                >
                  <p className="font-medium">{dm.name}</p>
                  <p className="text-sm text-gray-500">{dm.phone}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAssignModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

