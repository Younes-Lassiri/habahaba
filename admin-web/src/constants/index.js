// Order Status Constants
export const ORDER_STATUS = {
  PENDING: 'Pending',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'OutForDelivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_OPTIONS = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
]

// Payment Status Constants
export const PAYMENT_STATUS = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  REFUNDED: 'Refunded',
}

export const PAYMENT_STATUS_OPTIONS = [
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.UNPAID,
  PAYMENT_STATUS.REFUNDED,
]

// User Status Constants
export const USER_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  VERIFIED: 'Verified',
  UNVERIFIED: 'Unverified',
}

// Vehicle Types
export const VEHICLE_TYPES = {
  BICYCLE: 'Bicycle',
  MOTORCYCLE: 'Motorcycle',
  CAR: 'Car',
  VAN: 'Van',
}

export const VEHICLE_TYPE_OPTIONS = [
  VEHICLE_TYPES.BICYCLE,
  VEHICLE_TYPES.MOTORCYCLE,
  VEHICLE_TYPES.CAR,
  VEHICLE_TYPES.VAN,
]

// Status Colors
export const STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [ORDER_STATUS.PREPARING]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'bg-purple-100 text-purple-800 border-purple-200',
  [ORDER_STATUS.DELIVERED]: 'bg-green-100 text-green-800 border-green-200',
  [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
  [PAYMENT_STATUS.PAID]: 'bg-green-100 text-green-800 border-green-200',
  [PAYMENT_STATUS.UNPAID]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [PAYMENT_STATUS.REFUNDED]: 'bg-red-100 text-red-800 border-red-200',
}

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Toast Duration
export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 3000,
  LONG: 5000,
}

// Date Range Presets
export const DATE_RANGE_PRESETS = {
  LAST_7_DAYS: 7,
  LAST_30_DAYS: 30,
  LAST_90_DAYS: 90,
  LAST_365_DAYS: 365,
}

// API Timeouts
export const API_TIMEOUT = 30000 // 30 seconds

// File Upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']



