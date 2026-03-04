import { OrderCardSkeleton } from '@/components/ui/skeleton';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList } from '@shopify/flash-list';
import axios from 'axios';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { addItem } from './redux/slices/orderSlice';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND_BROWN = '#93522B';
const BRAND_CREAM = '#F9F8F3';
const BRAND_GRAY = '#999999';
const BRAND_BORDER = '#EDE8DF';
const CARD_BG = '#FFFFFF';
const ITEMS_BG = '#FDF8F3';
const BROWN_DARK = '#6B3A1F';

// Types (unchanged)
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
  set_prepared_at: string;
  orderDate: string;
  estimatedDelivery?: string;
  deliveryTime?: string;
  total: number;
  rating?: OrderRating;
  created_at?: string;
  updated_at?: string;
  timeRemaining?: number;
  progress?: number;
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

// Status configuration with English, Arabic, French
const STATUS_CONFIG: Record<string, {
  textEn: string;
  textAr: string;
  textFr: string;
  color: string;
  bgColor: string;
  icon: string;
  descriptionEn: string;
  descriptionAr: string;
  descriptionFr: string;
  progress: number;
}> = {
  pending: {
    textEn: 'Pending',
    textAr: 'قيد الانتظار',
    textFr: 'En attente',
    color: '#999999',
    bgColor: '#F5F5F5',
    icon: 'time-outline',
    descriptionEn: 'Your order is being confirmed',
    descriptionAr: 'طلبك قيد التأكيد',
    descriptionFr: 'Votre commande est en cours de confirmation',
    progress: 10,
  },
  preparing: {
    textEn: 'Preparing',
    textAr: 'قيد التحضير',
    textFr: 'En préparation',
    color: '#C4813A',
    bgColor: '#FEF3E7',
    icon: 'restaurant-outline',
    descriptionEn: 'Chef is preparing your order',
    descriptionAr: 'الطاهي يقوم بتحضير طلبك',
    descriptionFr: 'Le chef prépare votre commande',
    progress: 40,
  },
  outForDelivery: {
    textEn: 'On the way',
    textAr: 'قيد التوصيل',
    textFr: 'En cours de livraison',
    color: '#2196F3',
    bgColor: '#EBF5FF',
    icon: 'bicycle-outline',
    descriptionEn: 'Your order is on the way',
    descriptionAr: 'طلبك في الطريق إليك',
    descriptionFr: 'Votre commande est en route',
    progress: 75,
  },
  delivered: {
    textEn: 'Delivered',
    textAr: 'تم التوصيل',
    textFr: 'Livrée',
    color: '#22A55A',
    bgColor: '#EDFAF3',
    icon: 'checkmark-circle-outline',
    descriptionEn: 'Order delivered successfully',
    descriptionAr: 'تم توصيل الطلب بنجاح',
    descriptionFr: 'Commande livrée avec succès',
    progress: 100,
  },
  canceled: {
    textEn: 'Canceled',
    textAr: 'ملغي',
    textFr: 'Annulée',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    icon: 'close-circle-outline',
    descriptionEn: 'Order has been canceled',
    descriptionAr: 'تم إلغاء الطلب',
    descriptionFr: 'La commande a été annulée',
    progress: 0,
  },
};

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

