import React, { useState, useMemo, useEffect, useCallback } from 'react';
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

interface LiveProduct {
  id: number;
  name: string;
  image: string;
  promo: boolean;
  promoValue: number;
  price: number;
  final_price: number;
  has_offer: boolean;
  discount_applied: boolean;
  offer_info: any;
  restaurant: string;
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

// ─── Translation dictionary ─────────────────────────────────────────────────
const translations = {
  // Header
  title: { en: 'Order History', ar: 'سجل الطلبات', fr: 'Historique des commandes' },

  // Empty state
  emptyTitle: { en: 'No order history', ar: 'لا يوجد سجل طلبات', fr: 'Aucun historique' },
  emptySub: { en: 'Your completed orders will appear here', ar: 'ستظهر طلباتك المكتملة هنا', fr: 'Vos commandes terminées apparaîtront ici' },
  browseMenu: { en: 'Browse Menu', ar: 'تصفح القائمة', fr: 'Parcourir le menu' },

  // Status texts (already in getStatusConfig, but we'll define them here for completeness)
  statusPending: { en: 'Pending', ar: 'قيد الانتظار', fr: 'En attente' },
  statusPreparing: { en: 'Preparing', ar: 'قيد التحضير', fr: 'En préparation' },
  statusOutForDelivery: { en: 'Out for Delivery', ar: 'خارج للتوصيل', fr: 'En livraison' },
  statusDelivered: { en: 'Delivered', ar: 'تم التوصيل', fr: 'Livré' },
  statusCanceled: { en: 'Canceled', ar: 'ملغي', fr: 'Annulé' },
  statusPendingDesc: { en: 'Your order is being confirmed', ar: 'طلبك قيد التأكيد', fr: 'Votre commande est en cours de confirmation' },
  statusPreparingDesc: { en: 'Chef is preparing your order', ar: 'الطاهي يحضر طلبك', fr: 'Le chef prépare votre commande' },
  statusOutForDeliveryDesc: { en: 'Your order is on the way', ar: 'طلبك في الطريق', fr: 'Votre commande est en route' },
  statusDeliveredDesc: { en: 'Order delivered successfully', ar: 'تم توصيل الطلب بنجاح', fr: 'Commande livrée avec succès' },
  statusCanceledDesc: { en: 'Order has been canceled', ar: 'تم إلغاء الطلب', fr: 'Commande annulée' },

  // Order card
  ordered: { en: 'Ordered:', ar: 'تم الطلب:', fr: 'Commandé le :' },
  delivered: { en: 'Delivered:', ar: 'تم التوصيل:', fr: 'Livré le :' },
  today: { en: 'Today', ar: 'اليوم', fr: "Aujourd'hui" },
  moreItem: { en: 'more item', ar: 'عنصر إضافي', fr: 'article supplémentaire' },
  moreItems: { en: 'more items', ar: 'عناصر إضافية', fr: 'articles supplémentaires' },

  // Action buttons
  reorder: { en: 'Reorder', ar: 'إعادة الطلب', fr: 'Recommander' },
  rateOrder: { en: 'Rate Order', ar: 'تقييم الطلب', fr: 'Évaluer' },
  updateRating: { en: 'Update Rating', ar: 'تحديث التقييم', fr: 'Modifier' },

  // Rating display
  yourRating: { en: 'Your Rating', ar: 'تقييمك', fr: 'Votre évaluation' },
  foodQuality: { en: 'Food Quality', ar: 'جودة الطعام', fr: 'Qualité des plats' },
  deliveryService: { en: 'Delivery Service', ar: 'خدمة التوصيل', fr: 'Service de livraison' },
  yourComment: { en: 'Your Comment', ar: 'تعليقك', fr: 'Votre commentaire' },

  // Modal
  rateExperience: { en: 'Rate Your Experience', ar: 'قيم تجربتك', fr: 'Évaluez votre expérience' },
  orderHash: { en: 'Order #', ar: 'طلب رقم', fr: 'Commande n°' },
  additionalComments: { en: 'Additional Comments (Optional)', ar: 'تعليقات إضافية (اختياري)', fr: 'Commentaires supplémentaires (facultatif)' },
  placeholderComment: { en: 'Share your experience...', ar: 'شارك تجربتك...', fr: 'Partagez votre expérience...' },
  characters: { en: 'characters', ar: 'حرف', fr: 'caractères' },
  cancel: { en: 'Cancel', ar: 'إلغاء', fr: 'Annuler' },
  submit: { en: 'Submit Rating', ar: 'إرسال التقييم', fr: 'Soumettre' },
  submitting: { en: 'Submitting...', ar: 'جاري الإرسال...', fr: 'Envoi...' },

  // Alerts
  error: { en: 'Error', ar: 'خطأ', fr: 'Erreur' },
  success: { en: 'Success', ar: 'نجاح', fr: 'Succès' },
  fetchFailed: { en: 'Failed to fetch order history. Please try again.', ar: 'فشل تحميل سجل الطلبات. الرجاء المحاولة مرة أخرى.', fr: 'Échec du chargement de l’historique. Veuillez réessayer.' },
  reorderSuccess: { en: 'Items added with current live prices', ar: 'تمت إضافة المنتجات بالأسعار الحالية', fr: 'Articles ajoutés avec les prix actuels' },
  reorderError: { en: 'Error updating live prices', ar: 'حدث خطأ أثناء تحديث الأسعار', fr: 'Erreur lors de la mise à jour des prix' },
  rateMissing: { en: 'Please rate both Food Quality and Delivery Service', ar: 'يرجى تقييم جودة الطعام وخدمة التوصيل', fr: 'Veuillez évaluer la qualité des plats et le service de livraison' },
  userNotFound: { en: 'User not found. Please log in again.', ar: 'لم يتم العثور على المستخدم. الرجاء تسجيل الدخول مرة أخرى.', fr: 'Utilisateur introuvable. Veuillez vous reconnecter.' },
  thankYou: { en: 'Thank you for your feedback!', ar: 'شكرًا لك على ملاحظاتك!', fr: 'Merci pour votre retour !' },
  submitFailed: { en: 'Failed to submit rating. Please try again.', ar: 'فشل إرسال التقييم. الرجاء المحاولة مرة أخرى.', fr: 'Échec de l’envoi. Veuillez réessayer.' },
};

export default function ReorderScreen() {
  const { userLanguage: paramLanguage } = useLocalSearchParams<{ userLanguage?: string }>();
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

  // ── Language state ───────────────────────────────────────────────────────
  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'arabic' | 'french'>('english');
  const isRTL = currentLanguage === 'arabic';

  // Load saved language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      // If language passed as param, use it; otherwise load from storage
      if (paramLanguage && (paramLanguage === 'english' || paramLanguage === 'arabic' || paramLanguage === 'french')) {
        setCurrentLanguage(paramLanguage);
      } else {
        const storedLang = await AsyncStorage.getItem('userLanguage');
        if (storedLang && (storedLang === 'english' || storedLang === 'arabic' || storedLang === 'french')) {
          setCurrentLanguage(storedLang);
        }
      }
    };
    loadLanguage();
  }, [paramLanguage]);

  // Translation helper
  const t = (key: keyof typeof translations): string => {
    const value = translations[key];
    if (currentLanguage === 'arabic') return value.ar;
    if (currentLanguage === 'french') return value.fr;
    return value.en;
  };

  // Status configuration with translations
  const getStatusConfig = useCallback((status: OrderStatus) => {
    const baseConfig: Record<string, {
      color: string;
      icon: string;
      progress: number;
    }> = {
      pending: {
        color: Colors.gray[400],
        icon: 'time-outline',
        progress: 10,
      },
      preparing: {
        color: Colors.warning,
        icon: 'restaurant-outline',
        progress: 40,
      },
      outForDelivery: {
        color: '#2196F3',
        icon: 'bicycle-outline',
        progress: 75,
      },
      delivered: {
        color: Colors.success,
        icon: 'checkmark-circle-outline',
        progress: 100,
      },
      canceled: {
        color: Colors.error,
        icon: 'close-circle-outline',
        progress: 0,
      },
    };

    const statusKey = status as keyof typeof baseConfig;
    const config = baseConfig[statusKey] || baseConfig.pending;

    let text = '';
    let description = '';
    switch (status) {
      case 'pending':
        text = t('statusPending');
        description = t('statusPendingDesc');
        break;
      case 'preparing':
        text = t('statusPreparing');
        description = t('statusPreparingDesc');
        break;
      case 'outForDelivery':
        text = t('statusOutForDelivery');
        description = t('statusOutForDeliveryDesc');
        break;
      case 'delivered':
        text = t('statusDelivered');
        description = t('statusDeliveredDesc');
        break;
      case 'canceled':
        text = t('statusCanceled');
        description = t('statusCanceledDesc');
        break;
    }

    return { ...config, text, description };
  }, [t]);

  // Format date with language support
  const formatOrderDate = useCallback((orderDate: Date, isToday: boolean) => {
    const time = orderDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (isToday) {
      return `${t('today')}، ${time}`;
    } else {
      const dayName = isRTL 
        ? getArabicDayName(orderDate.getDay())
        : orderDate.toLocaleDateString(currentLanguage === 'french' ? 'fr-FR' : 'en-US', { weekday: 'long' });
      return `${dayName}، ${time}`;
    }
  }, [isRTL, currentLanguage, t]);

  const getArabicDayName = (dayIndex: number): string => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[dayIndex];
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
            orderDate: formatOrderDate(orderDate, isToday),
            deliveryTime: order.delivered_at
              ? isRTL 
                ? formatArabicDateTime(new Date(order.delivered_at))
                : new Date(order.delivered_at).toLocaleString(currentLanguage === 'french' ? 'fr-FR' : 'en-US', {
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
        Alert.alert(t('error'), t('fetchFailed'));
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleReorder = useCallback(async (order: Order) => {
    const { items, restaurant: orderRest } = order;
    if (!items?.length) return;
    try {
      const userData = await AsyncStorage.getItem('client');
      const user = JSON.parse(userData || '{}');
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        'https://haba-haba-api.ubua.cloud/api/auth/products/check-live-status',
        { productIds: items.map(i => i.product_id), userId: user.id },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.data.success) {
        const liveProducts: LiveProduct[] = response.data.products;
        items.forEach((historyItem) => {
          const live = liveProducts.find((p: LiveProduct) => p.id === historyItem.product_id);
          if (!live) return;
          dispatch(addItem({
            id: live.id, name: live.name, description: '',
            price: live.promo && live.promoValue
              ? Math.max((live.price || 0) - (live.price || 0) * (live.promoValue / 100), 0)
              : live.discount_applied ? live.final_price : live.price,
            quantity: historyItem.quantity, image: live.image,
            restaurant: restaurant_name || live.restaurant || 'Restaurant',
            discount_applied: live.discount_applied, original_price: live.price,
            offer_info: live.discount_applied ? live.offer_info : null,
            specialInstructions: '', showSpecialInstructions: false
          }));
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('success'), t('reorderSuccess'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('reorderError'));
    }
  }, [dispatch, restaurant_name, t]);

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
      Alert.alert(t('error'), t('rateMissing'));
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.id) {
        Alert.alert(t('error'), t('userNotFound'));
        setIsSubmitting(false);
        return;
      }

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
        await fetchOrders(false);
        Alert.alert(t('success'), t('thankYou'));
      } else {
        Alert.alert(t('error'), response.data.message || t('submitFailed'));
      }
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      Alert.alert(t('error'), error.response?.data?.message || t('submitFailed'));
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Fixed Header - Back arrow on left, title centered */}
      <View style={[styles.header, isRTL && styles.headerAr]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.titleAr]}>
          {t('title')}
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
                {t('emptyTitle')}
              </Text>
              <Text style={[styles.emptyStateSubtext, isRTL && styles.emptyStateSubtextAr]}>
                {t('emptySub')}
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push('/')}
              >
                <Text style={styles.emptyStateButtonText}>
                  {t('browseMenu')}
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
                      +{order.items.length - 3} {order.items.length - 3 > 1 ? t('moreItems') : t('moreItem')}
                    </Text>
                  )}
                </View>

                {/* Order Footer */}
                <View style={[styles.orderFooter, isRTL && styles.orderFooterAr]}>
                  <View style={isRTL && styles.orderFooterTextContainerAr}>
                    <Text style={[styles.orderDate, isRTL && styles.orderDateAr]}>
                      {t('ordered')} {order.orderDate}
                    </Text>
                    {order.deliveryTime && (
                      <Text style={[styles.orderDelivered, isRTL && styles.orderDeliveredAr]}>
                        {t('delivered')} {order.deliveryTime}
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
                      {t('reorder')}
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
                      {order.rating ? t('updateRating') : t('rateOrder')}
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
                        {t('yourRating')}
                      </Text>
                    </View>

                    <View style={styles.ratingDisplayContent}>
                      <View style={styles.ratingDisplayItem}>
                        <View style={[styles.ratingDisplayItemHeader, isRTL && styles.ratingDisplayItemHeaderAr]}>
                          <Ionicons name="restaurant" size={18} color={Colors.primary} />
                          <Text style={[styles.ratingDisplayLabel, isRTL && styles.ratingDisplayLabelAr]}>
                            {t('foodQuality')}
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
                            {t('deliveryService')}
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
                            {t('yourComment')}
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
                      {t('rateExperience')}
                    </Text>
                    {selectedOrder && (
                      <Text style={[styles.modalSubtitle, isRTL && styles.modalSubtitleAr]}>
                        {t('orderHash')}{selectedOrder.orderNumber}
                      </Text>
                    )}
                  </View>

                  <ScrollView
                    style={styles.modalBody}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.ratingSection}>
                      <Text style={[styles.ratingSectionTitle, isRTL && styles.ratingSectionTitleAr]}>
                        {t('foodQuality')}
                      </Text>
                      {renderStars(foodRating, setFoodRating, 32)}
                    </View>

                    <View style={styles.ratingSection}>
                      <Text style={[styles.ratingSectionTitle, isRTL && styles.ratingSectionTitleAr]}>
                        {t('deliveryService')}
                      </Text>
                      {renderStars(deliveryRating, setDeliveryRating, 32)}
                    </View>

                    <View style={styles.commentSection}>
                      <Text style={[styles.commentLabel, isRTL && styles.commentLabelAr]}>
                        {t('additionalComments')}
                      </Text>
                      <TextInput
                        style={[styles.commentInput, isRTL && styles.commentInputAr]}
                        placeholder={t('placeholderComment')}
                        placeholderTextColor={Colors.text.secondary}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        maxLength={200}
                        textAlignVertical="top"
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                      <Text style={[styles.commentCounter, isRTL && styles.commentCounterAr]}>
                        {comment.length}/200 {t('characters')}
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
                        {t('cancel')}
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
                        {isSubmitting ? t('submitting') : t('submit')}
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
  orderCardAr: {},
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