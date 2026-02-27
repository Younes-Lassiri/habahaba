import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { OrderCardSkeleton } from '@/components/ui/skeleton';
import * as Haptics from 'expo-haptics';
import { useDispatch } from 'react-redux';
import { addItem } from './redux/slices/orderSlice';

// Types
type OrderStatus = 'pending' | 'preparing' | 'outForDelivery' | 'delivered' | 'canceled';

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  product_id?: number;
  product_image?: string;
}

interface OrderRating {
  foodQuality: number;
  deliveryService: number;
  comment?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  restaurant: string;
  status: OrderStatus;
  items: OrderItem[];
  orderDate: string;
  estimatedDelivery?: string;
  deliveryTime?: string;
  total: number;
  rating?: OrderRating;
  created_at?: string;
  updated_at?: string;
}

// Status mapping from backend to frontend
const mapBackendStatus = (backendStatus: string): OrderStatus => {
  const statusMap: Record<string, OrderStatus> = {
    'Pending': 'pending',
    'Preparing': 'preparing',
    'OutForDelivery': 'outForDelivery',
    'Out for Delivery': 'outForDelivery',
    'Out-for-delivery': 'outForDelivery',
    'Delivered': 'delivered',
    'Cancelled': 'canceled',
    'Canceled': 'canceled',
  };
  return statusMap[backendStatus] || 'pending';
};

