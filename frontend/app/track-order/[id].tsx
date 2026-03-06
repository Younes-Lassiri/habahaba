import { OrderCardSkeleton, Skeleton, TimelineSkeleton } from '@/components/ui/skeleton';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import driverIcon from '@/assets/images/habahabaDriverIcon.png';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, Path, Svg } from 'react-native-svg';

const ANDROID_API_KEY = 'AIzaSyABM4rY2G3rijHtFVgLnBNpWhGETKYn3BA';
const IOS_API_KEY = 'AIzaSyCzxfUcrGi6V6D_cEXrmmB4sqTdl_8KL6Y';

// Your Google Maps API Key
const GOOGLE_API_KEY = Platform.select({
  android: ANDROID_API_KEY,
  ios: IOS_API_KEY,
});

// ─── Brand Colors ───────────────────────────────────────────────────────────
const Brand = {
  primary: '#93522B',
  primaryLight: '#8B4513',
  accent: '#C4956A',
  accentLight: '#E8C99A',
  background: '#f9f8f3',
  card: '#FFFFFF',
  sectionBg: '#F5EDE0',
  border: '#E8D5C0',
  success: '#4A7C59',
  warning: '#C4956A',
  error: '#B94040',
  text: {
    primary: '#1A0A00',
    secondary: '#8B6F5E',
    muted: '#B8A090',
    inverse: '#FFFFFF',
  },
};

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
  product_id?: number;
}

interface DriverInfo {
  name: string;
  rating: number;
  vehicle: string;
  vehicleDetails: string;
  phone: string;
  image?: string | null;
}

interface OrderTracking {
  id: string;
  orderNumber: string;
  set_prepared_at: Date;
  status: 'pending' | 'preparing' | 'out-for-delivery' | 'delivered' | 'canceled';
  estimatedDelivery: string;
  estimated_preparing_time?: number;
  driver: DriverInfo;
  address: {
    street: string;
    instructions?: string;
  };
  items: OrderItem[];
  timeline: Array<{
    label: string;
    time: string;
    status: 'completed' | 'current' | 'upcoming';
  }>;
  total: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  paymentMethod: string;
  created_at: string;
  lat?: number | string;
  lon?: number | string;
}

interface RestaurantSettings {
  is_open: boolean;
  restaurant_logo: string;
  restaurant_home_screen_icon: string;
  phone: string;
}

export const options = {
  headerShown: false,
};