export default function OrdersScreen() {
  const dispatch = useDispatch();
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<Record<string, string>>({});
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [restaurant_name, setRestaurant_name] = useState();
  const [restaurant_phone, setRestaurant_phone] = useState<string>();

  // Language state – self-managed from AsyncStorage
  const [language, setLanguage] = useState<'english' | 'arabic' | 'french'>('english');
  const [loadingLang, setLoadingLang] = useState(true);

  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const isArabic = language === 'arabic';
  const isFrench = language === 'french';
  const initialScrollX = isArabic ? screenWidth : 0;

  // Load language from storage when screen focuses
  useFocusEffect(
    useCallback(() => {
      const loadLanguage = async () => {
        try {
          const storedLang = await AsyncStorage.getItem('userLanguage');
          if (storedLang === 'arabic' || storedLang === 'french') {
            setLanguage(storedLang);
          } else {
            setLanguage('english');
          }
        } catch (error) {
          console.error('Failed to load language', error);
        } finally {
          setLoadingLang(false);
        }
      };
      loadLanguage();
    }, [])
  );

  // Helper to get localized status text
  const getStatusText = (status: OrderStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    if (isArabic) return config.textAr;
    if (isFrench) return config.textFr;
    return config.textEn;
  };

  // Helper to get localized status description
  const getStatusDescription = (status: OrderStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    if (isArabic) return config.descriptionAr;
    if (isFrench) return config.descriptionFr;
    return config.descriptionEn;
  };

  const calculateOrderProgress = (order: any): { progress: number } => {
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    return { progress: statusConfig.progress };
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
      console.log('check orders zap: ', res.data.orders[0])
      const transformedOrders = (res.data.orders || []).map((order: any) => {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        const isToday = orderDate.toDateString() === now.toDateString();
        setRestaurant_name(res.data.restaurant_name);
        setRestaurant_phone(res.data.restaurant_phone);

        const formatOrderDate = () => {
          const locale = isArabic ? 'ar-SA' : isFrench ? 'fr-FR' : 'en-US';
          const time = orderDate.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
          if (isToday) {
            if (isArabic) return `اليوم، ${time}`;
            if (isFrench) return `Aujourd'hui, ${time}`;
            return `Today, ${time}`;
          }
          const dayName = orderDate.toLocaleDateString(locale, { weekday: 'long' });
          return isArabic ? `${dayName}، ${time}` : `${dayName}, ${time}`;
        };

        const mappedStatus = mapBackendStatus(order.status || 'Pending');
        const { progress } = calculateOrderProgress({ ...order, status: mappedStatus });
        const orderId = order.id?.toString() || '';
        const previousStatus = lastStatusUpdate[orderId];
        if (previousStatus && previousStatus !== mappedStatus) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setLastStatusUpdate(prev => ({ ...prev, [orderId]: mappedStatus }));

        let estimatedDelivery: string | undefined = undefined;
        if (mappedStatus === 'pending') {
          estimatedDelivery = isArabic ? 'قيد الانتظار' : isFrench ? 'En attente' : 'Still Pending';
        } else if (mappedStatus === 'preparing') {
          const baseDate = order.set_prepared_at ? new Date(order.set_prepared_at) : orderDate;
          const estimatedTime = new Date(baseDate.getTime() + order.estimated_preparing_time * 60 * 1000);
          estimatedDelivery = estimatedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (mappedStatus === 'outForDelivery') {
          const baseDate = order.set_prepared_at ? new Date(order.set_prepared_at) : orderDate;
          const estimatedTime = new Date(baseDate.getTime() + (order.estimated_preparing_time + 15) * 60 * 1000);
          estimatedDelivery = estimatedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }

        return {
          id: orderId,
          orderNumber: order.order_number || `ORD-${order.id}`,
          set_prepared_at: order.set_prepared_at,
          estimated_preparing_time: order.estimated_preparing_time,
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
          estimatedDelivery,
          deliveryTime: order.delivered_at
            ? new Date(order.delivered_at).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
            : undefined,
          total: parseFloat(order.final_price || order.total_price || 0),
          rating: order.rating ? {
            foodQuality: order.rating.food_quality || 0,
            deliveryService: order.rating.delivery_service || 0,
            comment: order.rating.comment,
          } : undefined,
          created_at: order.created_at,
          updated_at: order.updated_at,
          progress,
        };
      });
      setOrders(transformedOrders);
    } catch (err: any) {
      console.error('Fetch Orders Error:', err.response?.data || err.message);
      if (showLoading) {
        Alert.alert(
          isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
          isArabic ? 'فشل في جلب الطلبات. الرجاء المحاولة مرة أخرى.' : isFrench ? 'Échec de la récupération des commandes. Veuillez réessayer.' : 'Failed to fetch orders. Please try again.'
        );
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingLang) {
      fetchOrders();
    }
  }, [language, loadingLang]); // Re-fetch when language changes to update date formats

  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      if (activeTab === 'active') fetchOrders(false);
    }, 15000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [activeTab]);

  function calculateDeliveryRemainingTime(order: Order) {
    if (!order?.set_prepared_at || !order?.estimatedDelivery) {
      return isArabic ? 'جاري التحميل...' : isFrench ? 'Chargement...' : 'Loading...';
    }
    const preparedDate = new Date(order.set_prepared_at);
    if (isNaN(preparedDate.getTime())) return isArabic ? 'خطأ: تاريخ غير صحيح' : isFrench ? 'Erreur: date invalide' : 'Error: Invalid prepared date.';
    try {
      const timeStr = order.estimatedDelivery.trim().toUpperCase();
      const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeParts) return isArabic ? 'خطأ: تنسيق الوقت غير صحيح' : isFrench ? 'Erreur: format de l\'heure invalide' : 'Error: Invalid time format';
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const period = timeParts[3];
      if (period === 'PM' && hours < 12) hours += 12;
      else if (period === 'AM' && hours === 12) hours = 0;
      const estimatedDeliveryDate = new Date(preparedDate);
      estimatedDeliveryDate.setHours(hours, minutes, 0, 0);
      if (estimatedDeliveryDate.getTime() < preparedDate.getTime()) {
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 1);
      }
      const timeRemainingMs = estimatedDeliveryDate.getTime() - Date.now();
      const remainingMinutes = Math.max(0, Math.ceil(timeRemainingMs / 60000));
      if (remainingMinutes > 0) {
        if (isArabic) return `${remainingMinutes} دقيقة متبقية`;
        if (isFrench) return `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} restante${remainingMinutes > 1 ? 's' : ''}`;
        return `${remainingMinutes} min remaining`;
      }
      return isArabic ? 'قريباً (أو تم التوصيل)' : isFrench ? 'Bientôt (ou livrée)' : 'Almost done (or delivered)';
    } catch (error) {
      return isArabic ? 'خطأ في حساب وقت التوصيل' : isFrench ? 'Erreur de calcul' : 'Error calculating delivery time';
    }
  }

  useEffect(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    if (activeTab === 'active') {
      refreshIntervalRef.current = setInterval(() => fetchOrders(false), 15000);
    }
  }, [activeTab]);

  const { activeOrders, completedOrders, displayOrders } = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'delivered' && o.status !== 'canceled');
    const completed = orders.filter((o) => o.status === 'delivered' || o.status === 'canceled');
    return { activeOrders: active, completedOrders: completed, displayOrders: activeTab === 'active' ? active : completed };
  }, [activeTab, orders]);

  const getStatusConfig = (status: OrderStatus) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  // ─── Animated Status Badge ─────────────────────────────────────────────────
  const AnimatedStatusBadge = ({ order }: { order: Order }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const statusConfig = getStatusConfig(order.status);
    useEffect(() => {
      if (order.status === 'preparing' || order.status === 'outForDelivery') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          ])
        ).start();
      }
    }, [order.status]);

    return (
      <Animated.View
        style={[
          newStyles.statusPill,
          { backgroundColor: statusConfig.bgColor, transform: [{ scale: pulseAnim }] },
          isArabic && { flexDirection: 'row-reverse' }
        ]}
      >
        <Ionicons name={statusConfig.icon as any} size={13} color={statusConfig.color} />
        <Text style={[newStyles.statusPillText, { color: statusConfig.color }]}>
          {getStatusText(order.status)}
        </Text>
      </Animated.View>
    );
  };

  // ─── Progress Bar ──────────────────────────────────────────────────────────
  const ProgressBar = ({ progress }: { progress: number }) => {
    const progressAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(progressAnim, { toValue: progress, duration: 500, useNativeDriver: false }).start();
    }, [progress]);
    return (
      <View style={newStyles.progressTrack}>
        <Animated.View
          style={[
            newStyles.progressFill,
            {
              width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              alignSelf: isArabic ? 'flex-end' : 'flex-start',
            },
          ]}
        />
      </View>
    );
  };

  // ─── Order Timeline ────────────────────────────────────────────────────────
  const OrderTimeline = ({ order }: { order: Order }) => {
    const statuses: OrderStatus[] = ['pending', 'preparing', 'outForDelivery', 'delivered'];
    const currentIndex = statuses.indexOf(order.status);
    return (
      <View style={[newStyles.timelineRow, isArabic && { flexDirection: 'row-reverse' }]}>
        {statuses.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const config = STATUS_CONFIG[status];
          return (
            <View key={status} style={newStyles.timelineStep}>
              <View style={newStyles.timelineStepTop}>
                <View style={[
                  newStyles.timelineDot,
                  isCompleted && newStyles.timelineDotDone,
                  isCurrent && newStyles.timelineDotActive,
                ]}>
                  {isCompleted && <Ionicons name="checkmark" size={9} color="#fff" />}
                  {isCurrent && <View style={newStyles.timelineDotPulse} />}
                </View>
                {index < statuses.length - 1 && (
                  <View style={[newStyles.timelineConnector, isCompleted && newStyles.timelineConnectorDone]} />
                )}
              </View>
              <Text style={[
                newStyles.timelineStepLabel,
                isCompleted && newStyles.timelineStepLabelDone,
                isCurrent && newStyles.timelineStepLabelActive,
                isArabic && { textAlign: 'right' }
              ]}>
                {isArabic ? config.textAr : isFrench ? config.textFr : config.textEn}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const openRatingModal = (order: Order) => {
    setSelectedOrder(order);
    if (order.rating) {
      setFoodRating(order.rating.foodQuality);
      setDeliveryRating(order.rating.deliveryService);
      setComment(order.rating.comment || '');
    } else {
      setFoodRating(0); setDeliveryRating(0); setComment('');
    }
    setRatingModalVisible(true);
  };

  const closeRatingModal = () => {
    setRatingModalVisible(false);
    setSelectedOrder(null);
    setFoodRating(0); setDeliveryRating(0); setComment('');
  };

  const handleSubmitRating = async () => {
    if (!selectedOrder || foodRating === 0 || deliveryRating === 0) {
      Alert.alert(
        isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
        isArabic ? 'يرجى تقييم جودة الطعام وخدمة التوصيل' : isFrench ? 'Veuillez évaluer la qualité des aliments et le service de livraison' : 'Please rate both Food Quality and Delivery Service'
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;
      if (!user || !user.id) {
        Alert.alert(
          isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
          isArabic ? 'المستخدم غير موجود. الرجاء تسجيل الدخول مرة أخرى.' : isFrench ? 'Utilisateur introuvable. Veuillez vous reconnecter.' : 'User not found. Please log in again.'
        );
        setIsSubmitting(false); return;
      }
      const response = await axios.post('https://haba-haba-api.ubua.cloud/api/auth/submit-rating', {
        order_id: parseInt(selectedOrder.id),
        user_id: user.id,
        food_quality: foodRating,
        delivery_service: deliveryRating,
        comment: comment.trim() || null,
      });
      if (response.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeRatingModal();
        await fetchOrders(false);
        Alert.alert(
          isArabic ? 'نجاح' : isFrench ? 'Succès' : 'Success',
          isArabic ? 'شكراً على ملاحظاتك!' : isFrench ? 'Merci pour votre avis !' : 'Thank you for your feedback!'
        );
      } else {
        Alert.alert(
          isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
          response.data.message || (isArabic ? 'فشل في إرسال التقييم' : isFrench ? 'Échec de l\'envoi de l\'évaluation' : 'Failed to submit rating')
        );
      }
    } catch (error: any) {
      Alert.alert(
        isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
        error.response?.data?.message || (isArabic ? 'فشل في إرسال التقييم. الرجاء المحاولة مرة أخرى.' : isFrench ? 'Échec de l\'envoi. Veuillez réessayer.' : 'Failed to submit rating. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
        Alert.alert(
          isArabic ? 'نجاح' : isFrench ? 'Succès' : 'Success',
          isArabic ? 'تمت إضافة المنتجات بالأسعار الحالية' : isFrench ? 'Produits ajoutés avec les prix actuels' : 'Items added with current live prices'
        );
      }
    } catch (error) {
      Alert.alert(
        isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
        isArabic ? 'حدث خطأ أثناء تحديث الأسعار' : isFrench ? 'Erreur lors de la mise à jour des prix' : 'Error updating live prices'
      );
    }
  }, [dispatch, restaurant_name, isArabic, isFrench]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleCopyNumber = async (number: string) => {
    try {
      await Clipboard.setStringAsync(number);
      setCopiedNumber(number);
      setTimeout(() => setCopiedNumber(null), 2000);
    } catch (error) { console.error('Failed to copy code:', error); }
  };

  const handleCallRestaurant = async () => {
    if (!restaurant_phone) {
      Alert.alert(
        isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
        isArabic ? 'رقم الهاتف غير متوفر' : isFrench ? 'Numéro de téléphone non disponible' : 'Phone number not available'
      );
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const url = `tel:${restaurant_phone.replace(/\s/g, '')}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert(
        isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
        isArabic ? 'المكالمات غير مدعومة على هذا الجهاز' : isFrench ? 'Les appels ne sont pas pris en charge sur cet appareil' : 'Calling is not supported on this device'
      );
    } catch (error) {
      Alert.alert(
        isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
        isArabic ? 'فشل في إجراء المكالمة' : isFrench ? 'Échec de l\'appel' : 'Failed to make call'
      );
    }
  };

  const handleWhatsAppRestaurant = async () => {
    if (!restaurant_phone) {
      Alert.alert(
        isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
        isArabic ? 'رقم الهاتف غير متوفر' : isFrench ? 'Numéro de téléphone non disponible' : 'Phone number not available'
      );
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const phoneNumber = restaurant_phone.replace(/\D/g, '');
      const url = `whatsapp://send?phone=${phoneNumber}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else await Linking.openURL(`https://wa.me/${phoneNumber}`);
    } catch (error) {
      Alert.alert(
        isArabic ? 'خطأ' : isFrench ? 'Erreur' : 'Error',
        isArabic ? 'فشل في فتح واتساب' : isFrench ? 'Échec de l\'ouverture de WhatsApp' : 'Failed to open WhatsApp'
      );
    }
  };

  const renderStars = (rating: number, onPress: (value: number) => void, size: number = 24) => (
    <View style={[newStyles.starsRow, isArabic && { flexDirection: 'row-reverse' }]}>
      {[1, 2, 3, 4, 5].map((value) => (
        <TouchableOpacity key={value} onPress={() => { onPress(value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} activeOpacity={0.7} style={{ padding: 2 }}>
          <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={size} color={value <= rating ? '#C4813A' : '#DDD'} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const handleOrdersScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    tabIndicatorAnim.setValue(offsetX);
  };

  const handleOrdersScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / screenWidth);
    let newTab: 'active' | 'history';
    if (isArabic) newTab = page === 1 ? 'active' : 'history';
    else newTab = page === 0 ? 'active' : 'history';
    if (newTab !== activeTab) { setActiveTab(newTab); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
  };

  // ─── Render Orders List ────────────────────────────────────────────────────
  const renderOrdersList = (ordersToRender: Order[], tab: 'active' | 'history') => {
    if (loadingLang || loading) {
      return (
        <View style={{ padding: 16 }}>
          {[1, 2, 3].map((item) => <OrderCardSkeleton key={item} />)}
        </View>
      );
    }

    if (ordersToRender.length === 0) {
      return (
        <View style={newStyles.emptyWrap}>
          <View style={newStyles.emptyInner}>
            <View style={newStyles.emptyIconCircle}>
              <Ionicons name={tab === 'active' ? 'restaurant-outline' : 'receipt-outline'} size={40} color={BRAND_BROWN} />
            </View>
            <Text style={[newStyles.emptyTitle, isArabic && { textAlign: 'right' }]}>
              {tab === 'active'
                ? (isArabic ? 'لا توجد طلبات نشطة' : isFrench ? 'Aucune commande active' : 'No active orders')
                : (isArabic ? 'لا يوجد سجل طلبات' : isFrench ? 'Aucun historique de commandes' : 'No order history')}
            </Text>
            <Text style={[newStyles.emptySubtitle, isArabic && { textAlign: 'right' }]}>
              {tab === 'active'
                ? (isArabic ? 'طلباتك النشطة ستظهر هنا' : isFrench ? 'Vos commandes actives apparaîtront ici' : 'Your active orders will appear here')
                : (isArabic ? 'طلباتك المكتملة ستظهر هنا' : isFrench ? 'Vos commandes terminées apparaîtront ici' : 'Your completed orders will appear here')}
            </Text>
            {tab === 'active' && (
              <TouchableOpacity style={newStyles.emptyBtn} onPress={() => router.push('/')}>
                <Text style={newStyles.emptyBtnText}>
                  {isArabic ? 'تصفح القائمة' : isFrench ? 'Parcourir le menu' : 'Browse Menu'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return (
      <FlashList
        data={ordersToRender}
        keyExtractor={(order: Order) => order.id.toString()}
        renderItem={({ item: order }) => {
          const statusConfig = getStatusConfig(order.status);
          return (
            <View style={newStyles.card}>
              {/* ── Card Header ── */}
              <View style={[newStyles.cardHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[newStyles.orderNumRow, isArabic && { flexDirection: 'row-reverse' }]}
                    onPress={() => handleCopyNumber(order.orderNumber)}
                    activeOpacity={0.7}
                  >
                    <Text style={newStyles.orderNumText}>{order.orderNumber}</Text>
                    {copiedNumber === order.orderNumber && (
                      <View style={newStyles.copiedBadge}>
                        <Text style={newStyles.copiedBadgeText}>
                          {isArabic ? 'تم النسخ!' : isFrench ? 'Copié !' : 'Copied!'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={[newStyles.orderDateText, isArabic && { textAlign: 'right' }]}>{order.orderDate}</Text>
                </View>
                <AnimatedStatusBadge order={order} />
              </View>

              {/* ── Progress (active) ── */}
              {tab === 'active' && order.status !== 'canceled' && (
                <View style={newStyles.progressSection}>
                  <ProgressBar progress={order.progress || 0} />
                  <Text style={[newStyles.progressLabel, isArabic && { textAlign: 'right' }]}>
                    {getStatusDescription(order.status)}
                  </Text>
                </View>
              )}

              {/* ── Timeline (active) ── */}
              {tab === 'active' && order.status !== 'canceled' && (
                <View style={newStyles.timelineSection}>
                  <OrderTimeline order={order} />
                </View>
              )}

              {/* ── Time remaining badge ── */}
              {tab === 'active' && order.status === 'preparing' && (
                <View style={[newStyles.timeRemainingPill, isArabic && { flexDirection: 'row-reverse', alignSelf: 'flex-end' }]}>
                  <Ionicons name="time-outline" size={13} color={statusConfig.color} />
                  <Text style={[newStyles.timeRemainingText, { color: statusConfig.color }]}>
                    {calculateDeliveryRemainingTime(order)}
                  </Text>
                </View>
              )}

              {/* ── Items Block ── */}
              <View style={newStyles.itemsBlock}>
                {order.items.slice(0, 3).map((item: OrderItem, idx: number) => (
                  <View key={idx} style={[newStyles.itemRow, isArabic && { flexDirection: 'row-reverse' }]}>
                    <View style={newStyles.itemDot} />
                    <Text style={[newStyles.itemText, isArabic && { textAlign: 'right' }]}>
                      {isArabic ? `${item.name} ${item.quantity}x` : `${item.name}`}
                    </Text>
                  </View>
                ))}
                {order.items.length > 3 && (
                  <Text style={[newStyles.itemsMore, isArabic && { textAlign: 'right' }]}>
                    +{order.items.length - 3} {isArabic ? 'عناصر أخرى' : isFrench ? `article${order.items.length - 3 > 1 ? 's' : ''} supplémentaire${order.items.length - 3 > 1 ? 's' : ''}` : `more item${order.items.length - 3 > 1 ? 's' : ''}`}
                  </Text>
                )}
              </View>

              {/* ── Footer row ── */}
              <View style={[newStyles.cardFooter, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  {order.estimatedDelivery && tab === 'active' && (
                    <View style={[newStyles.footerMetaRow, isArabic && { flexDirection: 'row-reverse' }]}>
                      <Ionicons name="time-outline" size={13} color={BRAND_GRAY} />
                      <Text style={newStyles.footerMetaText}>
                        {isArabic
                          ? `مقدر ${order.status === 'preparing' ? 'للخروج:' : 'للتوصيل:'} ${order.estimatedDelivery}`
                          : isFrench
                          ? `Est. ${order.status === 'preparing' ? 'sortie:' : 'livraison:'} ${order.estimatedDelivery}`
                          : `Est. ${order.status === 'preparing' ? 'out:' : 'delivery:'} ${order.estimatedDelivery}`}
                      </Text>
                    </View>
                  )}
                  {order.deliveryTime && (
                    <View style={[newStyles.footerMetaRow, isArabic && { flexDirection: 'row-reverse' }]}>
                      <Ionicons name="checkmark-circle-outline" size={13} color="#22A55A" />
                      <Text style={[newStyles.footerMetaText, { color: '#22A55A' }]}>
                        {isArabic ? 'تم التوصيل' : isFrench ? 'Livrée' : 'Delivered'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={[newStyles.totalRow, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={newStyles.totalText}>{order.total.toFixed(2)} {isArabic ? 'درهم' : 'MAD'}</Text>
                  <Ionicons name="chevron-forward" size={16} color={BRAND_BROWN} />
                </View>
              </View>

              {/* ── Action Buttons ── */}
              <View style={[newStyles.actionsRow, isArabic && { flexDirection: 'row-reverse' }]}>
                {tab === 'active' ? (
                  <>
                    <TouchableOpacity
                      style={newStyles.trackBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push({ pathname: `/track-order/${order.id}`, params: { userLanguage: language } });
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={[newStyles.trackBtnInner, isArabic && { flexDirection: 'row-reverse' }]}>
                        <Ionicons name="location" size={17} color="#fff" />
                        <Text style={newStyles.trackBtnText}>
                          {isArabic ? 'تتبع الطلب' : isFrench ? 'Suivre la commande' : 'Track Order'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                    <TouchableOpacity style={newStyles.iconBtn} onPress={handleCallRestaurant} activeOpacity={0.7}>
                      <Ionicons name="call-outline" size={18} color={BRAND_BROWN} />
                    </TouchableOpacity>
                    <TouchableOpacity style={newStyles.iconBtn} onPress={handleWhatsAppRestaurant} activeOpacity={0.7}>
                      <Ionicons name="logo-whatsapp" size={18} color={BRAND_BROWN} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={newStyles.outlineBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleReorder(order); }}
                      activeOpacity={0.8}
                    >
                      <Text style={newStyles.outlineBtnText}>
                        {isArabic ? 'إعادة الطلب' : isFrench ? 'Recommander' : 'Reorder'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={newStyles.outlineBtn}
                      onPress={() => openRatingModal(order)}
                      activeOpacity={0.8}
                    >
                      <View style={[newStyles.outlineBtnInner, isArabic && { flexDirection: 'row-reverse' }]}>
                        <Ionicons name={order.rating ? 'create-outline' : 'star-outline'} size={15} color={BRAND_BROWN} />
                        <Text style={newStyles.outlineBtnText}>
                          {order.rating
                            ? (isArabic ? 'تحديث التقييم' : isFrench ? 'Modifier l\'avis' : 'Update Rating')
                            : (isArabic ? 'تقييم الطلب' : isFrench ? 'Évaluer' : 'Rate Order')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* ── Rating Display ── */}
              {tab === 'history' && order.rating && (
                <View style={newStyles.ratingCard}>
                  <View style={[newStyles.ratingCardHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                    <View style={newStyles.ratingIconCircle}>
                      <Ionicons name="star" size={16} color="#C4813A" />
                    </View>
                    <Text style={[newStyles.ratingCardTitle, isArabic && { textAlign: 'right' }]}>
                      {isArabic ? 'تقييمك' : isFrench ? 'Votre avis' : 'Your Rating'}
                    </Text>
                  </View>
                  <View style={{ gap: 10 }}>
                    <View style={newStyles.ratingRow}>
                      <View style={[newStyles.ratingRowLeft, isArabic && { flexDirection: 'row-reverse' }]}>
                        <Ionicons name="restaurant" size={15} color={BRAND_BROWN} />
                        <Text style={[newStyles.ratingRowLabel, isArabic && { textAlign: 'right' }]}>
                          {isArabic ? 'جودة الطعام' : isFrench ? 'Qualité des aliments' : 'Food Quality'}
                        </Text>
                      </View>
                      <View style={[newStyles.ratingRowRight, isArabic && { flexDirection: 'row-reverse' }]}>
                        {renderStars(order.rating.foodQuality, () => { }, 16)}
                        <Text style={newStyles.ratingValue}>{order.rating.foodQuality}/5</Text>
                      </View>
                    </View>
                    <View style={newStyles.ratingDivider} />
                    <View style={newStyles.ratingRow}>
                      <View style={[newStyles.ratingRowLeft, isArabic && { flexDirection: 'row-reverse' }]}>
                        <Ionicons name="bicycle" size={15} color={BRAND_BROWN} />
                        <Text style={[newStyles.ratingRowLabel, isArabic && { textAlign: 'right' }]}>
                          {isArabic ? 'خدمة التوصيل' : isFrench ? 'Service de livraison' : 'Delivery Service'}
                        </Text>
                      </View>
                      <View style={[newStyles.ratingRowRight, isArabic && { flexDirection: 'row-reverse' }]}>
                        {renderStars(order.rating.deliveryService, () => { }, 16)}
                        <Text style={newStyles.ratingValue}>{order.rating.deliveryService}/5</Text>
                      </View>
                    </View>
                  </View>
                  {order.rating.comment && (
                    <View style={newStyles.ratingComment}>
                      <View style={[newStyles.ratingCommentHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                        <Ionicons name="chatbubble-outline" size={13} color={BRAND_GRAY} />
                        <Text style={newStyles.ratingCommentLabel}>
                          {isArabic ? 'تعليقك' : isFrench ? 'Votre commentaire' : 'Your Comment'}
                        </Text>
                      </View>
                      <Text style={[newStyles.ratingCommentText, isArabic && { textAlign: 'right' }]}>
                        {order.rating.comment}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={newStyles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        extraData={activeTab}
      />
    );
  };

  return (
    <View style={[newStyles.screen, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={newStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={newStyles.headerBackBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={BRAND_BROWN} style={isArabic ? { transform: [{ scaleX: -1 }] } : undefined} />
        </TouchableOpacity>
        <Text style={newStyles.headerTitle}>
          {isArabic ? 'طلباتي' : isFrench ? 'Mes commandes' : 'My Orders'}
        </Text>
        <View style={newStyles.headerRight}>
          {activeTab === 'active' && activeOrders.length > 0 && (
            <View style={newStyles.livePill}>
              <View style={newStyles.liveDot} />
              <Text style={newStyles.liveText}>
                {isArabic ? 'مباشر' : isFrench ? 'En direct' : 'Live'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Tab Pills ── */}
      <View style={newStyles.tabBar}>
        {isArabic ? (
          <View style={[newStyles.tabPillRow, { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity
              style={[newStyles.tabPill, activeTab === 'history' && newStyles.tabPillActive]}
              onPress={() => {
                setActiveTab('history');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                scrollViewRef.current?.scrollTo({ x: 0, animated: true });
              }}
              activeOpacity={0.85}
            >
              <Text style={[newStyles.tabPillText, activeTab === 'history' && newStyles.tabPillTextActive]}>
                {isArabic ? `السابق (${completedOrders.length})` : isFrench ? `Passées (${completedOrders.length})` : `Past (${completedOrders.length})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[newStyles.tabPill, activeTab === 'active' && newStyles.tabPillActive]}
              onPress={() => {
                setActiveTab('active');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                scrollViewRef.current?.scrollTo({ x: screenWidth, animated: true });
              }}
              activeOpacity={0.85}
            >
              <Text style={[newStyles.tabPillText, activeTab === 'active' && newStyles.tabPillTextActive]}>
                {isArabic ? `نشطة (${activeOrders.length})` : isFrench ? `Actives (${activeOrders.length})` : `Active (${activeOrders.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={newStyles.tabPillRow}>
            <TouchableOpacity
              style={[newStyles.tabPill, activeTab === 'active' && newStyles.tabPillActive]}
              onPress={() => {
                setActiveTab('active');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                scrollViewRef.current?.scrollTo({ x: 0, animated: true });
              }}
              activeOpacity={0.85}
            >
              <Text style={[newStyles.tabPillText, activeTab === 'active' && newStyles.tabPillTextActive]}>
                {isArabic ? `نشطة (${activeOrders.length})` : isFrench ? `Actives (${activeOrders.length})` : `Active (${activeOrders.length})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[newStyles.tabPill, activeTab === 'history' && newStyles.tabPillActive]}
              onPress={() => {
                setActiveTab('history');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                scrollViewRef.current?.scrollTo({ x: screenWidth, animated: true });
              }}
              activeOpacity={0.85}
            >
              <Text style={[newStyles.tabPillText, activeTab === 'history' && newStyles.tabPillTextActive]}>
                {isArabic ? `السابق (${completedOrders.length})` : isFrench ? `Passées (${completedOrders.length})` : `Past (${completedOrders.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Horizontal Scroll ── */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleOrdersScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleOrdersScrollEnd}
        contentOffset={{ x: initialScrollX, y: 0 }}
        style={{ flex: 1 }}
      >
        {isArabic ? (
          <>
            <View style={{ width: screenWidth, flex: 1 }}>{renderOrdersList(completedOrders, 'history')}</View>
            <View style={{ width: screenWidth, flex: 1 }}>{renderOrdersList(activeOrders, 'active')}</View>
          </>
        ) : (
          <>
            <View style={{ width: screenWidth, flex: 1 }}>{renderOrdersList(activeOrders, 'active')}</View>
            <View style={{ width: screenWidth, flex: 1 }}>{renderOrdersList(completedOrders, 'history')}</View>
          </>
        )}
      </ScrollView>

      {/* ── Rating Modal ── */}
      <Modal visible={ratingModalVisible} transparent animationType="fade" onRequestClose={closeRatingModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={newStyles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={newStyles.modalBox}>
                  <View style={[newStyles.modalHead, isArabic && { alignItems: 'flex-end' }]}>
                    <View style={newStyles.modalIconCircle}>
                      <Ionicons name="star" size={28} color={BRAND_BROWN} />
                    </View>
                    <Text style={[newStyles.modalTitle, isArabic && { textAlign: 'right' }]}>
                      {isArabic ? 'قيم تجربتك' : isFrench ? 'Évaluez votre expérience' : 'Rate Your Experience'}
                    </Text>
                    {selectedOrder && (
                      <Text style={[newStyles.modalSub, isArabic && { textAlign: 'right' }]}>
                        {isArabic ? `طلب #${selectedOrder.orderNumber}` : isFrench ? `Commande #${selectedOrder.orderNumber}` : `Order #${selectedOrder.orderNumber}`}
                      </Text>
                    )}
                  </View>

                  <ScrollView style={newStyles.modalBody} showsVerticalScrollIndicator={false}>
                    <View style={newStyles.ratingSection}>
                      <Text style={[newStyles.ratingSectionTitle, isArabic && { textAlign: 'right' }]}>
                        {isArabic ? 'جودة الطعام' : isFrench ? 'Qualité des aliments' : 'Food Quality'}
                      </Text>
                      {renderStars(foodRating, setFoodRating, 32)}
                    </View>
                    <View style={newStyles.ratingSection}>
                      <Text style={[newStyles.ratingSectionTitle, isArabic && { textAlign: 'right' }]}>
                        {isArabic ? 'خدمة التوصيل' : isFrench ? 'Service de livraison' : 'Delivery Service'}
                      </Text>
                      {renderStars(deliveryRating, setDeliveryRating, 32)}
                    </View>
                    <View style={newStyles.commentSection}>
                      <Text style={[newStyles.commentLabel, isArabic && { textAlign: 'right' }]}>
                        {isArabic ? 'تعليقات إضافية (اختياري)' : isFrench ? 'Commentaires supplémentaires (facultatif)' : 'Additional Comments (Optional)'}
                      </Text>
                      <TextInput
                        style={[newStyles.commentInput, isArabic && { textAlign: 'right' }]}
                        placeholder={isArabic ? "شارك تجربتك..." : isFrench ? "Partagez votre expérience..." : "Share your experience..."}
                        placeholderTextColor={BRAND_GRAY}
                        value={comment}
                        onChangeText={setComment}
                        multiline maxLength={200}
                        textAlignVertical="top"
                        textAlign={isArabic ? 'right' : 'left'}
                      />
                      <Text style={[newStyles.charCount, isArabic && { textAlign: 'left' }]}>
                        {comment.length}/200 {isArabic ? 'حرف' : isFrench ? 'caractères' : 'characters'}
                      </Text>
                    </View>
                  </ScrollView>

                  <View style={[newStyles.modalActions, isArabic && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity style={newStyles.modalCancelBtn} onPress={closeRatingModal} disabled={isSubmitting}>
                      <Text style={newStyles.modalCancelText}>
                        {isArabic ? 'إلغاء' : isFrench ? 'Annuler' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[newStyles.modalSubmitBtn, (foodRating === 0 || deliveryRating === 0 || isSubmitting) && { opacity: 0.5 }]}
                      onPress={handleSubmitRating}
                      disabled={foodRating === 0 || deliveryRating === 0 || isSubmitting}
                    >
                      <Text style={newStyles.modalSubmitText}>
                        {isSubmitting
                          ? (isArabic ? 'جاري الإرسال...' : isFrench ? 'Envoi en cours...' : 'Submitting...')
                          : (isArabic ? 'إرسال التقييم' : isFrench ? 'Envoyer l\'avis' : 'Submit Rating')}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const newStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_CREAM,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: BRAND_CREAM,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_BORDER,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: BRAND_BROWN,
    letterSpacing: 0.2,
  },
  headerRight: {
    width: 36,
    alignItems: 'flex-end',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#EDFAF3',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22A55A',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22A55A',
  },

  // Tab bar
  tabBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND_CREAM,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_BORDER,
  },
  tabPillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: BRAND_BORDER,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabPillActive: {
    backgroundColor: BRAND_BROWN,
    borderColor: BRAND_BROWN,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_GRAY,
  },
  tabPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
    ...Platform.select({
      ios: { shadowColor: '#00000018', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  orderNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  orderNumText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  copiedBadge: {
    backgroundColor: '#22A55A20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  copiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22A55A',
  },
  orderDateText: {
    fontSize: 13,
    color: BRAND_GRAY,
    fontWeight: '500',
  },

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Progress
  progressSection: {
    marginBottom: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE3',
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#EDE8DF',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 7,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND_BROWN,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: BRAND_GRAY,
    fontStyle: 'italic',
  },

  // Timeline
  timelineSection: {
    marginBottom: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE3',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
  },
  timelineStepTop: {
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: BRAND_BORDER,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotDone: {
    backgroundColor: BRAND_BROWN,
    borderColor: BRAND_BROWN,
  },
  timelineDotActive: {
    backgroundColor: BRAND_BROWN,
    borderColor: BRAND_BROWN,
  },
  timelineDotPulse: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: `${BRAND_BROWN}40`,
    zIndex: -1,
  },
  timelineConnector: {
    flex: 1,
    height: 2,
    backgroundColor: BRAND_BORDER,
    marginTop: 0,
  },
  timelineConnectorDone: {
    backgroundColor: BRAND_BROWN,
  },
  timelineStepLabel: {
    fontSize: 10,
    color: BRAND_GRAY,
    textAlign: 'center',
    marginTop: 6,
  },
  timelineStepLabelDone: {
    color: BRAND_BROWN,
    fontWeight: '600',
  },
  timelineStepLabelActive: {
    color: BRAND_BROWN,
    fontWeight: '700',
  },

  // Time remaining
  timeRemainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
    backgroundColor: '#FEF3E7',
    marginBottom: 12,
  },
  timeRemainingText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Items block
  itemsBlock: {
    backgroundColor: ITEMS_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_BROWN,
    flexShrink: 0,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemsMore: {
    fontSize: 12,
    color: BRAND_BROWN,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE3',
  },
  footerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerMetaText: {
    fontSize: 12,
    color: BRAND_GRAY,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND_BROWN,
    letterSpacing: -0.3,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trackBtn: {
    flex: 1,
    backgroundColor: BRAND_BROWN,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: BRAND_BROWN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  trackBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  trackBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRAND_BORDER,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRAND_BROWN,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND_BROWN,
  },

  // Rating card
  ratingCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#F0DEC4',
    gap: 10,
  },
  ratingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ratingIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingRowLabel: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  ratingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C4813A',
  },
  ratingDivider: {
    height: 1,
    backgroundColor: '#EDE8DF',
  },
  ratingComment: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDE8DF',
    gap: 6,
  },
  ratingCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingCommentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ratingCommentText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 19,
    fontStyle: 'italic',
  },

  // Stars
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  emptyInner: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND_BORDER,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${BRAND_BROWN}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: BRAND_GRAY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: BRAND_BROWN,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 50,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  modalHead: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_BORDER,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${BRAND_BROWN}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: BRAND_GRAY,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  ratingSection: {
    marginBottom: 22,
    alignItems: 'center',
  },
  ratingSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
  },
  commentSection: { marginTop: 4 },
  commentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: BRAND_CREAM,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1A1A1A',
    minHeight: 90,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
    marginBottom: 6,
  },
  charCount: {
    fontSize: 11,
    color: BRAND_GRAY,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: BRAND_BORDER,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRAND_BROWN,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND_BROWN,
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: BRAND_BROWN,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});