export default function ReorderScreen() {
  const { userLanguage } = useLocalSearchParams();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurant_name, setRestaurant_name] = useState<string>('');
  const [restaurant_phone, setRestaurant_phone] = useState<string>('');

  // Determine if language is Arabic
  const isRTL = userLanguage === 'arabic';

  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.id) {
        if (showLoading) setLoading(false);
        router.replace('/signin');
        return;
      }

      const res = await axios.get(`https://haba-haba-api.ubua.cloud/api/auth/get-orders`, {
        params: { user_id: user.id },
      });

      const transformedOrders = (res.data.orders || [])
        .map((order: any) => {
          const orderDate = new Date(order.created_at);
          const now = new Date();
          const isToday = orderDate.toDateString() === now.toDateString();

          const formatOrderDate = () => {
            const time = orderDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });

            if (isToday) {
              return isRTL ? `اليوم، ${time}` : `Today, ${time}`;
            } else {
              const dayName = isRTL 
                ? getArabicDayName(orderDate.getDay())
                : orderDate.toLocaleDateString('en-US', { weekday: 'long' });
              return `${dayName}، ${time}`;
            }
          };

          const getArabicDayName = (dayIndex: number): string => {
            const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            return days[dayIndex];
          };

          const mappedStatus = mapBackendStatus(order.status || 'Pending');

          return {
            id: order.id?.toString() || '',
            orderNumber: order.order_number || `ORD-${order.id}`,
            restaurant: res.data.restaurant_name,
            status: mappedStatus,
            items: (order.order_items || []).map((item: any) => ({
              name: item.product_name || `Product #${item.product_id}`,
              quantity: item.quantity || 1,
              price: item.price || item.price_per_unit || 0,
              product_id: item.product_id,
              product_image: item.product_image,
            })),
            orderDate: formatOrderDate(),
            deliveryTime: order.delivered_at
              ? isRTL 
                ? formatArabicDateTime(new Date(order.delivered_at))
                : new Date(order.delivered_at).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              : undefined,
            total: parseFloat(order.final_price || order.total_price || 0),
            rating: order.rating ? {
              foodQuality: order.rating.food_quality || 0,
              deliveryService: order.rating.delivery_service || 0,
              comment: order.rating.comment,
            } : undefined,
            created_at: order.created_at,
            updated_at: order.updated_at,
          };
        })
        .filter((order: Order) => order.status === 'delivered' || order.status === 'canceled');

      setOrders(transformedOrders);
      setRestaurant_name(res.data.restaurant_name);
      setRestaurant_phone(res.data.restaurant_phone);
    } catch (err: any) {
      console.error('Fetch Orders Error:', err.response?.data || err.message);
      if (showLoading) {
        Alert.alert(
          isRTL ? 'خطأ' : 'Error',
          isRTL ? 'فشل تحميل سجل الطلبات. الرجاء المحاولة مرة أخرى.' : 'Failed to fetch order history. Please try again.'
        );
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const formatArabicDateTime = (date: Date): string => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `${dayName}، ${day} ${month} ${year}، ${time}`;
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleReorder = (order: Order) => {
    // Add all items from the order to the cart
    order.items.forEach((item) => {
      if (item.product_id) {
        // Build image URL if product_image exists
        let imageUrl = item.product_image || '';
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('file://')) {
          imageUrl = `${imageUrl}`;
        }

        // Use order's restaurant name as fallback if restaurant_name is undefined
        const restaurantName = restaurant_name || order.restaurant || 'Restaurant';

        dispatch(
          addItem({
            id: item.product_id,
            name: item.name,
            description: '', // Provide empty string for description
            price: item.price || 0,
            quantity: item.quantity,
            image: imageUrl,
            restaurant: restaurantName,
            discount_applied: false,
            original_price: item.price || 0,
            offer_info: null,
            specialInstructions: '',
            showSpecialInstructions: false
          })
        );
      }
    });

    // Show success feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      isRTL ? 'نجاح' : 'Success',
      isRTL ? 'تمت إضافة العناصر إلى السلة!' : 'Items added to cart!'
    );
  };

  const openRatingModal = (order: Order) => {
    setSelectedOrder(order);
    if (order.rating) {
      setFoodRating(order.rating.foodQuality);
      setDeliveryRating(order.rating.deliveryService);
      setComment(order.rating.comment || '');
    } else {
      setFoodRating(0);
      setDeliveryRating(0);
      setComment('');
    }
    setRatingModalVisible(true);
  };

  const closeRatingModal = () => {
    setRatingModalVisible(false);
    setSelectedOrder(null);
    setFoodRating(0);
    setDeliveryRating(0);
    setComment('');
  };

  const handleSubmitRating = async () => {
    if (!selectedOrder || foodRating === 0 || deliveryRating === 0) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'يرجى تقييم جودة الطعام وخدمة التوصيل' : 'Please rate both Food Quality and Delivery Service'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user data
      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.id) {
        Alert.alert(
          isRTL ? 'خطأ' : 'Error',
          isRTL ? 'لم يتم العثور على المستخدم. الرجاء تسجيل الدخول مرة أخرى.' : 'User not found. Please log in again.'
        );
        setIsSubmitting(false);
        return;
      }

      // Submit rating to backend
      const response = await axios.post(
        'https://haba-haba-api.ubua.cloud/api/auth/submit-rating',
        {
          order_id: parseInt(selectedOrder.id),
          user_id: user.id,
          food_quality: foodRating,
          delivery_service: deliveryRating,
          comment: comment.trim() || null,
        }
      );

      if (response.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeRatingModal();

        // Refresh orders to get updated rating from backend
        await fetchOrders(false);

        Alert.alert(
          isRTL ? 'نجاح' : 'Success',
          isRTL ? 'شكرًا لك على ملاحظاتك!' : 'Thank you for your feedback!'
        );
      } else {
        Alert.alert(
          isRTL ? 'خطأ' : 'Error',
          response.data.message || (isRTL ? 'فشل إرسال التقييم' : 'Failed to submit rating')
        );
      }
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        error.response?.data?.message || (isRTL ? 'فشل إرسال التقييم. الرجاء المحاولة مرة أخرى.' : 'Failed to submit rating. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchOrders();
    setRefreshing(false);
  };

  const renderStars = (rating: number, onPress: (value: number) => void, size: number = 24) => {
    return (
      <View style={[styles.starsContainer, isRTL && styles.starsContainerAr]}>
        {[1, 2, 3, 4, 5].map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => {
              onPress(value);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={value <= rating ? 'star' : 'star-outline'}
              size={size}
              color={value <= rating ? Colors.warning : Colors.gray[300]}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getStatusConfig = (status: OrderStatus) => {
    const STATUS_CONFIG_EN: Record<string, {
      text: string;
      color: string;
      icon: string;
      description: string;
      progress: number;
    }> = {
      pending: {
        text: 'Pending',
        color: Colors.gray[400],
        icon: 'time-outline',
        description: 'Your order is being confirmed',
        progress: 10,
      },
      preparing: {
        text: 'Preparing',
        color: Colors.warning,
        icon: 'restaurant-outline',
        description: 'Chef is preparing your order',
        progress: 40,
      },
      outForDelivery: {
        text: 'Out for Delivery',
        color: '#2196F3',
        icon: 'bicycle-outline',
        description: 'Your order is on the way',
        progress: 75,
      },
      delivered: {
        text: 'Delivered',
        color: Colors.success,
        icon: 'checkmark-circle-outline',
        description: 'Order delivered successfully',
        progress: 100,
      },
      canceled: {
        text: 'Canceled',
        color: Colors.error,
        icon: 'close-circle-outline',
        description: 'Order has been canceled',
        progress: 0,
      },
    };

    const STATUS_CONFIG_AR: Record<string, {
      text: string;
      color: string;
      icon: string;
      description: string;
      progress: number;
    }> = {
      pending: {
        text: 'قيد الانتظار',
        color: Colors.gray[400],
        icon: 'time-outline',
        description: 'طلبك قيد التأكيد',
        progress: 10,
      },
      preparing: {
        text: 'قيد التحضير',
        color: Colors.warning,
        icon: 'restaurant-outline',
        description: 'الطاهي يحضر طلبك',
        progress: 40,
      },
      outForDelivery: {
        text: 'خارج للتوصيل',
        color: '#2196F3',
        icon: 'bicycle-outline',
        description: 'طلبك في الطريق',
        progress: 75,
      },
      delivered: {
        text: 'تم التوصيل',
        color: Colors.success,
        icon: 'checkmark-circle-outline',
        description: 'تم توصيل الطلب بنجاح',
        progress: 100,
      },
      canceled: {
        text: 'ملغي',
        color: Colors.error,
        icon: 'close-circle-outline',
        description: 'تم إلغاء الطلب',
        progress: 0,
      },
    };

    return isRTL ? STATUS_CONFIG_AR[status] || STATUS_CONFIG_AR.pending : 
                    STATUS_CONFIG_EN[status] || STATUS_CONFIG_EN.pending;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Fixed Header - Back arrow on left, title aligned right in Arabic */}
      <View style={[styles.header, isRTL && styles.headerAr]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.titleAr]}>
          {isRTL ? 'سجل الطلبات' : 'Order History'}
        </Text>
        <View style={[styles.headerRight, isRTL && styles.headerRightAr]} />
      </View>

      {/* Scrollable Orders Section */}
      <ScrollView
        style={styles.ordersScrollView}
        contentContainerStyle={styles.ordersContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3].map((item) => (
              <OrderCardSkeleton key={item} />
            ))}
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={[Colors.primary + '20', Colors.primary + '05']}
              style={styles.emptyStateGradient}
            >
              <Ionicons
                name="receipt-outline"
                size={64}
                color={Colors.primary}
              />
              <Text style={[styles.emptyStateText, isRTL && styles.emptyStateTextAr]}>
                {isRTL ? 'لا يوجد سجل طلبات' : 'No order history'}
              </Text>
              <Text style={[styles.emptyStateSubtext, isRTL && styles.emptyStateSubtextAr]}>
                {isRTL ? 'ستظهر طلباتك المكتملة هنا' : 'Your completed orders will appear here'}
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push('/')}
              >
                <Text style={styles.emptyStateButtonText}>
                  {isRTL ? 'تصفح القائمة' : 'Browse Menu'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);

            return (
              <View key={order.id} style={[styles.orderCard, isRTL && styles.orderCardAr]}>
                {/* Order Header */}
                <View style={[styles.orderHeader, isRTL && styles.orderHeaderAr]}>
                  <View style={[styles.orderHeaderLeft, isRTL && styles.orderHeaderLeftAr]}>
                    <View style={[styles.orderNumberContainer, isRTL && styles.orderNumberContainerAr]}>
                      <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
                      <Text style={[styles.orderNumber, isRTL && styles.orderNumberAr]}>
                        {order.orderNumber}
                      </Text>
                    </View>
                    <Text style={[styles.orderRestaurant, isRTL && styles.orderRestaurantAr]}>
                      {order.restaurant}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }, isRTL && styles.statusBadgeAr]}>
                    <Ionicons
                      name={statusConfig.icon as any}
                      size={14}
                      color={statusConfig.color}
                      style={[isRTL && { marginLeft: 4, marginRight: 0 }]}
                    />
                    <Text style={[styles.statusText, { color: statusConfig.color }, isRTL && styles.statusTextAr]}>
                      {statusConfig.text}
                    </Text>
                  </View>
                </View>

                {/* Order Items */}
                <View style={[styles.orderItems, isRTL && styles.orderItemsAr]}>
                  {order.items.slice(0, 3).map((item, idx) => (
                    <View key={idx} style={[styles.orderItemRow, isRTL && styles.orderItemRowAr]}>
                      <View style={[styles.orderItemBullet, isRTL && styles.orderItemBulletAr]} />
                      <Text style={[styles.orderItem, isRTL && styles.orderItemAr]}>
                        {item.quantity}x {item.name}
                      </Text>
                    </View>
                  ))}
                  {order.items.length > 3 && (
                    <Text style={[styles.orderItemMore, isRTL && styles.orderItemMoreAr]}>
                      +{order.items.length - 3} {isRTL ? 'عنصر إضافي' : 'more item'}{order.items.length - 3 > 1 ? (isRTL ? '' : 's') : ''}
                    </Text>
                  )}
                </View>

                {/* Order Footer */}
                <View style={[styles.orderFooter, isRTL && styles.orderFooterAr]}>
                  <View style={isRTL && styles.orderFooterTextContainerAr}>
                    <Text style={[styles.orderDate, isRTL && styles.orderDateAr]}>
                      {isRTL ? 'تم الطلب:' : 'Ordered:'} {order.orderDate}
                    </Text>
                    {order.deliveryTime && (
                      <Text style={[styles.orderDelivered, isRTL && styles.orderDeliveredAr]}>
                        {isRTL ? 'تم التوصيل:' : 'Delivered:'} {order.deliveryTime}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.orderTotal, isRTL && styles.orderTotalAr]}>
                    {order.total.toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={[styles.orderActions, isRTL && styles.orderActionsAr]}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleReorder(order);
                    }}
                  >
                    <Text style={[styles.actionButtonText, isRTL && styles.actionButtonTextAr]}>
                      {isRTL ? 'إعادة الطلب' : 'Reorder'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonWithIcon, isRTL && styles.actionButtonWithIconAr]}
                    onPress={() => openRatingModal(order)}
                  >
                    <Ionicons
                      name={order.rating ? 'create-outline' : 'star-outline'}
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={[styles.actionButtonText, isRTL && styles.actionButtonTextAr]}>
                      {order.rating ? (isRTL ? 'تحديث التقييم' : 'Update Rating') : (isRTL ? 'تقييم الطلب' : 'Rate Order')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Rating Display */}
                {order.rating && (
                  <LinearGradient
                    colors={[Colors.warning + '15', Colors.primary + '08']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ratingDisplay}
                  >
                    <View style={[styles.ratingDisplayHeader, isRTL && styles.ratingDisplayHeaderAr]}>
                      <View style={styles.ratingDisplayIconContainer}>
                        <Ionicons name="star" size={20} color={Colors.warning} />
                      </View>
                      <Text style={[styles.ratingDisplayTitle, isRTL && styles.ratingDisplayTitleAr]}>
                        {isRTL ? 'تقييمك' : 'Your Rating'}
                      </Text>
                    </View>

                    <View style={styles.ratingDisplayContent}>
                      <View style={styles.ratingDisplayItem}>
                        <View style={[styles.ratingDisplayItemHeader, isRTL && styles.ratingDisplayItemHeaderAr]}>
                          <Ionicons name="restaurant" size={18} color={Colors.primary} />
                          <Text style={[styles.ratingDisplayLabel, isRTL && styles.ratingDisplayLabelAr]}>
                            {isRTL ? 'جودة الطعام' : 'Food Quality'}
                          </Text>
                        </View>
                        <View style={[styles.ratingDisplayStars, isRTL && styles.ratingDisplayStarsAr]}>
                          {renderStars(order.rating.foodQuality, () => { }, 20)}
                          <Text style={[styles.ratingDisplayValue, isRTL && styles.ratingDisplayValueAr]}>
                            {order.rating.foodQuality}/5
                          </Text>
                        </View>
                      </View>

                      <View style={styles.ratingDisplayDivider} />

                      <View style={styles.ratingDisplayItem}>
                        <View style={[styles.ratingDisplayItemHeader, isRTL && styles.ratingDisplayItemHeaderAr]}>
                          <Ionicons name="bicycle" size={18} color={Colors.primary} />
                          <Text style={[styles.ratingDisplayLabel, isRTL && styles.ratingDisplayLabelAr]}>
                            {isRTL ? 'خدمة التوصيل' : 'Delivery Service'}
                          </Text>
                        </View>
                        <View style={[styles.ratingDisplayStars, isRTL && styles.ratingDisplayStarsAr]}>
                          {renderStars(order.rating.deliveryService, () => { }, 20)}
                          <Text style={[styles.ratingDisplayValue, isRTL && styles.ratingDisplayValueAr]}>
                            {order.rating.deliveryService}/5
                          </Text>
                        </View>
                      </View>
                    </View>

                    {order.rating.comment && (
                      <View style={styles.ratingCommentContainer}>
                        <View style={[styles.ratingCommentHeader, isRTL && styles.ratingCommentHeaderAr]}>
                          <Ionicons name="chatbubble-outline" size={16} color={Colors.text.secondary} />
                          <Text style={[styles.ratingCommentLabel, isRTL && styles.ratingCommentLabelAr]}>
                            {isRTL ? 'تعليقك' : 'Your Comment'}
                          </Text>
                        </View>
                        <Text style={[styles.ratingComment, isRTL && styles.ratingCommentAr]}>
                          {order.rating.comment}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRatingModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalIcon}>
                      <Ionicons name="star" size={32} color={Colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, isRTL && styles.modalTitleAr]}>
                      {isRTL ? 'قيم تجربتك' : 'Rate Your Experience'}
                    </Text>
                    {selectedOrder && (
                      <Text style={[styles.modalSubtitle, isRTL && styles.modalSubtitleAr]}>
                        {isRTL ? 'طلب رقم' : 'Order #'}{selectedOrder.orderNumber}
                      </Text>
                    )}
                  </View>

                  <ScrollView
                    style={styles.modalBody}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.ratingSection}>
                      <Text style={[styles.ratingSectionTitle, isRTL && styles.ratingSectionTitleAr]}>
                        {isRTL ? 'جودة الطعام' : 'Food Quality'}
                      </Text>
                      {renderStars(foodRating, setFoodRating, 32)}
                    </View>

                    <View style={styles.ratingSection}>
                      <Text style={[styles.ratingSectionTitle, isRTL && styles.ratingSectionTitleAr]}>
                        {isRTL ? 'خدمة التوصيل' : 'Delivery Service'}
                      </Text>
                      {renderStars(deliveryRating, setDeliveryRating, 32)}
                    </View>

                    <View style={styles.commentSection}>
                      <Text style={[styles.commentLabel, isRTL && styles.commentLabelAr]}>
                        {isRTL ? 'تعليقات إضافية (اختياري)' : 'Additional Comments (Optional)'}
                      </Text>
                      <TextInput
                        style={[styles.commentInput, isRTL && styles.commentInputAr]}
                        placeholder={isRTL ? "شارك تجربتك..." : "Share your experience..."}
                        placeholderTextColor={Colors.text.secondary}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        maxLength={200}
                        textAlignVertical="top"
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                      <Text style={[styles.commentCounter, isRTL && styles.commentCounterAr]}>
                        {comment.length}/200 {isRTL ? 'حرف' : 'characters'}
                      </Text>
                    </View>
                  </ScrollView>

                  <View style={[styles.modalActions, isRTL && styles.modalActionsAr]}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={closeRatingModal}
                      disabled={isSubmitting}
                    >
                      <Text style={[styles.modalCancelText, isRTL && styles.modalCancelTextAr]}>
                        {isRTL ? 'إلغاء' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalSubmitButton,
                        (foodRating === 0 || deliveryRating === 0 || isSubmitting) &&
                        styles.modalSubmitButtonDisabled,
                      ]}
                      onPress={handleSubmitRating}
                      disabled={foodRating === 0 || deliveryRating === 0 || isSubmitting}
                    >
                      <Text style={[styles.modalSubmitText, isRTL && styles.modalSubmitTextAr]}>
                        {isSubmitting ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال التقييم' : 'Submit Rating')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerAr: {
    flexDirection: 'row',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  titleAr: {
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerRightAr: {
    alignItems: 'flex-start',
  },
  ordersScrollView: {
    flex: 1,
  },
  ordersContentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  skeletonContainer: {
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  orderCardAr: {
    // Optional: Add specific RTL styles for order card
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderHeaderAr: {
    flexDirection: 'row-reverse',
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderHeaderLeftAr: {
    alignItems: 'flex-end',
  },
  orderNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orderNumberContainerAr: {
    flexDirection: 'row-reverse',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  orderNumberAr: {
    textAlign: 'right',
  },
  orderRestaurant: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  orderRestaurantAr: {
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeAr: {
    flexDirection: 'row-reverse',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusTextAr: {
    textAlign: 'right',
  },
  orderItems: {
    marginBottom: 12,
    paddingLeft: 4,
  },
  orderItemsAr: {
    paddingLeft: 0,
    paddingRight: 4,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderItemRowAr: {
    flexDirection: 'row-reverse',
  },
  orderItemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  orderItemBulletAr: {
    marginRight: 0,
    marginLeft: 10,
  },
  orderItem: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
  },
  orderItemAr: {
    textAlign: 'right',
  },
  orderItemMore: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
    marginTop: 4,
    fontStyle: 'italic',
  },
  orderItemMoreAr: {
    textAlign: 'right',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  orderFooterAr: {
    flexDirection: 'row-reverse',
  },
  orderFooterTextContainerAr: {
    alignItems: 'flex-end',
  },
  orderDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  orderDateAr: {
    textAlign: 'right',
  },
  orderDelivered: {
    fontSize: 12,
    color: Colors.success,
  },
  orderDeliveredAr: {
    textAlign: 'right',
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  orderTotalAr: {
    textAlign: 'right',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  orderActionsAr: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonWithIcon: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButtonWithIconAr: {
    flexDirection: 'row-reverse',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  actionButtonTextAr: {
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateGradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateTextAr: {
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateSubtextAr: {
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  ratingDisplay: {
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.warning + '40',
    ...Platform.select({
      ios: {
        shadowColor: Colors.warning,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ratingDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  ratingDisplayHeaderAr: {
    flexDirection: 'row-reverse',
  },
  ratingDisplayIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.warning + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingDisplayTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  ratingDisplayTitleAr: {
    textAlign: 'right',
  },
  ratingDisplayContent: {
    gap: 12,
  },
  ratingDisplayItem: {
    gap: 10,
  },
  ratingDisplayItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ratingDisplayItemHeaderAr: {
    flexDirection: 'row-reverse',
  },
  ratingDisplayLabel: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600' as const,
  },
  ratingDisplayLabelAr: {
    textAlign: 'right',
  },
  ratingDisplayStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 26,
  },
  ratingDisplayStarsAr: {
    flexDirection: 'row-reverse',
    paddingLeft: 0,
    paddingRight: 26,
  },
  ratingDisplayValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.warning,
    minWidth: 32,
  },
  ratingDisplayValueAr: {
    textAlign: 'right',
  },
  ratingDisplayDivider: {
    height: 1,
    backgroundColor: Colors.border + '60',
    marginVertical: 4,
  },
  ratingCommentContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '40',
  },
  ratingCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  ratingCommentHeaderAr: {
    flexDirection: 'row-reverse',
  },
  ratingCommentLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingCommentLabelAr: {
    textAlign: 'right',
  },
  ratingComment: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
    fontStyle: 'italic',
    paddingLeft: 22,
    paddingRight: 4,
  },
  ratingCommentAr: {
    paddingLeft: 4,
    paddingRight: 22,
    textAlign: 'right',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  starsContainerAr: {
    flexDirection: 'row-reverse',
  },
  starButton: {
    padding: 2,
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  modalTitleAr: {
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  modalSubtitleAr: {
    textAlign: 'center',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  ratingSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  ratingSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  ratingSectionTitleAr: {
    textAlign: 'center',
  },
  commentSection: {
    marginTop: 8,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  commentLabelAr: {
    textAlign: 'right',
  },
  commentInput: {
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: Colors.text.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  commentInputAr: {
    textAlign: 'right',
  },
  commentCounter: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'right',
  },
  commentCounterAr: {
    textAlign: 'left',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalActionsAr: {
    flexDirection: 'row-reverse',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  modalCancelTextAr: {
    textAlign: 'center',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitButtonDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalSubmitTextAr: {
    textAlign: 'center',
  },
});