const getGoogleRouteCoordinates = async (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<Array<{ latitude: number; longitude: number }>> => {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&key=${GOOGLE_API_KEY}&mode=driving`;
    console.log('Directions URL:', url.replace(GOOGLE_API_KEY!, 'HIDDEN_KEY')); // log without exposing key

    const response = await axios.get(url);
    console.log('Directions API response status:', response.data.status);
    
    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const points = route.overview_polyline.points;
      return decodePolyline(points);
    } else {
      console.warn('Directions API returned non-OK status:', response.data.status, response.data.error_message);
      // fallback to straight line
      return [
        { latitude: start.lat, longitude: start.lng },
        { latitude: end.lat, longitude: end.lng },
      ];
    }
  } catch (error) {
    console.error('Directions API request failed:', error);
    return [
      { latitude: start.lat, longitude: start.lng },
      { latitude: end.lat, longitude: end.lng },
    ];
  }
};

const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }
  return points;
};

const geocodeAddressWithGoogle = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`
    );
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Translation helper – memoized inside component
const createTranslations = (userLanguage: string) => {
  const isArabic = userLanguage === 'arabic';
  const isFrench = userLanguage === 'french';
  const tr = (en: string, ar: string, fr: string) => {
    if (isArabic) return ar;
    if (isFrench) return fr;
    return en;
  };

  return {
    loading: tr('Loading...', 'جاري التحميل...', 'Chargement...'),
    error: tr('Error', 'خطأ', 'Erreur'),
    back: tr('Back', 'رجوع', 'Retour'),
    cancel: tr('Cancel', 'إلغاء', 'Annuler'),
    yes: tr('Yes', 'نعم', 'Oui'),
    no: tr('No', 'لا', 'Non'),
    ok: tr('OK', 'موافق', 'OK'),
    trackOrder: tr('Track Order', 'تتبع الطلب', 'Suivre la commande'),
    delivered: tr('Delivered', 'تم التوصيل', 'Livrée'),
    outForDelivery: tr('Out for Delivery', 'قيد التوصيل', 'En cours de livraison'),
    preparing: tr('Preparing', 'قيد التحضير', 'En préparation'),
    pending: tr('Pending', 'قيد الانتظار', 'En attente'),
    canceled: tr('Canceled', 'ملغي', 'Annulée'),
    orderProgress: tr('Order Timeline', 'تقدم الطلب', 'Chronologie de la commande'),
    orderConfirmed: tr('Order Placed', 'تم تأكيد الطلب', 'Commande passée'),
    preparingOrder: tr('Preparing Your Food', 'قيد التحضير', 'Préparation de votre repas'),
    outDelivery: tr('Out for Delivery', 'قيد التوصيل', 'En cours de livraison'),
    orderDelivered: tr('Delivered', 'تم التوصيل', 'Livrée'),
    orderCanceled: tr('Order Canceled', 'تم الإلغاء', 'Commande annulée'),
    deliveryDriver: tr('Your Delivery Driver', 'سائق التوصيل', 'Votre livreur'),
    notAssigned: tr('Not Assigned', 'غير معين', 'Non assigné'),
    waitingAssignment: tr('Waiting for driver assignment', 'في انتظار تعيين السائق', 'En attente d\'attribution du livreur'),
    driverNotAssigned: tr('Driver Not Assigned Yet', 'لم يتم تعيين السائق بعد', 'Livreur pas encore assigné'),
    driverSearchMessage: tr("We're currently looking for a delivery driver to assign to your order.",
      'نحن نبحث حالياً عن سائق توصيل لتعيينه لطلبك.',
      'Nous recherchons actuellement un livreur pour assigner à votre commande.'),
    preparingInfo: tr('Your order is being prepared and will be assigned shortly.',
      'طلبك قيد التحضير وسيتم تعيين سائق قريباً.',
      'Votre commande est en préparation et sera assignée sous peu.'),
    orderDetails: tr('Order Items', 'تفاصيل الطلب', 'Détails de la commande'),
    subtotal: tr('Subtotal', 'المجموع الفرعي', 'Sous-total'),
    discount: tr('Discount', 'خصم', 'Remise'),
    deliveryFee: tr('Delivery Fee', 'رسوم التوصيل', 'Frais de livraison'),
    total: tr('Total', 'الإجمالي', 'Total'),
    paymentMethod: tr('Payment Method', 'طريقة الدفع', 'Mode de paiement'),
    estimatedDelivery: tr('Est. Delivery', 'الوقت المتوقع للتوصيل', 'Livraison estimée'),
    cardPayment: tr('💳 Card', '💳 بطاقة', '💳 Carte'),
    cashPayment: tr('💵 Cash on Delivery', '💵 نقداً عند الاستلام', '💵 Paiement à la livraison'),
    deliveryAddress: tr('Delivery Address', 'عنوان التوصيل', 'Adresse de livraison'),
    waitingDriverLocation: tr('Waiting for driver location...', 'في انتظار موقع السائق...', 'En attente de la position du livreur...'),
    orderDeliveredSuccessfully: tr('Order delivered successfully', 'تم توصيل الطلب بنجاح', 'Commande livrée avec succès'),
    deliveryAddressTitle: tr('Delivery Address', 'عنوان التوصيل', 'Adresse de livraison'),
    deliveryDriverTitle: tr('Delivery Driver', 'سائق التوصيل', 'Livreur'),
    minutesRemaining: (minutes: number) => tr(`${minutes} min remaining`, `${minutes} دقيقة متبقية`, `${minutes} min restantes`),
    almostDone: tr('Almost done (or delivered)', 'على وشك الانتهاء (أو تم التوصيل)', 'Presque terminé (ou livré)'),
    timeFormatError: tr('Error: Invalid time format', 'خطأ في تنسيق الوقت', 'Erreur : format d\'heure invalide'),
    dateFormatError: tr('Error: Invalid prepared date.', 'خطأ في تنسيق التاريخ', 'Erreur : date de préparation invalide.'),
    deliveryTimeError: tr('Error calculating delivery time', 'خطأ في حساب وقت التوصيل', 'Erreur de calcul du temps de livraison'),
    orderNotFound: tr('Order not found', 'الطلب غير موجود', 'Commande introuvable'),
    orderNotFoundMessage: tr("We couldn't locate the order you're looking for.",
      'لم نتمكن من العثور على الطلب الذي تبحث عنه.',
      'Nous n\'avons pas pu localiser la commande que vous recherchez.'),
    viewOrders: tr('View Orders', 'عرض الطلبات', 'Voir les commandes'),
    callRestaurant: tr('Contact Restaurant', 'اتصال بالمطعم', 'Contacter le restaurant'),
    needHelp: tr('Need Help?', 'مساعدة', 'Besoin d\'aide ?'),
    needHelpTitle: tr('Need Help?', 'تحتاج مساعدة؟', 'Besoin d\'aide ?'),
    whatsappMessage: tr('Contact us on WhatsApp for assistance with your order',
      'تواصل معنا على واتساب للحصول على المساعدة بخصوص طلبك',
      'Contactez-nous sur WhatsApp pour obtenir de l\'aide concernant votre commande'),
    whatsappNumber: tr('WhatsApp Number:', 'رقم واتساب:', 'Numéro WhatsApp :'),
    openWhatsApp: tr('Open WhatsApp', 'فتح واتساب', 'Ouvrir WhatsApp'),
    contactNotAvailable: tr('Contact Not Available', 'جهة الاتصال غير متوفرة', 'Contact non disponible'),
    restaurantPhoneNotAvailable: tr('Restaurant phone number is not available',
      'رقم هاتف المطعم غير متوفر',
      'Le numéro de téléphone du restaurant n\'est pas disponible'),
    whatsappNotAvailable: tr('Restaurant WhatsApp number is not available',
      'رقم واتساب المطعم غير متوفر',
      'Le numéro WhatsApp du restaurant n\'est pas disponible'),
    unableToCall: tr('Unable to make phone calls on this device',
      'غير قادر على إجراء المكالمات على هذا الجهاز',
      'Impossible de passer des appels sur cet appareil'),
    failedToOpenDialer: tr('Failed to open phone dialer',
      'فشل في فتح تطبيق الهاتف',
      'Échec de l\'ouverture du téléphone'),
    whatsappNotInstalled: tr('WhatsApp is not installed on this device',
      'تطبيق واتساب غير مثبت على هذا الجهاز',
      'WhatsApp n\'est pas installé sur cet appareil'),
    failedToOpenWhatsapp: tr('Failed to open WhatsApp',
      'فشل في فتح واتساب',
      'Échec de l\'ouverture de WhatsApp'),
    estimatedToBeDelivered: tr('Estimated arrival:', 'مقدر أن يتم التوصيل', 'Arrivée estimée :'),
    stillPending: tr('Still Pending', 'ما زال قيد الانتظار', 'Toujours en attente'),
    call: tr('Call', 'اتصال', 'Appeler'),
    message: tr('Message', 'رسالة', 'Message'),
    estimatedShortTime: tr('15-20 min', '15-20 دقيقة', '15-20 min'),
  };
};

// ─── Timeline step icon mapping ────────────────────────────────────────────
const getTimelineIcon = (label: string, status: string) => {
  if (label.toLowerCase().includes('placed') || label.toLowerCase().includes('confirmed') || label.includes('تأكيد') || label.includes('passée')) return 'checkmark-circle';
  if (label.toLowerCase().includes('prepar') || label.includes('تحضير') || label.includes('préparation')) return 'fast-food';
  if (label.toLowerCase().includes('delivery') || label.includes('توصيل') || label.includes('livraison')) return 'bicycle';
  if (label.toLowerCase().includes('delivered') || label.includes('تم التوصيل') || label.includes('livrée')) return 'home';
  if (label.toLowerCase().includes('cancel') || label.includes('إلغاء') || label.includes('annul')) return 'close-circle';
  return 'ellipse';
};

// ─── Status banner config ──────────────────────────────────────────────────
const getStatusConfig = (status: string, t: ReturnType<typeof createTranslations>) => {
  switch (status) {
    case 'delivered':
      return { label: t.delivered, subtitle: t.orderDeliveredSuccessfully, icon: 'checkmark-circle' as const, color: Brand.success };
    case 'out-for-delivery':
      return { label: t.outForDelivery, subtitle: t.outDelivery, icon: 'bicycle' as const, color: Brand.primary };
    case 'preparing':
      return { label: t.preparing, subtitle: t.preparingOrder, icon: 'restaurant' as const, color: Brand.accent };
    case 'canceled':
      return { label: t.canceled, subtitle: t.orderCanceled, icon: 'close-circle' as const, color: Brand.error };
    default:
      return { label: t.pending, subtitle: t.stillPending, icon: 'time-outline' as const, color: Brand.accent };
  }
};

export default function TrackOrderScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { userLanguage: rawUserLanguage } = useLocalSearchParams();
  const userLanguage = String(rawUserLanguage || 'english');

  const [trackingData, setTrackingData] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [clientImage, setClientImage] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    is_open: true,
    restaurant_logo: '',
    restaurant_home_screen_icon: '',
    phone: '',
  });
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const mapRef = useRef<MapView>(null);
  const isMounted = useRef(true);
  const prevTrackingDataRef = useRef<OrderTracking | null>(null);
  const prevDriverLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Memoize translations
  const t = useMemo(() => createTranslations(userLanguage), [userLanguage]);
  const isRTL = userLanguage === 'arabic';

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchRestaurantSettings = async () => {
    try {
      const response = await axios.get("https://haba-haba-api.ubua.cloud/api/auth/restaurant-settings");
      if (response.data.success && response.data.settings && isMounted.current) {
        setRestaurantSettings(response.data.settings);
      }
    } catch (error) {
      console.error("Failed to fetch restaurant settings:", error);
    }
  };

  const fetchDeliveryManLocation = useCallback(async () => {
    if (!orderId || !trackingData || !trackingData.driver || trackingData.driver.name === t.notAssigned) return;
    try {
      setLocationLoading(true);
      const response = await axios.get(`https://haba-haba-api.ubua.cloud/api/auth/get-delivery-man-location`, {
        params: { order_id: orderId },
      });
      if (!isMounted.current) return;
      if (response.data.hasLocation && response.data.location) {
        const location = { lat: response.data.location.latitude, lng: response.data.location.longitude };
        // Only update if significantly changed
        const prev = prevDriverLocationRef.current;
        if (!prev || Math.abs(prev.lat - location.lat) > 0.00001 || Math.abs(prev.lng - location.lng) > 0.00001) {
          setDriverLocation(location);
          prevDriverLocationRef.current = location;
        }
      } else {
        setDriverLocation(null);
        prevDriverLocationRef.current = null;
      }
    } catch (error) {
      console.error('Error fetching delivery man location:', error);
    } finally {
      if (isMounted.current) setLocationLoading(false);
    }
  }, [orderId, trackingData, t.notAssigned]);

  useEffect(() => {
    if (trackingData && trackingData.driver && trackingData.driver.name !== t.notAssigned) {
      if (trackingData.status !== 'delivered' && trackingData.status !== 'canceled') {
        fetchDeliveryManLocation();
      } else {
        setDriverLocation(null);
        prevDriverLocationRef.current = null;
      }
    }
  }, [trackingData?.id, trackingData?.driver?.name, trackingData?.status, t.notAssigned, fetchDeliveryManLocation]);

  useEffect(() => {
    if (mapRef.current && trackingData && trackingData.status !== 'delivered' && trackingData.status !== 'canceled') {
      if (driverLocation && destinationLocation) {
        const minLat = Math.min(driverLocation.lat, destinationLocation.lat);
        const maxLat = Math.max(driverLocation.lat, destinationLocation.lat);
        const minLng = Math.min(driverLocation.lng, destinationLocation.lng);
        const maxLng = Math.max(driverLocation.lng, destinationLocation.lng);
        mapRef.current.animateToRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
          longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
        }, 800);
      } else if (driverLocation) {
        mapRef.current.animateToRegion({ latitude: driverLocation.lat, longitude: driverLocation.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
      } else if (destinationLocation) {
        mapRef.current.animateToRegion({ latitude: destinationLocation.lat, longitude: destinationLocation.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
      }
    }
  }, [driverLocation?.lat, driverLocation?.lng, destinationLocation?.lat, destinationLocation?.lng, trackingData?.status]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const fetchRoute = async () => {
      if (driverLocation && destinationLocation) {
        timeoutId = setTimeout(async () => {
          const route = await getGoogleRouteCoordinates(driverLocation, destinationLocation);
          if (isMounted.current) setRouteCoordinates(route);
        }, 2000);
      } else {
        setRouteCoordinates([]);
      }
    };
    fetchRoute();
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [driverLocation?.lat, driverLocation?.lng, destinationLocation?.lat, destinationLocation?.lng]);

  useEffect(() => {
    const setDestinationLocationFromOrder = async () => {
      if (trackingData && trackingData.status !== 'delivered' && trackingData.status !== 'canceled') {
        if (trackingData.lat && trackingData.lon) {
          const lat = typeof trackingData.lat === 'string' ? parseFloat(trackingData.lat) : Number(trackingData.lat);
          const lon = typeof trackingData.lon === 'string' ? parseFloat(trackingData.lon) : Number(trackingData.lon);
          if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
            setDestinationLocation({ lat, lng: lon });
            return;
          }
        }
        if (!trackingData.lat || !trackingData.lon) {
          if (trackingData.address && trackingData.address.street) {
            const coords = await geocodeAddressWithGoogle(trackingData.address.street);
            if (coords && isMounted.current) setDestinationLocation(coords);
          }
        }
      }
    };
    setDestinationLocationFromOrder();
  }, [trackingData?.lat, trackingData?.lon, trackingData?.address?.street, trackingData?.status]);

  const fetchOrderData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading && isMounted.current) setLoading(true);
      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;
      if (!user || !user.id) {
        if (showLoading && isMounted.current) Alert.alert(t.error, 'User not found');
        return;
      }

      if (user.image && isMounted.current) {
        const imageUrl = user.image.startsWith('http') || user.image.startsWith('file://')
          ? user.image
          : `https://haba-haba-api.ubua.cloud/uploads/profileImages/${user.image}`;
        setClientImage(imageUrl);
      } else if (isMounted.current) {
        setClientImage(null);
      }

      const res = await axios.get(`https://haba-haba-api.ubua.cloud/api/auth/get-orders`, { params: { user_id: user.id } });
      const order = res.data.orders?.find((o: any) => o.id.toString() === orderId);
      if (!order) {
        if (isMounted.current) setTrackingData(null);
        return;
      }

      const normalizeStatus = (status: string): 'pending' | 'preparing' | 'out-for-delivery' | 'delivered' | 'canceled' => {
        const normalized = status.toLowerCase().trim().replace(/\s+/g, '-');
        if (normalized === 'pending') return 'pending';
        if (normalized === 'preparing') return 'preparing';
        if (normalized.includes('out') && normalized.includes('delivery')) return 'out-for-delivery';
        if (normalized === 'delivered') return 'delivered';
        if (normalized === 'canceled' || normalized === 'cancelled') return 'canceled';
        return 'pending';
      };

      const orderStatus = normalizeStatus(order.status);
      const orderDate = new Date(order.created_at);
      const updatedAt = order.set_prepared_at ? new Date(order.set_prepared_at) : orderDate;

      let estimatedDelivery = t.delivered;
      if (orderStatus === "pending") {
        estimatedDelivery = t.stillPending;
      } else if (orderStatus === "preparing") {
        const baseDate = order.set_prepared_at ? updatedAt : orderDate;
        const estimatedTime = new Date(baseDate.getTime() + (order.estimated_preparing_time || 0) * 60 * 1000);
        estimatedDelivery = estimatedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      } else if (orderStatus === "out-for-delivery") {
        const baseDate = order.set_prepared_at ? updatedAt : orderDate;
        const estimatedTime = new Date(baseDate.getTime() + ((order.estimated_preparing_time || 0) + 15) * 60 * 1000);
        estimatedDelivery = estimatedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }

      const timeline = generateTimeline(orderStatus, orderDate, updatedAt);
      const subtotal = (order.order_items || []).reduce((sum: number, item: any) => sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
      const deliveryMan = order.delivery_man || null;
      const driverInfo: DriverInfo = deliveryMan ? {
        name: deliveryMan.name || t.deliveryDriver,
        rating: 4.9,
        vehicle: deliveryMan.vehicle_type || 'Motorcycle',
        vehicleDetails: `${deliveryMan.vehicle_type || 'Motorcycle'}`,
        phone: deliveryMan.phone || 'N/A',
        image: deliveryMan.image || null,
      } : {
        name: t.notAssigned,
        rating: 0,
        vehicle: 'N/A',
        vehicleDetails: t.waitingAssignment,
        phone: 'N/A',
        image: null,
      };

      if (deliveryMan && deliveryMan.current_latitude && deliveryMan.current_longitude && isMounted.current) {
        const location = { lat: parseFloat(deliveryMan.current_latitude), lng: parseFloat(deliveryMan.current_longitude) };
        const prev = prevDriverLocationRef.current;
        if (!prev || Math.abs(prev.lat - location.lat) > 0.00001 || Math.abs(prev.lng - location.lng) > 0.00001) {
          setDriverLocation(location);
          prevDriverLocationRef.current = location;
        }
      }

      const transformedData: OrderTracking = {
        id: order.id.toString(),
        orderNumber: order.order_number || `ORD-${order.id}`,
        set_prepared_at: order.set_prepared_at,
        status: orderStatus,
        estimatedDelivery,
        estimated_preparing_time: order.estimated_preparing_time ? parseInt(order.estimated_preparing_time) : undefined,
        driver: driverInfo,
        address: { street: order.delivery_address || 'Address not specified' },
        items: (order.order_items || []).map((item: any) => ({
          name: item.product_name || `Product #${item.product_id}`,
          quantity: item.quantity || 1,
          price: item.price || 0,
          image: item.product_image || null,
          product_id: item.product_id,
        })),
        timeline,
        subtotal,
        deliveryFee: parseFloat(order.delivery_fee || 15),
        discount: parseFloat(order.discount || 0),
        total: parseFloat(order.final_price || order.total_price || 0),
        paymentMethod: order.payment_status === 'Paid' ? t.cardPayment : t.cashPayment,
        created_at: order.created_at,
        lat: order.lat || null,
        lon: order.lon || null,
      };

      // Compare with previous data to avoid unnecessary updates
      const prev = prevTrackingDataRef.current;
      if (!prev || JSON.stringify(prev) !== JSON.stringify(transformedData)) {
        if (isMounted.current) {
          setTrackingData(transformedData);
          prevTrackingDataRef.current = transformedData;
        }
      }
    } catch (err: any) {
      console.error('Fetch Order Error:', err);
      if (showLoading && isMounted.current) Alert.alert(t.error, 'Failed to fetch order details');
    } finally {
      if (showLoading && isMounted.current) setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    fetchOrderData(true);
    fetchRestaurantSettings();
  }, [fetchOrderData]);

  useEffect(() => {
    if (!trackingData || trackingData.status === 'delivered' || trackingData.status === 'canceled') return;

    const orderInterval = setInterval(() => { fetchOrderData(false); }, 6000);
    let locationInterval: ReturnType<typeof setInterval> | null = null;

    if (trackingData.driver && trackingData.driver.name !== t.notAssigned) {
      locationInterval = setInterval(() => { fetchDeliveryManLocation(); }, 3000);
      fetchDeliveryManLocation(); // immediate first fetch
    }

    return () => {
      clearInterval(orderInterval);
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [trackingData?.status, trackingData?.driver?.name, t.notAssigned, fetchDeliveryManLocation, fetchOrderData]);

  const generateTimeline = (status: string, orderDate: Date, updatedAt: Date) => {
    const now = new Date();
    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const preparingTime = updatedAt > orderDate ? updatedAt : new Date(orderDate.getTime() + 5 * 60000);
    const outForDeliveryTime = status === 'out-for-delivery' || status === 'delivered'
      ? (updatedAt > orderDate ? updatedAt : new Date(orderDate.getTime() + 20 * 60000)) : null;
    const deliveredTime = status === 'delivered'
      ? (updatedAt > orderDate ? updatedAt : new Date(orderDate.getTime() + 35 * 60000)) : null;

    const timelines: Record<string, Array<{ label: string; time: string; status: 'completed' | 'current' | 'upcoming' }>> = {
      pending: [
        { label: t.orderConfirmed, time: formatTime(orderDate), status: 'completed' },
        { label: t.preparingOrder, time: '—', status: 'upcoming' },
        { label: t.outDelivery, time: '—', status: 'upcoming' },
        { label: t.orderDelivered, time: '—', status: 'upcoming' },
      ],
      preparing: [
        { label: t.orderConfirmed, time: formatTime(orderDate), status: 'completed' },
        { label: t.preparingOrder, time: formatTime(preparingTime), status: 'current' },
        { label: t.outDelivery, time: '—', status: 'upcoming' },
        { label: t.orderDelivered, time: '—', status: 'upcoming' },
      ],
      'out-for-delivery': [
        { label: t.orderConfirmed, time: formatTime(orderDate), status: 'completed' },
        { label: t.preparingOrder, time: formatTime(preparingTime), status: 'completed' },
        { label: t.outDelivery, time: formatTime(outForDeliveryTime || updatedAt), status: 'current' },
        { label: t.orderDelivered, time: '—', status: 'upcoming' },
      ],
      delivered: [
        { label: t.orderConfirmed, time: formatTime(orderDate), status: 'completed' },
        { label: t.preparingOrder, time: formatTime(preparingTime), status: 'completed' },
        { label: t.outDelivery, time: formatTime(outForDeliveryTime || updatedAt), status: 'completed' },
        { label: t.orderDelivered, time: formatTime(deliveredTime || updatedAt), status: 'completed' },
      ],
      canceled: [
        { label: t.orderConfirmed, time: formatTime(orderDate), status: 'completed' },
        { label: t.orderCanceled, time: formatTime(now), status: 'current' },
      ],
    };
    return timelines[status] || timelines.pending;
  };

  const handleCallRestaurant = async () => {
    if (!restaurantSettings.phone) { Alert.alert(t.contactNotAvailable, t.restaurantPhoneNotAvailable); return; }
    const phoneNumber = restaurantSettings.phone.replace(/[^\d+]/g, '');
    const phoneUrl = `tel:${phoneNumber}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) await Linking.openURL(phoneUrl);
      else Alert.alert(t.error, t.unableToCall);
    } catch (error) {
      Alert.alert(t.error, t.failedToOpenDialer);
    }
  };

  const handleOpenWhatsApp = async () => {
    if (!restaurantSettings.phone) { Alert.alert(t.contactNotAvailable, t.whatsappNotAvailable); return; }
    const whatsappNumber = restaurantSettings.phone.replace(/[^\d+]/g, '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}`;
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) { await Linking.openURL(whatsappUrl); setShowWhatsAppModal(false); }
      else Alert.alert(t.error, t.whatsappNotInstalled);
    } catch (error) {
      Alert.alert(t.error, t.failedToOpenWhatsapp);
    }
  };

  function calculateDeliveryRemainingTime(order: OrderTracking) {
    if (!order?.set_prepared_at || !order?.estimatedDelivery) return t.loading;
    const preparedDate = new Date(order.set_prepared_at);
    if (isNaN(preparedDate.getTime())) return t.dateFormatError;
    try {
      const timeStr = order.estimatedDelivery.trim().toUpperCase();
      const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeParts) return t.timeFormatError;
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const period = timeParts[3];
      if (period === 'PM' && hours < 12) hours += 12;
      else if (period === 'AM' && hours === 12) hours = 0;
      const estimatedDeliveryDate = new Date(preparedDate);
      estimatedDeliveryDate.setHours(hours, minutes, 0, 0);
      if (estimatedDeliveryDate.getTime() < preparedDate.getTime()) estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 1);
      const timeRemainingMs = estimatedDeliveryDate.getTime() - Date.now();
      const remainingMinutes = Math.max(0, Math.ceil(timeRemainingMs / 60000));
      return remainingMinutes > 0 ? t.minutesRemaining(remainingMinutes) : t.almostDone;
    } catch (error) {
      return t.deliveryTimeError;
    }
  }

  const statusConfig = trackingData ? getStatusConfig(trackingData.status, t) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Brand.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.trackOrder}</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={{ padding: 16 }}>
            <Skeleton width="100%" height={160} borderRadius={20} style={{ marginBottom: 16 }} />
            <TimelineSkeleton />
            <Skeleton width="100%" height={200} borderRadius={16} style={{ marginTop: 16, marginBottom: 16 }} />
            <OrderCardSkeleton />
          </View>
        </ScrollView>
      ) : !trackingData ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={Brand.accent} />
          </View>
          <Text style={styles.emptyStateTitle}>{t.orderNotFound}</Text>
          <Text style={styles.emptyStateText}>{t.orderNotFoundMessage}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/Orders')}>
            <Ionicons name="receipt-outline" size={18} color={Brand.text.inverse} />
            <Text style={styles.primaryButtonText}>{t.viewOrders}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

            {/* ── Hero Status Banner ── */}
            <LinearGradient
              colors={[Brand.primary, Brand.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              {/* Decorative watermark circles */}
              <View style={styles.heroDecorCircle1} />
              <View style={styles.heroDecorCircle2} />

              <View style={styles.heroLeft}>
                <View style={styles.heroIconWrap}>
                  <Ionicons name={statusConfig!.icon} size={30} color={Brand.text.inverse} />
                </View>
                <View>
                  <Text style={styles.heroStatusLabel}>{statusConfig!.label}</Text>
                  <Text style={styles.heroStatusSub}>{statusConfig!.subtitle}</Text>
                </View>
              </View>

              {trackingData.status !== 'delivered' && trackingData.status !== 'canceled' && (
                <View style={styles.heroEtaBox}>
                  <Ionicons name="time-outline" size={14} color={Brand.accentLight} />
                  <Text style={styles.heroEtaLabel}>{t.estimatedToBeDelivered}</Text>
                  <Text style={styles.heroEtaValue}>
                    {trackingData.status === 'preparing'
                      ? calculateDeliveryRemainingTime(trackingData)
                      : t.estimatedShortTime}
                  </Text>
                </View>
              )}

              <Text style={[styles.heroOrderNum, { textAlign: isRTL ? 'right' : 'left' }]}>{trackingData.orderNumber}</Text>
            </LinearGradient>

            {/* ── Map Card ── */}
            <View style={styles.mapCard}>
              {trackingData.status !== 'delivered' && trackingData.status !== 'canceled' ? (
                trackingData.driver.name === t.notAssigned ? (
                    <View style={styles.noDriverContainer}>
                      <View style={styles.noDriverIconWrap}>
                        <Image source={driverIcon} style={styles.driverIcon} />
                      </View>
                      <Text style={styles.noDriverTitle}>{t.driverNotAssigned}</Text>
                      <Text style={styles.noDriverMessage}>{t.driverSearchMessage}</Text>
                      <View style={styles.noDriverInfoRow}>
                        <Ionicons name="information-circle-outline" size={16} color={Brand.primary} />
                        <Text style={styles.noDriverInfoText}>{t.preparingInfo}</Text>
                      </View>
                    </View>
                  ) : (
                  <>
                    <MapView
                      ref={mapRef}
                      provider={PROVIDER_GOOGLE}
                      style={styles.mapView}
                      initialRegion={driverLocation ? {
                        latitude: driverLocation.lat,
                        longitude: driverLocation.lng,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      } : destinationLocation ? {
                        latitude: destinationLocation.lat,
                        longitude: destinationLocation.lng,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      } : { latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
                      showsUserLocation={false}
                      showsMyLocationButton={false}
                      scrollEnabled={true}
                      pitchEnabled={true}
                      rotateEnabled={true}
                      onMapReady={() => {
                        if (driverLocation && mapRef.current) {
                          mapRef.current.animateToRegion({ latitude: driverLocation.lat, longitude: driverLocation.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
                        }
                      }}
                    >
                      {routeCoordinates.length > 0 && (
                        <Polyline coordinates={routeCoordinates} strokeColor={Brand.accent} strokeWidth={4} lineCap="round" lineJoin="round" />
                      )}
                     {driverLocation && (
                        <Marker
                          coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                          title={t.deliveryDriver}
                          description={`${trackingData.driver.name} - ${trackingData.driver.vehicle}`}
                          anchor={{ x: 0.5, y: 0.5 }}
                          flat={true}
                        >
                          <Image source={driverIcon} style={styles.driverMarkerIcon} />
                        </Marker>
                      )}
                      {destinationLocation && (
                        <Marker
                          coordinate={{ latitude: destinationLocation.lat, longitude: destinationLocation.lng }}
                          title={t.deliveryAddressTitle}
                          description={trackingData.address.street}
                          anchor={{ x: 0.5, y: 1 }}
                          flat={false}
                        >
                          <DestinationIcon clientImage={clientImage} />
                        </Marker>
                      )}
                    </MapView>
                    {!driverLocation && !locationLoading && (
                      <View style={styles.mapOverlayPill}>
                        <Ionicons name="location-outline" size={16} color={Brand.text.secondary} />
                        <Text style={styles.mapOverlayText}>{t.waitingDriverLocation}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.refreshBtn}
                      onPress={() => {
                        fetchOrderData(false);
                        fetchDeliveryManLocation();
                        if (driverLocation && mapRef.current) {
                          mapRef.current.animateToRegion({ latitude: driverLocation.lat, longitude: driverLocation.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
                        }
                      }}
                    >
                      <Ionicons name="refresh" size={18} color={Brand.primary} />
                    </TouchableOpacity>
                  </>
                )
              ) : (
                <LinearGradient colors={[Brand.sectionBg, Brand.background]} style={styles.deliveredMapState}>
                  <View style={styles.deliveredCheckCircle}>
                    <Ionicons name="checkmark" size={32} color={Brand.text.inverse} />
                  </View>
                  <Text style={styles.deliveredMapLabel}>{t.orderDeliveredSuccessfully}</Text>
                </LinearGradient>
              )}
            </View>

            {/* ── Driver Card ── */}
            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.deliveryDriver}</Text>
              <View style={[styles.driverRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Avatar */}
                <View style={styles.driverAvatarWrap}>
                  {trackingData.driver.image ? (
                    <Image
                      source={{
                        uri: trackingData.driver.image.startsWith('http') || trackingData.driver.image.startsWith('file://')
                          ? trackingData.driver.image
                          : `https://haba-haba-api.ubua.cloud/uploads/deliveryManImages/${trackingData.driver.image.replace(/\\/g, '/')}`,
                      }}
                      style={styles.driverAvatarImg}
                    />
                  ) : (
                    <View style={styles.driverAvatarFallback}>
                      <Ionicons name="person" size={26} color={Brand.primary} />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={[styles.driverName, { textAlign: isRTL ? 'right' : 'left' }]}>{trackingData.driver.name}</Text>
                  {trackingData.driver.rating > 0 && (
                    <View style={[styles.ratingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="star" size={13} color="#F5A623" />
                      <Text style={styles.ratingText}>{trackingData.driver.rating.toFixed(1)}</Text>
                      <Text style={styles.vehicleDot}>•</Text>
                      <Text style={styles.vehicleText}>{trackingData.driver.vehicle}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={[styles.driverActionBtns, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[styles.driverActionBtn, styles.driverActionBtnPrimary, trackingData.driver.phone === 'N/A' && styles.disabledBtn]}
                    disabled={trackingData.driver.phone === 'N/A'}
                    onPress={async () => {
                      if (trackingData.driver.phone !== 'N/A') {
                        const phoneNumber = trackingData.driver.phone.replace(/[^\d+]/g, '');
                        const phoneUrl = `tel:${phoneNumber}`;
                        try {
                          const canOpen = await Linking.canOpenURL(phoneUrl);
                          if (canOpen) await Linking.openURL(phoneUrl);
                          else Alert.alert(t.error, t.unableToCall);
                        } catch (error) {
                          Alert.alert(t.error, t.failedToOpenDialer);
                        }
                      }
                    }}
                  >
                    <Ionicons name="call" size={17} color={Brand.text.inverse} />
                    <Text style={styles.driverActionBtnText}>{t.call}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.driverActionBtn, styles.driverActionBtnSecondary, trackingData.driver.phone === 'N/A' && styles.disabledBtn]}
                    disabled={trackingData.driver.phone === 'N/A'}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={17} color={Brand.primary} />
                    <Text style={styles.driverActionBtnTextSecondary}>{t.message}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── Timeline ── */}
            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.orderProgress}</Text>
              {trackingData.timeline.map((step, index) => {
                const isLast = index === trackingData.timeline.length - 1;
                const iconName = getTimelineIcon(step.label, step.status);
                return (
                  <View key={`${step.label}-${index}`} style={[styles.timelineRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {/* Left indicator column */}
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        step.status === 'completed' && styles.timelineDotDone,
                        step.status === 'current' && styles.timelineDotActive,
                        step.status === 'upcoming' && styles.timelineDotUpcoming,
                      ]}>
                        {step.status === 'completed' && <Ionicons name="checkmark" size={13} color={Brand.text.inverse} />}
                        {step.status === 'current' && <Ionicons name={iconName as any} size={13} color={Brand.text.inverse} />}
                        {step.status === 'upcoming' && <View style={styles.timelineDotInner} />}
                      </View>
                      {!isLast && <View style={[styles.timelineConnector, step.status === 'completed' && styles.timelineConnectorDone]} />}
                    </View>
                    {/* Content */}
                    <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                      <Text style={[
                        styles.timelineLabel,
                        step.status === 'upcoming' && styles.timelineLabelMuted,
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}>{step.label}</Text>
                      <Text style={[styles.timelineTime, { textAlign: isRTL ? 'right' : 'left' }]}>{step.time}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── Delivery Address ── */}
            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.deliveryAddress}</Text>
              <View style={[styles.addressRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.addressIconWrap}>
                  <Ionicons name="location" size={18} color={Brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addressStreet, { textAlign: isRTL ? 'right' : 'left' }]}>{trackingData.address.street}</Text>
                  {trackingData.address.instructions && (
                    <Text style={[styles.addressInstructions, { textAlign: isRTL ? 'right' : 'left' }]}>{trackingData.address.instructions}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* ── Order Items ── */}
            <View style={styles.sectionCard}>
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.sectionTitle, { marginBottom: 0, textAlign: isRTL ? 'right' : 'left' }]}>{t.orderDetails}</Text>
              </View>

              <View style={{ marginTop: 16 }}>
                {trackingData.items.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={[styles.orderItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }, index === trackingData.items.length - 1 && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.orderItemName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{item.name}</Text>
                      <Text style={[styles.orderItemQty, { textAlign: isRTL ? 'right' : 'left' }]}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.orderItemPrice}>{(item.quantity * item.price)} MAD</Text>
                  </View>
                ))}
              </View>

              {/* Divider */}
              <View style={styles.summaryDivider} />

              {/* Totals */}
              {trackingData.discount > 0 && (
                <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.summaryLabel}>{t.subtotal}</Text>
                  <Text style={styles.summaryValue}>{trackingData.subtotal} MAD</Text>
                </View>
              )}
              <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.summaryLabel, { color: Brand.success }]}>{t.deliveryFee}</Text>
                  <Text style={[styles.summaryValue, { color: Brand.success }]}>+{trackingData.deliveryFee} MAD</Text>
                </View>
              {trackingData.discount > 0 && (
                <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.summaryLabel, { color: Brand.success }]}>{t.discount}</Text>
                  <Text style={[styles.summaryValue, { color: Brand.success }]}>-{trackingData.discount} MAD</Text>
                </View>
              )}
              <View style={[styles.summaryTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.summaryTotalLabel}>{t.total}</Text>
                <Text style={styles.summaryTotalValue}>{trackingData.total} MAD</Text>
              </View>
            </View>

            {/* ── Need Help card ── */}
            <View style={styles.needHelpCard}>
              <View style={styles.needHelpLeft}>
                <Text style={styles.needHelpTitle}>{t.needHelp}</Text>
                <Text style={styles.needHelpSub}>{t.whatsappMessage}</Text>
              </View>
            </View>

          </ScrollView>

          {/* ── Sticky Footer ── */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleCallRestaurant}>
              <Ionicons name="call" size={18} color={Brand.text.inverse} />
              <Text style={styles.primaryButtonText}>{t.callRestaurant}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowWhatsAppModal(true)}>
              <Ionicons name="logo-whatsapp" size={18} color={Brand.primary} />
              <Text style={styles.secondaryButtonText}>{t.needHelp}</Text>
            </TouchableOpacity>
          </View>

          {/* ── WhatsApp Modal ── */}
          <Modal visible={showWhatsAppModal} transparent animationType="fade" onRequestClose={() => setShowWhatsAppModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowWhatsAppModal(false)}>
              <View style={styles.modalCard}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="logo-whatsapp" size={36} color="#25D366" />
                </View>
                <Text style={styles.modalTitle}>{t.needHelpTitle}</Text>
                <Text style={styles.modalSubtitle}>{t.whatsappMessage}</Text>
                <View style={styles.modalNumberBox}>
                  <Ionicons name="call-outline" size={16} color={Brand.primary} />
                  <Text style={styles.modalNumber}>{restaurantSettings.phone || t.loading}</Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowWhatsAppModal(false)}>
                    <Text style={styles.modalCancelText}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalWhatsappBtn} onPress={handleOpenWhatsApp}>
                    <Ionicons name="logo-whatsapp" size={16} color={Brand.text.inverse} />
                    <Text style={styles.modalWhatsappText}>{t.openWhatsApp}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Brand.background,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Brand.sectionBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: Brand.text.primary,
    letterSpacing: 0.2,
  },

  content: {
    flex: 1,
  },

  // Hero Banner
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    paddingBottom: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecorCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: -20,
    top: -30,
  },
  heroDecorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: 40,
    bottom: -20,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatusLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.text.inverse,
    marginBottom: 3,
  },
  heroStatusSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  heroEtaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  heroEtaLabel: {
    fontSize: 12,
    color: Brand.accentLight,
    fontWeight: '600',
  },
  heroEtaValue: {
    fontSize: 13,
    color: Brand.text.inverse,
    fontWeight: '700',
  },
  heroOrderNum: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Map
  mapCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.border,
    height: 260,
  },
  mapView: {
    flex: 1,
    height: 260,
    width: '100%',
  },
  mapOverlayPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  mapOverlayText: {
    fontSize: 12,
    color: Brand.text.secondary,
    fontWeight: '500',
  },
  refreshBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  deliveredMapState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  deliveredCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveredMapLabel: {
    fontSize: 14,
    color: Brand.text.secondary,
    fontWeight: '600',
  },
  noDriverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Brand.sectionBg,
  },
  noDriverIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.accentLight + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  noDriverTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  noDriverMessage: {
    fontSize: 13,
    color: Brand.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  noDriverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.primary + '12',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  noDriverInfoText: {
    fontSize: 12,
    color: Brand.primary,
    fontWeight: '500',
    flex: 1,
  },

  // Section cards
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Brand.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.text.primary,
    marginBottom: 16,
  },
  sectionTitleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Driver
  driverRow: {
    alignItems: 'center',
    gap: 0,
  },
  driverAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Brand.border,
  },
  driverAvatarImg: {
    width: '100%',
    height: '100%',
  },
  driverAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Brand.sectionBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.text.primary,
    marginBottom: 4,
  },
  ratingRow: {
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.text.primary,
  },
  vehicleDot: {
    fontSize: 13,
    color: Brand.text.muted,
  },
  vehicleText: {
    fontSize: 13,
    color: Brand.text.secondary,
  },
  driverActionBtns: {
    gap: 8,
  },
  driverActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  driverActionBtnPrimary: {
    backgroundColor: Brand.primary,
  },
  driverActionBtnSecondary: {
    backgroundColor: Brand.sectionBg,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  driverActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.text.inverse,
  },
  driverActionBtnTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.primary,
  },
  disabledBtn: { opacity: 0.4 },

  // Timeline
  timelineRow: {
    gap: 14,
    alignItems: 'flex-start',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.border,
  },
  timelineDotDone: {
    backgroundColor: Brand.primary,
  },
  timelineDotActive: {
    backgroundColor: Brand.primary,
  },
  timelineDotUpcoming: {
    backgroundColor: Brand.border,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.text.muted,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: Brand.border,
    marginVertical: 2,
  },
  timelineConnectorDone: {
    backgroundColor: Brand.primary,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.text.primary,
    marginBottom: 2,
  },
  timelineLabelMuted: {
    color: Brand.text.muted,
    fontWeight: '500',
  },
  timelineTime: {
    fontSize: 12,
    color: Brand.text.secondary,
  },

  // Address
  addressRow: {
    gap: 12,
    alignItems: 'flex-start',
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Brand.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addressStreet: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.text.primary,
    lineHeight: 20,
  },
  addressInstructions: {
    fontSize: 13,
    color: Brand.text.secondary,
    marginTop: 4,
  },

  // Order items
  orderItemRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
    marginBottom: 2,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.text.primary,
    marginBottom: 4,
    flex: 1,
    paddingRight: 8,
  },
  orderItemQty: {
    fontSize: 12,
    color: Brand.text.secondary,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
    minWidth: 70,
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Brand.border,
    marginVertical: 14,
  },
  summaryRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: Brand.text.secondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: Brand.text.primary,
    fontWeight: '600',
  },
  summaryTotalRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.text.primary,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.primary,
  },

  // Need Help card
  needHelpCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Brand.sectionBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    padding: 20,
  },
  needHelpLeft: {},
  needHelpTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.text.primary,
    marginBottom: 6,
  },
  needHelpSub: {
    fontSize: 13,
    color: Brand.text.secondary,
    lineHeight: 18,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Brand.background,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.primary,
    borderRadius: 16,
    paddingVertical: 15,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.text.inverse,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.sectionBg,
    borderRadius: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.primary,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Brand.sectionBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.text.primary,
  },
  emptyStateText: {
    fontSize: 14,
    color: Brand.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // WhatsApp Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Brand.card,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Brand.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: Brand.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.sectionBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  modalNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Brand.sectionBg,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.text.secondary,
  },
  modalWhatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#25D366',
  },
  modalWhatsappText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text.inverse,
  },

  // Map marker containers
  driverIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverIcon: {
    width: 75,
    height: 75,
    resizeMode: 'contain',
  },
  driverIconSvg: {},
  destinationIconContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  destinationIconSvg: {},
  destinationPinShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    opacity: 0.2,
    zIndex: 1,
  },
  destinationPinBody: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 2,
  },
  driverMarkerIcon: {
    width: 40,
    height: 40,
  },
  destinationClientImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  destinationPinPoint: {
    position: 'absolute',
    top: 38,
    left: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Brand.primary,
    zIndex: 1,
  },
});

const DestinationIcon = ({ clientImage }: { clientImage?: string | null }) => (
  <View style={styles.destinationIconContainer}>
    {clientImage ? (
      <>
        <View style={styles.destinationPinShadow} />
        <View style={styles.destinationPinBody}>
          <Image source={{ uri: clientImage }} style={styles.destinationClientImage} resizeMode="cover" />
        </View>
        <View style={styles.destinationPinPoint} />
      </>
    ) : (
      <Svg width={40} height={50} viewBox="0 0 24 30" style={styles.destinationIconSvg}>
        <Path d="M 12 28 C 8 28 2 22 2 16 C 2 10 6 4 12 4 C 18 4 22 10 22 16 C 22 22 16 28 12 28 Z" fill="#000000" opacity="0.2" transform="translate(1, 1)" />
        <Path d="M 12 27 C 8 27 2 21 2 15 C 2 9 6 3 12 3 C 18 3 22 9 22 15 C 22 21 16 27 12 27 Z" fill={Brand.primary} />
        <Circle cx="12" cy="15" r="6" fill="#FFFFFF" />
        <Circle cx="12" cy="15" r="4" fill={Brand.primary} />
      </Svg>
    )}
  </View>
);