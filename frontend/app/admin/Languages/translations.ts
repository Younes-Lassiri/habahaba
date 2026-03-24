// translations.ts
// Bilingual translation file for Admin Panel
// Supports: English (en) | Arabic (ar)

const translations = {
  en: {
    // ─── Common / Shared ───────────────────────────────────────────────────────
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save Changes',
      close: 'Close',
      confirm: 'Confirm',
      logout: 'Logout',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      assign: 'Assign',
      active: 'Active',
      inactive: 'Inactive',
      off: 'Off',
      on: 'On',
      open: 'Open',
      closed: 'Closed',
      today: 'Today',
      minutes: 'minutes',
      total: 'Total',
      distance: 'Distance',
      estTime: 'Est. Time',
      nearest: 'Nearest',
      currency: 'MAD',
      noPhone: 'No phone',
      retry: 'Retry',
      refresh: 'Refresh',
      sessionExpired: 'Session Expired',
      sessionExpiredMessage: 'Please login again',
      noPhoneNumber: 'No Phone Number',
      noPhoneNumberMessage: 'does not have a phone number available.',
      unableToCall: 'Unable to make phone calls on this device',
      failedToOpenDialer: 'Failed to open phone dialer',
    },

    // ─── Layout / Header ────────────────────────────────────────────────────────
    layout: {
      adminPanel: 'Admin Panel',
      connected: 'Connected',
      disconnected: 'Disconnected',
      logoutTitle: 'Logout',
      logoutMessage: 'Are you sure you want to logout?',
    },

    // ─── Bottom Navigation ──────────────────────────────────────────────────────
    nav: {
      orders: 'Orders',
      products: 'Products',
      settings: 'Settings',
      logout: 'Logout',
    },

    // ─── Notifications Panel ────────────────────────────────────────────────────
    notifications: {
      title: 'Notifications',
      unread: 'Unread',
      total: 'Total',
      markAllRead: 'Mark all read',
      clearAll: 'Clear all',
      clearAllTitle: 'Clear All Notifications',
      clearAllMessage: 'Are you sure you want to clear all notifications?',
      allMarkedRead: 'All notifications marked as read',
      empty: 'No notifications yet',
      emptySubtext: 'New orders and alerts will appear here',
      justNow: 'Just now',
      minutesAgo: 'm ago',
      hoursAgo: 'h ago',
    },

    // ─── Orders Screen ──────────────────────────────────────────────────────────
    orders: {
      title: 'Orders',
      noOrders: 'No orders found',
      noOrdersSubtext: 'Orders will appear here when customers place them',
      errorLoading: 'Failed to fetch orders',
      loginRequired: 'Please login as admin first',

      // Status labels
      status: {
        all: 'All',
        pending: 'Pending',
        preparing: 'Preparing',
        outForDelivery: 'Out for Delivery',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
      },

      // Order card
      card: {
        orderNumber: 'Order #',
        customer: 'Customer',
        address: 'Address',
        paymentStatus: 'Payment',
        paid: 'Paid',
        unpaid: 'Unpaid',
        noAddress: 'No address provided',
        deliveryMan: 'Driver',
        noDriver: 'No driver assigned',
        advanceToNextStatus: 'Advance to next status',
        subtotal: 'Subtotal',
        deliveryFee: 'Delivery Fee',
        discount: 'Discount',
        totalAmount: 'Total Amount',
      },

      // Order detail modal
      detail: {
        title: 'Order Details',
        orderInfo: 'Order Information',
        customerInfo: 'Customer Information',
        deliveryInfo: 'Delivery Information',
        orderItems: 'Order Items',
        paymentSummary: 'Payment Summary',
        quantity: 'Quantity',
        unitPrice: 'Unit Price',
        note: '📝 Note',
        noItems: 'No items found',
        specialInstructions: 'Special Instructions',
        customerInfoTitle: 'Customer Information',
        noCustomerInfo: 'Customer information not available',
      },

      // Actions
      actions: {
        updateStatus: 'Update Status',
        assignDriver: 'Assign Driver',
        failedUpdateStatus: 'Failed to update order status',
        failedAssignDriver: 'Failed to assign delivery man',
        driverAssigned: 'Delivery man assigned successfully',
        callCustomer: 'Call Customer',
        callDriver: 'Call Driver',
        viewOnMap: 'View on Map',
      },

      // Assign driver modal
      assignDriver: {
        title: '🚚 Assign Delivery Driver',
        subtitle: '📍 Drivers sorted by distance from restaurant',
        noActiveDrivers: 'No Active Drivers',
        noActiveDriversText: 'There are no active delivery drivers available at the moment.',
        locationUnknown: '📍 Location unknown',
        km: 'km',
      },

      // Preparation time modal
      prepTime: {
        title: 'Set Preparation Time',
        label: '⏱️ How long will it take to prepare this order?',
        sublabel: 'Use +/- buttons to set preparation time',
        minutesLabel: 'minutes',
        confirmButton: 'Confirm & Start Preparing',
        invalidTime: 'Invalid Time',
        invalidTimeMessage: 'Please enter a valid preparation time in minutes',
        orderSummaryTitle: 'Order #',
        moreItems: 'more items',
        totalAmount: 'Total Amount:',
        qty: 'Qty',
        countdownLabel: 'Preparation Countdown',
        countdownSubtext: 'Time remaining until order is ready',
        presets: {
          title: 'Quick Presets',
          min: 'min',
        },
      },

      // Countdown
      countdown: {
        title: 'Preparation Timer',
        ready: 'Order should be ready!',
        remaining: 'remaining',
      },

      // Clusters
      clusters: {
        title: 'Order Clusters',
        generate: 'Generate Clusters',
        generating: 'Generating...',
        generatedTitle: 'Clusters Generated',
        generatedMessage: (count: number, ordersCount: number) =>
          `Created ${count} cluster(s) from ${ordersCount} orders.\n\nTap on a cluster to view details and assign a driver.`,
        noOrders: 'No Orders',
        noOrdersText:
          'No orders available for clustering. Orders must be Pending or Preparing, have location data, and not be assigned to a driver.',
        noClusters: 'No clusters generated',
        noClustersSubtext:
          'Clusters are created from Pending/Preparing orders with location data',
        assignDriver: 'Assign Driver',
        assigned: '✓ Assigned',
        unassigned: 'Assign',
        detailTitle: '📦 Cluster Details',
        orders: 'orders',
        direction: 'direction',
        deliveryRoute: 'Delivery Route',
        assignDriverSection: 'Assign Driver',
        total: 'Total',
        errorNoLocation:
          'Restaurant location not set. Please configure restaurant settings first.',
      },

      // Error states
      error: {
        loadingFailed: 'Failed to load orders',
        statusUpdateFailed: 'Failed to update order status',
      },
    },

    // ─── Products Screen ────────────────────────────────────────────────────────
    products: {
      title: 'Products & Categories',
      subtitle: 'Manage your menu',
      tabProducts: 'Products',
      tabCategories: 'Categories',
      loading: 'Loading...',
      noProducts: 'No products found',
      noCategories: 'No categories found',
      uncategorized: 'Uncategorized',
      bestFor: '🍽️ Best for',
      active: 'Active',
      off: 'Off',
      inactive: 'Inactive',
      failedToggleProduct: 'Failed to update product availability',
      failedToggleCategory: 'Failed to update category status',
    },

    // ─── Settings Screen ────────────────────────────────────────────────────────
    settings: {
      title: 'Settings',
      subtitle: 'Restaurant configuration',
      loading: 'Loading settings...',

      // Sections
      restaurantStatus: 'Restaurant Status',
      operatingHours: 'Operating Hours',
      restaurantInfo: 'Restaurant Information',
      account: 'Account',

      // Restaurant status card
      openForBusiness: 'Open for Business',
      closedStatus: 'Closed',
      customersCanOrder: 'Customers can place orders',
      customersCannotOrder: 'Customers cannot place orders',
      loadingStatus: 'Loading restaurant status...',
      restaurantNowOpen: (status: boolean) =>
        `Restaurant is now ${status ? 'OPEN' : 'CLOSED'} for business`,
      settingsLoadError: 'Please wait for settings to load',

      // Current open status
      currently: 'Currently',
      currentlyOpen: 'Currently OPEN',
      currentlyClosed: 'Currently CLOSED',
      opens: 'Opens',
      at: 'at',
      loadingHours: 'Loading operating hours...',
      hoursNote: 'Restaurant status updates automatically based on these hours',

      // Restaurant info labels
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      deliveryFee: 'Delivery Fee',
      adminEmail: 'Admin Email',

      // Edit hours modal
      editHoursTitle: 'Edit Hours',
      closedThisDay: 'Closed this day',
      openingTime: 'Opening Time',
      closingTime: 'Closing Time',
      timeHint: 'Tap + or - to adjust by 30 minutes',
      quickPresets: 'Quick Presets:',
      saveSuccess: 'hours updated successfully',
      saveFailed: 'Failed to save operating hours',
      loadFailed: 'Failed to load operating hours. Please restart the backend server.',

      // Day names
      days: {
        closed: 'Closed',
        today: 'Today',
      },

      // Logout button
      logoutButton: 'Logout',
      logoutTitle: 'Logout',
      logoutMessage: 'Are you sure you want to logout?',

      // Footer
      footerVersion: 'Admin Dashboard v1.0',
      footerSubtext: 'Restaurant Management System',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ARABIC TRANSLATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  ar: {
    // ─── Common / Shared ───────────────────────────────────────────────────────
    common: {
      loading: 'جارٍ التحميل...',
      error: 'خطأ',
      success: 'نجاح',
      cancel: 'إلغاء',
      save: 'حفظ التغييرات',
      close: 'إغلاق',
      confirm: 'تأكيد',
      logout: 'تسجيل الخروج',
      yes: 'نعم',
      no: 'لا',
      ok: 'موافق',
      assign: 'تعيين',
      active: 'نشط',
      inactive: 'غير نشط',
      off: 'إيقاف',
      on: 'تشغيل',
      open: 'مفتوح',
      closed: 'مغلق',
      today: 'اليوم',
      minutes: 'دقيقة',
      total: 'المجموع',
      distance: 'المسافة',
      estTime: 'الوقت المقدر',
      nearest: 'الأقرب',
      currency: 'درهم',
      noPhone: 'لا يوجد هاتف',
      retry: 'إعادة المحاولة',
      refresh: 'تحديث',
      sessionExpired: 'انتهت الجلسة',
      sessionExpiredMessage: 'الرجاء تسجيل الدخول مجدداً',
      noPhoneNumber: 'لا يوجد رقم هاتف',
      noPhoneNumberMessage: 'لا يتوفر رقم هاتف لهذا الشخص.',
      unableToCall: 'لا يمكن إجراء مكالمات هاتفية على هذا الجهاز',
      failedToOpenDialer: 'فشل فتح لوحة الاتصال',
    },

    // ─── Layout / Header ────────────────────────────────────────────────────────
    layout: {
      adminPanel: 'لوحة الإدارة',
      connected: 'متصل',
      disconnected: 'غير متصل',
      logoutTitle: 'تسجيل الخروج',
      logoutMessage: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
    },

    // ─── Bottom Navigation ──────────────────────────────────────────────────────
    nav: {
      orders: 'الطلبات',
      products: 'المنتجات',
      settings: 'الإعدادات',
      logout: 'تسجيل الخروج',
    },

    // ─── Notifications Panel ────────────────────────────────────────────────────
    notifications: {
      title: 'الإشعارات',
      unread: 'غير مقروء',
      total: 'المجموع',
      markAllRead: 'تحديد الكل كمقروء',
      clearAll: 'مسح الكل',
      clearAllTitle: 'مسح جميع الإشعارات',
      clearAllMessage: 'هل أنت متأكد أنك تريد مسح جميع الإشعارات؟',
      allMarkedRead: 'تم تحديد جميع الإشعارات كمقروءة',
      empty: 'لا توجد إشعارات بعد',
      emptySubtext: 'ستظهر الطلبات الجديدة والتنبيهات هنا',
      justNow: 'الآن',
      minutesAgo: 'د مضت',
      hoursAgo: 'س مضت',
    },

    // ─── Orders Screen ──────────────────────────────────────────────────────────
    orders: {
      title: 'الطلبات',
      noOrders: 'لم يتم العثور على طلبات',
      noOrdersSubtext: 'ستظهر الطلبات هنا عندما يقوم العملاء بتقديمها',
      errorLoading: 'فشل في جلب الطلبات',
      loginRequired: 'يرجى تسجيل الدخول كمسؤول أولاً',

      // Status labels
      status: {
        all: 'الكل',
        pending: 'قيد الانتظار',
        preparing: 'قيد التحضير',
        outForDelivery: 'في الطريق',
        delivered: 'تم التسليم',
        cancelled: 'ملغي',
      },

      // Order card
      card: {
        orderNumber: 'طلب رقم #',
        customer: 'العميل',
        address: 'العنوان',
        paymentStatus: 'الدفع',
        paid: 'مدفوع',
        unpaid: 'غير مدفوع',
        noAddress: 'لم يتم تحديد عنوان',
        deliveryMan: 'السائق',
        noDriver: 'لم يُعيَّن سائق',
        advanceToNextStatus: 'الانتقال إلى الحالة التالية',
        subtotal: 'المجموع الفرعي',
        deliveryFee: 'رسوم التوصيل',
        discount: 'الخصم',
        totalAmount: 'المبلغ الإجمالي',
      },

      // Order detail modal
      detail: {
        title: 'تفاصيل الطلب',
        orderInfo: 'معلومات الطلب',
        customerInfo: 'معلومات العميل',
        deliveryInfo: 'معلومات التوصيل',
        orderItems: 'عناصر الطلب',
        paymentSummary: 'ملخص الدفع',
        quantity: 'الكمية',
        unitPrice: 'سعر الوحدة',
        note: '📝 ملاحظة',
        noItems: 'لا توجد عناصر',
        specialInstructions: 'تعليمات خاصة',
        customerInfoTitle: 'معلومات العميل',
        noCustomerInfo: 'معلومات العميل غير متاحة',
      },

      // Actions
      actions: {
        updateStatus: 'تحديث الحالة',
        assignDriver: 'تعيين سائق',
        failedUpdateStatus: 'فشل في تحديث حالة الطلب',
        failedAssignDriver: 'فشل في تعيين عامل التوصيل',
        driverAssigned: 'تم تعيين عامل التوصيل بنجاح',
        callCustomer: 'اتصل بالعميل',
        callDriver: 'اتصل بالسائق',
        viewOnMap: 'عرض على الخريطة',
      },

      // Assign driver modal
      assignDriver: {
        title: '🚚 تعيين سائق توصيل',
        subtitle: '📍 السائقون مرتبون حسب المسافة من المطعم',
        noActiveDrivers: 'لا يوجد سائقون نشطون',
        noActiveDriversText: 'لا يوجد سائقو توصيل نشطون متاحون في الوقت الحالي.',
        locationUnknown: '📍 الموقع غير معروف',
        km: 'كم',
      },

      // Preparation time modal
      prepTime: {
        title: 'تحديد وقت التحضير',
        label: '⏱️ كم من الوقت سيستغرق تحضير هذا الطلب؟',
        sublabel: 'استخدم أزرار +/- لتحديد وقت التحضير',
        minutesLabel: 'دقيقة',
        confirmButton: 'تأكيد وبدء التحضير',
        invalidTime: 'وقت غير صالح',
        invalidTimeMessage: 'الرجاء إدخال وقت تحضير صحيح بالدقائق',
        orderSummaryTitle: 'طلب رقم #',
        moreItems: 'عناصر إضافية',
        totalAmount: 'المبلغ الإجمالي:',
        qty: 'الكمية',
        countdownLabel: 'عداد التحضير',
        countdownSubtext: 'الوقت المتبقي حتى يكون الطلب جاهزاً',
        presets: {
          title: 'اختيارات سريعة',
          min: 'دقيقة',
        },
      },

      // Countdown
      countdown: {
        title: 'مؤقت التحضير',
        ready: 'يجب أن يكون الطلب جاهزاً!',
        remaining: 'متبقي',
      },

      // Clusters
      clusters: {
        title: 'مجموعات الطلبات',
        generate: 'إنشاء مجموعات',
        generating: 'جارٍ الإنشاء...',
        generatedTitle: 'تم إنشاء المجموعات',
        generatedMessage: (count: number, ordersCount: number) =>
          `تم إنشاء ${count} مجموعة من ${ordersCount} طلب.\n\nاضغط على المجموعة لعرض التفاصيل وتعيين سائق.`,
        noOrders: 'لا توجد طلبات',
        noOrdersText:
          'لا توجد طلبات متاحة للتجميع. يجب أن تكون الطلبات قيد الانتظار أو التحضير، وتحتوي على بيانات الموقع، وغير معينة لسائق.',
        noClusters: 'لم يتم إنشاء مجموعات',
        noClustersSubtext:
          'يتم إنشاء المجموعات من الطلبات قيد الانتظار/التحضير التي تحتوي على بيانات الموقع',
        assignDriver: 'تعيين سائق',
        assigned: '✓ تم التعيين',
        unassigned: 'تعيين',
        detailTitle: '📦 تفاصيل المجموعة',
        orders: 'طلبات',
        direction: 'اتجاه',
        deliveryRoute: 'مسار التوصيل',
        assignDriverSection: 'تعيين سائق',
        total: 'المجموع',
        errorNoLocation:
          'لم يتم تحديد موقع المطعم. الرجاء ضبط إعدادات المطعم أولاً.',
      },

      // Error states
      error: {
        loadingFailed: 'فشل في تحميل الطلبات',
        statusUpdateFailed: 'فشل في تحديث حالة الطلب',
      },
    },

    // ─── Products Screen ────────────────────────────────────────────────────────
    products: {
      title: 'المنتجات والفئات',
      subtitle: 'إدارة قائمتك',
      tabProducts: 'المنتجات',
      tabCategories: 'الفئات',
      loading: 'جارٍ التحميل...',
      noProducts: 'لم يتم العثور على منتجات',
      noCategories: 'لم يتم العثور على فئات',
      uncategorized: 'غير مصنف',
      bestFor: '🍽️ الأنسب لـ',
      active: 'نشط',
      off: 'إيقاف',
      inactive: 'غير نشط',
      failedToggleProduct: 'فشل في تحديث توفر المنتج',
      failedToggleCategory: 'فشل في تحديث حالة الفئة',
    },

    // ─── Settings Screen ────────────────────────────────────────────────────────
    settings: {
      title: 'الإعدادات',
      subtitle: 'إعداد المطعم',
      loading: 'جارٍ تحميل الإعدادات...',

      // Sections
      restaurantStatus: 'حالة المطعم',
      operatingHours: 'ساعات العمل',
      restaurantInfo: 'معلومات المطعم',
      account: 'الحساب',

      // Restaurant status card
      openForBusiness: 'مفتوح للعمل',
      closedStatus: 'مغلق',
      customersCanOrder: 'يمكن للعملاء تقديم الطلبات',
      customersCannotOrder: 'لا يمكن للعملاء تقديم الطلبات',
      loadingStatus: 'جارٍ تحميل حالة المطعم...',
      restaurantNowOpen: (status: boolean) =>
        `المطعم الآن ${status ? 'مفتوح' : 'مغلق'} للعمل`,
      settingsLoadError: 'الرجاء الانتظار حتى تكتمل الإعدادات',

      // Current open status
      currently: 'حالياً',
      currentlyOpen: 'مفتوح حالياً',
      currentlyClosed: 'مغلق حالياً',
      opens: 'يفتح',
      at: 'في',
      loadingHours: 'جارٍ تحميل ساعات العمل...',
      hoursNote: 'تتحدث حالة المطعم تلقائياً بناءً على هذه الأوقات',

      // Restaurant info labels
      name: 'الاسم',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      deliveryFee: 'رسوم التوصيل',
      adminEmail: 'البريد الإلكتروني للمسؤول',

      // Edit hours modal
      editHoursTitle: 'تعديل الأوقات',
      closedThisDay: 'مغلق في هذا اليوم',
      openingTime: 'وقت الفتح',
      closingTime: 'وقت الإغلاق',
      timeHint: 'اضغط + أو - للضبط بمقدار 30 دقيقة',
      quickPresets: 'اختيارات سريعة:',
      saveSuccess: 'تم تحديث الأوقات بنجاح',
      saveFailed: 'فشل في حفظ ساعات العمل',
      loadFailed: 'فشل في تحميل ساعات العمل. الرجاء إعادة تشغيل الخادم.',

      // Day names
      days: {
        closed: 'مغلق',
        today: 'اليوم',
      },

      // Logout button
      logoutButton: 'تسجيل الخروج',
      logoutTitle: 'تسجيل الخروج',
      logoutMessage: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',

      // Footer
      footerVersion: 'لوحة الإدارة v1.0',
      footerSubtext: 'نظام إدارة المطعم',
    },
  },
};

export default translations;