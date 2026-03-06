import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import AddressPicker from './AddressPicker';
import {
  addItem,
  OrderItem,
  removeItem as removeItemFromOrder,
  toggleSpecialInstructions as toggleSpecialInstructionsAction,
  updateItemQuantity,
  updateSpecialInstructions as updateSpecialInstructionsAction,
} from './redux/slices/orderSlice';
import { RootState } from './redux/store';

type PaymentMethod = 'cash' | 'card';
type InCartProduct = {
  id: number;
  name: string;
  price: number;
  image: string;
  description?: string;
  restaurant?: string;
  discount_applied?: boolean;
  final_price?: number;
  has_offer?: boolean;
  offer_info?: {
    offer_id: number;
    offer_name: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    is_applied: boolean;
    can_use: boolean;
    reason: string | null;
  } | null;
  original_price?: number;
};

export default function CartScreen() {
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const cartItems = useSelector((state: RootState) => state.orders.items);
  const dispatch = useDispatch();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [client, setClient] = useState<any>(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [userLanguage, setUserLanguage] = useState<'english' | 'arabic' | 'french'>('english');
  
  const [inCartProducts, setInCartProducts] = useState<InCartProduct[]>([]);
  const [loadingInCartProducts, setLoadingInCartProducts] = useState(false);
  const [specialInstructionsMap, setSpecialInstructionsMap] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    fetchUserAddress();
    fetchUserLanguage();
    fetchInCartProducts();
  }, []);


  useEffect(() => {
    console.log('check cart items', cartItems)
  },[cartItems])
  const fetchUserLanguage = async () => {
    try {
      const language = await AsyncStorage.getItem('userLanguage');
      if (language === 'english' || language === 'arabic' || language === 'french') {
        setUserLanguage(language);
      }
    } catch (error) {
      console.error('Failed to fetch user language:', error);
    }
  };

  useEffect(() => {
    const initialInstructions: { [key: number]: string } = {};
    cartItems.forEach(item => {
      initialInstructions[item.id] = item.specialInstructions || '';
    });
    setSpecialInstructionsMap(initialInstructions);
  }, [cartItems]);

  // Recalculate delivery fee when client coordinates change
  useEffect(() => {
    if (client && client.id && client.lat && client.lon) {
      calculateDeliveryFeeEstimate();
    }
  }, [client?.id, client?.lat, client?.lon]);

  const fetchUserAddress = async () => {
    try {
      const clientData = await AsyncStorage.getItem('client');
      if (clientData) {
        const parsed = JSON.parse(clientData);
        setClient(parsed);
        if (parsed.adresses) {
          setUserAddress(parsed.adresses);
        }
        // Also set coordinates if available
        if (parsed.lat && parsed.lon) {
          setSelectedCoordinates({ latitude: parsed.lat, longitude: parsed.lon });
        }
      }
    } catch (error) {
      console.error('Failed to fetch user address:', error);
    }
  };

  const fetchInCartProducts = async () => {
    try {
      setLoadingInCartProducts(true);
      const response = await axios.get('https://haba-haba-api.ubua.cloud/api/auth/in-cart-products');
      
      if (response.data.success) {
        setInCartProducts(response.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching in-cart products:', error);
    } finally {
      setLoadingInCartProducts(false);
    }
  };

  const calculateDeliveryFeeEstimate = async () => {
    if (!client || !client.id) return;

    try {
      setCalculatingFee(true);
      const response = await axios.get('https://haba-haba-api.ubua.cloud/api/auth/estimate-delivery-fee', {
        params: { user_id: client.id },
      });

      if (response.data.success) {
        setDeliveryFee(response.data.delivery_fee);
      }
    } catch (error: any) {
      console.error('Error calculating delivery fee:', error);
      if (error.response?.status === 400) {
        Alert.alert(
          getTranslation('deliveryUnavailable'),
          error.response?.data?.message || getTranslation('deliveryNotAvailable')
        );
      }
    } finally {
      setCalculatingFee(false);
    }
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;

    try {
      const sub = cartItems.reduce((sum: number, item: OrderItem) => sum + item.price * item.quantity, 0);
      const response = await axios.post('https://haba-haba-api.ubua.cloud/api/auth/validate-promo-code', {
        code: promoCode.toUpperCase(),
        subtotal: sub,
      });

      if (response.data.success) {
        setAppliedPromo(promoCode.toUpperCase());
        setPromoDiscount(response.data.promoCode.discountAmount);
        setPromoDiscountType(response.data.promoCode.discountType);
        setPromoCode('');
        Toast.show({
          type: 'success',
          text1: getTranslation('promoApplied'),
          text2: response.data.promoCode.title,
          position: 'top',
        });
      } else {
        Alert.alert(
          getTranslation('invalidPromo'),
          response.data.message || getTranslation('promoInvalid')
        );
      }
    } catch (error: any) {
      console.error('Error validating promo code:', error);
      Alert.alert(
        getTranslation('error'),
        error.response?.data?.message || getTranslation('promoFailed')
      );
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoDiscountType(null);
  };

  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoDiscountType, setPromoDiscountType] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0.00);
  const [calculatingFee, setCalculatingFee] = useState(false);

  const isRTL = userLanguage === 'arabic';

  const getTranslation = (key: string): string => {
    const translations: Record<string, { english: string; arabic: string; french: string }> = {
      // Header
      myCart: {
        english: 'My Cart',
        arabic: 'عربة التسوق',
        french: 'Mon Panier'
      },
      yourCart: {
        english: 'Your Cart',
        arabic: 'عربة التسوق',
        french: 'Votre Panier'
      },
      items: {
        english: 'items',
        arabic: 'عناصر',
        french: 'articles'
      },
      
      // Address
      deliveryAddress: {
        english: 'Delivery Address',
        arabic: 'عنوان التوصيل',
        french: 'Adresse de livraison'
      },
      change: {
        english: 'Change',
        arabic: 'تغيير',
        french: 'Changer'
      },
      estimated: {
        english: 'Estimated: 35-45 min',
        arabic: 'مُقدَّر: 35-45 دقيقة',
        french: 'Estimé: 35-45 min'
      },
      noAddress: {
        english: 'No address selected',
        arabic: 'لم يتم تحديد عنوان',
        french: 'Aucune adresse sélectionnée'
      },
      addAddress: {
        english: 'Add Address',
        arabic: 'إضافة عنوان',
        french: 'Ajouter une adresse'
      },
      
      // Promo
      havePromo: {
        english: 'Have a promo code?',
        arabic: 'هل لديك كود ترويجي؟',
        french: 'Vous avez un code promo?'
      },
      apply: {
        english: 'Apply',
        arabic: 'تطبيق',
        french: 'Appliquer'
      },
      applied: {
        english: 'Applied',
        arabic: 'تم التطبيق',
        french: 'Appliqué'
      },
      promoApplied: {
        english: 'Promo code applied!',
        arabic: 'تم تطبيق الكود الترويجي!',
        french: 'Code promo appliqué!'
      },
      invalidPromo: {
        english: 'Invalid Promo Code',
        arabic: 'كود ترويجي غير صالح',
        french: 'Code promo invalide'
      },
      promoInvalid: {
        english: 'The promo code you entered is not valid.',
        arabic: 'الكود الترويجي الذي أدخلته غير صالح.',
        french: 'Le code promo que vous avez saisi n\'est pas valide.'
      },
      promoFailed: {
        english: 'Failed to validate promo code. Please try again.',
        arabic: 'فشل التحقق من الكود الترويجي. الرجاء المحاولة مرة أخرى.',
        french: 'Échec de la validation du code promo. Veuillez réessayer.'
      },
      
      // Items section
      itemsCount: {
        english: 'Items',
        arabic: 'العناصر',
        french: 'Articles'
      },
      
      // Special instructions
      addSpecial: {
        english: 'Add special instructions',
        arabic: 'إضافة تعليمات خاصة',
        french: 'Ajouter des instructions spéciales'
      },
      editSpecial: {
        english: 'Edit special instructions',
        arabic: 'تعديل التعليمات الخاصة',
        french: 'Modifier les instructions spéciales'
      },
      specialPlaceholder: {
        english: 'Any special requests? (e.g., no onions, extra sauce)',
        arabic: 'أي طلبات خاصة؟ (مثال: بدون بصل، صلصة إضافية)',
        french: 'Des demandes spéciales ? (ex. : pas d\'oignons, sauce supplémentaire)'
      },
      
      // Discount badge
      off: {
        english: 'OFF',
        arabic: 'خصم',
        french: 'RÉDUCTION'
      },
      
      // In-cart products
      frequentlyAdded: {
        english: 'Frequently Added Together',
        arabic: 'غالبًا ما يتم إضافتها معًا',
        french: 'Souvent ajoutés ensemble'
      },
      suggestions: {
        english: 'suggestions',
        arabic: 'اقتراحات',
        french: 'suggestions'
      },
      
      // Payment
      paymentMethod: {
        english: 'Payment Method',
        arabic: 'طريقة الدفع',
        french: 'Mode de paiement'
      },
      cash: {
        english: 'Cash',
        arabic: 'نقداً',
        french: 'Espèces'
      },
      card: {
        english: 'Card',
        arabic: 'بطاقة',
        french: 'Carte'
      },
      cardComingSoon: {
        english: 'Card payments coming soon',
        arabic: 'الدفع بالبطاقة قريباً',
        french: 'Paiement par carte bientôt disponible'
      },
      cardNotAvailable: {
        english: 'The card payment gateway will be available soon. Please use cash for now.',
        arabic: 'بوابة الدفع بالبطاقة ستتوفر قريباً. يرجى استخدام الدفع نقداً حالياً.',
        french: 'La passerelle de paiement par carte sera bientôt disponible. Veuillez utiliser les espèces pour le moment.'
      },
      
      // Summary
      subtotal: {
        english: 'Subtotal',
        arabic: 'المجموع الفرعي',
        french: 'Sous-total'
      },
      deliveryFee: {
        english: 'Delivery Fee',
        arabic: 'رسوم التوصيل',
        french: 'Frais de livraison'
      },
      discount: {
        english: 'Discount',
        arabic: 'خصم',
        french: 'Remise'
      },
      total: {
        english: 'Total',
        arabic: 'المجموع',
        french: 'Total'
      },
      
      // Buttons
      proceedToCheckout: {
        english: 'Proceed to Checkout',
        arabic: 'تابع إلى الدفع',
        french: 'Passer à la caisse'
      },
      placeOrder: {
        english: 'Place Order',
        arabic: 'تقديم الطلب',
        french: 'Passer la commande'
      },
      cardNotAvailableYet: {
        english: 'Card payment not available yet',
        arabic: 'الدفع بالبطاقة غير متاح حالياً',
        french: 'Paiement par carte pas encore disponible'
      },
      
      // Alerts
      addressRequired: {
        english: 'Address Required',
        arabic: 'العنوان مطلوب',
        french: 'Adresse requise'
      },
      selectAddress: {
        english: 'Please select a delivery address before proceeding.',
        arabic: 'الرجاء تحديد عنوان التوصيل قبل المتابعة.',
        french: 'Veuillez sélectionner une adresse de livraison avant de continuer.'
      },
      deliveryAddressRequired: {
        english: 'Delivery Address Required',
        arabic: 'عنوان التوصيل مطلوب',
        french: 'Adresse de livraison requise'
      },
      addAddressBeforeOrder: {
        english: 'Please add a delivery address before placing your order',
        arabic: 'الرجاء إضافة عنوان التوصيل قبل تقديم الطلب',
        french: 'Veuillez ajouter une adresse de livraison avant de passer votre commande'
      },
      phoneRequired: {
        english: 'Phone Number Required',
        arabic: 'رقم الهاتف مطلوب',
        french: 'Numéro de téléphone requis'
      },
      updatePhone: {
        english: 'Please update your phone number in your profile first',
        arabic: 'الرجاء تحديث رقم هاتفك في صفحة الملف الشخصي أولاً',
        french: 'Veuillez d\'abord mettre à jour votre numéro de téléphone dans votre profil'
      },
      updateNow: {
        english: 'Update Now',
        arabic: 'تحديث الآن',
        french: 'Mettre à jour maintenant'
      },
      ok: {
        english: 'OK',
        arabic: 'حسناً',
        french: 'OK'
      },
      error: {
        english: 'Error',
        arabic: 'خطأ',
        french: 'Erreur'
      },
      userNotFound: {
        english: 'User not found. Please log in again.',
        arabic: 'لم يتم العثور على المستخدم. الرجاء تسجيل الدخول مرة أخرى.',
        french: 'Utilisateur non trouvé. Veuillez vous reconnecter.'
      },
      
      // Empty cart
      cartEmpty: {
        english: 'Your cart is empty',
        arabic: 'عربة التسوق فارغة',
        french: 'Votre panier est vide'
      },
      addItems: {
        english: 'Add items to your cart and they\'ll appear here',
        arabic: 'أضف العناصر إلى عربة التسوق وستظهر هنا',
        french: 'Ajoutez des articles à votre panier et ils apparaîtront ici'
      },
      startShopping: {
        english: 'Start Shopping',
        arabic: 'ابدأ التسوق',
        french: 'Commencer vos achats'
      },
      
      // Toast messages
      removedFromCart: {
        english: 'Removed from cart',
        arabic: 'تمت الإزالة من السلة',
        french: 'Retiré du panier'
      },
      removed: {
        english: 'has been removed!',
        arabic: 'تمت إزالة',
        french: 'a été retiré!'
      },
      addedToCart: {
        english: 'Added to cart',
        arabic: 'تمت الإضافة للسلة',
        french: 'Ajouté au panier'
      },
      added: {
        english: 'has been added!',
        arabic: 'تمت إضافته!',
        french: 'a été ajouté!'
      },
      orderPlaced: {
        english: 'Order placed successfully!',
        arabic: 'تم تقديم الطلب بنجاح!',
        french: 'Commande passée avec succès!'
      },
      orderNumber: {
        english: 'Order number:',
        arabic: 'رقم الطلب:',
        french: 'Numéro de commande:'
      },
      
      // Delivery
      deliveryUnavailable: {
        english: 'Delivery Unavailable',
        arabic: 'التوصيل غير متوفر',
        french: 'Livraison indisponible'
      },
      deliveryNotAvailable: {
        english: 'Delivery is not available to this location',
        arabic: 'التوصيل غير متوفر إلى هذا الموقع',
        french: 'La livraison n\'est pas disponible à cet emplacement'
      },
      
      // Promo code errors
      promoAlreadyUsed: {
        english: 'You have already used this promo code',
        arabic: 'لقد استخدمت هذا الرمز الترويجي من قبل',
        french: 'Vous avez déjà utilisé ce code promo'
      },
      offerAlert: {
        english: 'Offer Alert',
        arabic: 'تنبيه العرض',
        french: 'Alerte offre'
      }
    };

    return translations[key]?.[userLanguage] || translations[key]?.english || key;
  };

  const { subtotal, discount, total } = useMemo(() => {
    const sub = cartItems.reduce((sum: number, item: OrderItem) => sum + item.price * item.quantity, 0);
    let discountAmount = promoDiscount;
    let finalDeliveryFee = deliveryFee;

    if (promoDiscountType === 'free_delivery') {
      finalDeliveryFee = deliveryFee;
      discountAmount = deliveryFee;
    }

    const totalAmount = Math.max(0, sub + finalDeliveryFee - discountAmount);

    return {
      subtotal: sub,
      deliveryFee: finalDeliveryFee,
      discount: discountAmount,
      total: totalAmount,
    };
  }, [cartItems, promoDiscount, promoDiscountType, deliveryFee]);

  const updateQuantity = (id: number, change: number) => {
    const item = cartItems.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.quantity + change);
    dispatch(updateItemQuantity({ id, quantity: newQty }));
  };

  const removeItem = (id: number, name: string) => {
    dispatch(removeItemFromOrder(id));
    Toast.show({
      type: 'info',
      text1: getTranslation('removedFromCart'),
      text2: userLanguage === 'arabic' 
        ? `${getTranslation('removed')} ${name}!` 
        : `${name} ${getTranslation('removed')}`,
      position: 'top',
      visibilityTime: 2000,
    });
  };

  const addInCartProduct = (product: InCartProduct) => {
    const priceToUse = product.has_offer 
      ? (product.final_price ?? product.price) 
      : product.price;

    const mappedOfferInfo = product.offer_info ? {
      offer_id: product.offer_info.offer_id,
      offer_name: product.offer_info.offer_name,
      discount_type: product.offer_info.discount_type,
      discount_value: product.offer_info.discount_value,
      original_price: product.price,
      can_use_offer: product.offer_info.can_use ?? true,
      times_used: 0, 
      max_uses: null,
      is_applied: product.offer_info.is_applied ?? true,
      reason: product.offer_info.reason ?? null,
    } : undefined;

    const orderItem: OrderItem = {
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      price: priceToUse,
      quantity: 1,
      image: product.image,
      restaurant: product.restaurant || '',
      specialInstructions: '',
      showSpecialInstructions: false,
      discount_applied: !!product.has_offer,
      original_price: product.price,
      offer_info: mappedOfferInfo as any, 
    };
    
    dispatch(addItem(orderItem));
    
    Toast.show({
      type: 'success',
      text1: getTranslation('addedToCart'),
      text2: userLanguage === 'arabic' 
        ? `${product.name} ${getTranslation('added')}` 
        : `${product.name} ${getTranslation('added')}`,
      position: 'top',
      visibilityTime: 1500,
    });
  };

  const handleAddressSelect = async (
    address: string,
    coordinates: { latitude: number; longitude: number }
  ) => {
    setUserAddress(address);
    setSelectedCoordinates(coordinates);

    try {
      if (client) {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert(
            getTranslation('error'),
            userLanguage === 'arabic' ? 'أنت غير مسجل الدخول.' : userLanguage === 'french' ? 'Vous n\'êtes pas connecté.' : 'You are not logged in.'
          );
          return;
        }

        const formData = new FormData();
        formData.append('adresses', address);
        formData.append('lat', coordinates.latitude.toString());
        formData.append('lon', coordinates.longitude.toString());

        const response = await fetch('https://haba-haba-api.ubua.cloud/api/auth/update-profile', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        const result = await response.json();
        if (response.ok) {
          await AsyncStorage.setItem('client', JSON.stringify(result.client));
          const updatedClient = {
            ...client,
            adresses: address,
            lat: result.client.lat || coordinates.latitude,
            lon: result.client.lon || coordinates.longitude
          };
          setClient(updatedClient);
          calculateDeliveryFeeEstimate();
        } else {
          console.error('Error updating address:', result.message);
          const updatedClient = {
            ...client,
            adresses: address,
            lat: coordinates.latitude,
            lon: coordinates.longitude
          };
          await AsyncStorage.setItem('client', JSON.stringify(updatedClient));
          setClient(updatedClient);
          calculateDeliveryFeeEstimate();
        }
      } else {
        const dummyClient = { adresses: address, lat: coordinates.latitude, lon: coordinates.longitude };
        setClient(dummyClient);
        calculateDeliveryFeeEstimate();
      }
    } catch (error) {
      console.error('Error saving address:', error);
      if (client) {
        const updatedClient = {
          ...client,
          adresses: address,
          lat: coordinates.latitude,
          lon: coordinates.longitude
        };
        await AsyncStorage.setItem('client', JSON.stringify(updatedClient));
        setClient(updatedClient);
        calculateDeliveryFeeEstimate();
      } else {
        setClient({ adresses: address, lat: coordinates.latitude, lon: coordinates.longitude });
        calculateDeliveryFeeEstimate();
      }
    }
  };

  const handleCardSelected = () => {
    setPaymentMethod('card');
    Alert.alert(
      getTranslation('cardComingSoon'),
      getTranslation('cardNotAvailable')
    );
  };

  const handleProceedToCheckout = () => {
    if (!userAddress) {
      Alert.alert(
        getTranslation('addressRequired'),
        getTranslation('selectAddress')
      );
      return;
    }

    const orderDetails = {
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      deliveryFee,
      discount,
      total,
      address: userAddress,
      promoCode: appliedPromo || undefined,
    };

    router.push({
      pathname: '/Checkout',
      params: {
        orderDetails: JSON.stringify(orderDetails),
      },
    });
  };

  const handlePlaceOrder = async () => {
    if (!client || !client.id) {
      Alert.alert(
        getTranslation('error'),
        getTranslation('userNotFound')
      );
      return;
    }

    const deliveryAddress = userAddress || client.adresses;
    if (!deliveryAddress || deliveryAddress.trim() === '') {
      Alert.alert(
        getTranslation('deliveryAddressRequired'),
        getTranslation('addAddressBeforeOrder')
      );
      return;
    }

    const clientData = await AsyncStorage.getItem('client');
    const currentClient = clientData ? JSON.parse(clientData) : client;

    if (!currentClient?.phone || currentClient.phone.trim() === '') {
      Alert.alert(
        getTranslation('phoneRequired'),
        getTranslation('updatePhone'),
        [
          {
            text: getTranslation('updateNow'),
            onPress: () => {
              router.push({
                pathname: '/editProfile',
                params: { userLanguage }
              });
            }
          }
        ]
      );
      return;
    }

    try {
      setLoading(true);

      const items = cartItems.map(item => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 1;

        return {
          product_id: item.id,
          price: price,
          quantity: quantity,
          special_instructions: item.specialInstructions || '',
          discount_applied: item.discount_applied || false,
          offer_info: item.offer_info || null,
          name: item.name,
          original_price: item.original_price || price,
          discount_type: item.offer_info?.discount_type || null,
          discount_value: item.offer_info?.discount_value || 0
        };
      });

      const payload = {
        user_id: client.id,
        items: items,
        delivery_address: userAddress || client.adresses || '',
        total_price: Number(subtotal) || 0,
        delivery_fee: Number(deliveryFee) || 0,
        discount: Number(discount) || 0,
        final_price: Number(total) || 0,
        paymentMethod: paymentMethod,
        promoCode: appliedPromo || undefined,
        restaurant: cartItems[0]?.restaurant || '',
      };

      const res = await axios.post('https://haba-haba-api.ubua.cloud/api/auth/place-order', payload);

      Toast.show({
        type: 'success',
        text1: getTranslation('orderPlaced'),
        text2: `${getTranslation('orderNumber')} ${res.data.order_number}`,
        position: 'top',
      });

      await AsyncStorage.setItem('newOrderId', JSON.stringify({
        orderId: res.data.order_id,
        orderNumber: res.data.order_number,
      }));

      cartItems.forEach((item: any) => dispatch(removeItemFromOrder(item.id)));
      setTimeout(() => router.push('/'), 500);

    } catch (err: any) {
      console.error('❌ Full Error Object:', err);

      const backendError = err.response?.data;
      const errorCode = backendError?.error_code;
      const errorMessage = backendError?.message || 
                           (userLanguage === 'arabic' ? 'فشل تقديم الطلب' : userLanguage === 'french' ? 'Échec de la commande' : 'Failed to place order');

      if (errorCode === 'PROMO_ALREADY_USED') {
        Alert.alert(
          getTranslation('invalidPromo'),
          userLanguage === 'arabic' ? 'لقد استخدمت هذا الرمز الترويجي من قبل' : userLanguage === 'french' ? 'Vous avez déjà utilisé ce code promo' : getTranslation('promoAlreadyUsed'),
          [{
              text: getTranslation('ok'),
              onPress: () => {
                setAppliedPromo('');
                setPromoDiscount(0);
                setPromoDiscountType(null);
              }
          }]
        );
      } else if (errorCode === 'OFFER_LIMIT_REACHED') {
        Alert.alert(
          getTranslation('offerAlert'),
          errorMessage
        );
      } else {
        Alert.alert(
          getTranslation('error'),
          errorMessage
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialInstructions = (itemId: number) => {
    dispatch(toggleSpecialInstructionsAction(itemId));
  };

  const updateSpecialInstructions = (itemId: number, instructions: string) => {
    setSpecialInstructionsMap(prev => ({
      ...prev,
      [itemId]: instructions
    }));
    dispatch(updateSpecialInstructionsAction({ id: itemId, instructions }));
  };

  if (cartItems.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, isRTL && cartItems.length !== 0 && styles.headerAr]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.title, isRTL && styles.titleAr]}>{getTranslation('myCart')}</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color={Colors.gray[400]} />
          <Text style={[styles.emptyStateText, isRTL && styles.emptyStateTextAr]}>
            {getTranslation('cartEmpty')}
          </Text>
          <Text style={[styles.emptyStateSubtext, isRTL && styles.emptyStateSubtextAr]}>
            {getTranslation('addItems')}
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.emptyStateButtonText}>
              {getTranslation('startShopping')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={{ zIndex: 100 }}><Toast /></View>
      <View style={[styles.header, isRTL && styles.headerAr]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.headerTitleAr]}>{getTranslation('yourCart')}</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Address Card with Change button */}
        <View style={styles.addressCard}>
          <View style={[styles.addressCardHeader, isRTL && styles.addressCardHeaderAr]}>
            <View style={styles.addressIconContainer}>
              <Ionicons name="location" size={18} color="#8B4B16" />
            </View>
            <Text style={[styles.addressCardTitle, isRTL && styles.textAr]}>
              {getTranslation('deliveryAddress')}
            </Text>
          </View>
          
          {userAddress ? (
            <>
              <View style={[styles.addressRow, isRTL && styles.addressRowAr]}>
                <Text style={[styles.addressCardText, isRTL && styles.textAr]} numberOfLines={1}>
                  {userAddress}
                </Text>
                <TouchableOpacity
                  style={styles.changeAddressButton}
                  onPress={() => setShowAddressPicker(true)}
                >
                  <Text style={styles.changeAddressText}>
                    {getTranslation('change')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.estimatedTimeRow, isRTL && styles.estimatedTimeRowAr]}>
                <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
                <Text style={styles.estimatedTimeText}>
                  {getTranslation('estimated')}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.noAddressText, isRTL && styles.textAr]}>
                {getTranslation('noAddress')}
              </Text>
              <TouchableOpacity
                style={[styles.addAddressButton, isRTL && styles.addAddressButtonAr]}
                onPress={() => setShowAddressPicker(true)}
              >
                <Text style={styles.addAddressButtonText}>
                  {getTranslation('addAddress')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.promoCard}>
          {appliedPromo ? (
            <View style={[styles.appliedPromoRow, isRTL && styles.appliedPromoRowAr]}>
              <View style={[styles.promoIconContainer, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark" size={18} color="#16A34A" />
              </View>
              <View style={styles.appliedPromoCenter}>
                <Text style={[styles.appliedPromoCode, isRTL && styles.textAr]}>{appliedPromo}</Text>
                <Text style={[styles.appliedPromoLabel, isRTL && styles.textAr]}>
                  {getTranslation('applied')}
                </Text>
              </View>
              <TouchableOpacity onPress={removePromoCode}>
                <Ionicons name="close-circle" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.promoInputRow, isRTL && styles.promoInputRowAr]}>
              <View style={styles.promoIconContainer}>
                <Ionicons name="pricetag" size={18} color="#8B4B16" />
              </View>
              <TextInput
                style={[styles.promoInput, isRTL && styles.textAr]}
                placeholder={getTranslation('havePromo')}
                placeholderTextColor={Colors.text.secondary}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity onPress={applyPromoCode} disabled={!promoCode.trim()}>
                <Text style={[styles.applyText, !promoCode.trim() && styles.applyTextDisabled]}>
                  {getTranslation('apply')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleAr]}>
          {isRTL ? `العناصر (${cartItems.length})` : `${getTranslation('itemsCount')} (${cartItems.length})`}
        </Text>
        
        {cartItems.map((item) => (
          <View key={item.id} style={[styles.cartItem, isRTL && styles.cartItemAr]}>
            {item.image && (
              <Image 
                source={{ uri: item.image.startsWith('http') ? item.image : `https://haba-haba-api.ubua.cloud/${item.image?.replace(/\\/g, '/')}` }} 
                style={[styles.itemImage, isRTL && styles.itemImageAr]} 
              />
            )}
            <View style={[styles.itemDetails, isRTL && styles.itemDetailsAr]}>
              <View style={[styles.itemHeader, isRTL && styles.itemHeaderAr]}>
                <View style={[styles.itemInfo, isRTL && styles.itemInfoAr]}>
                  <Text style={[styles.itemName, isRTL && styles.itemNameAr]}>{item.name}</Text>
                  {item.description && (
                    <Text style={[styles.itemDescription, isRTL && styles.itemDescriptionAr]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={[styles.itemRestaurant, isRTL && styles.itemRestaurantAr]}>{item.restaurant}</Text>

                  {item.discount_applied && item.offer_info && (
                    <View style={[styles.discountBadge, isRTL && styles.discountBadgeAr]}>
                      <Ionicons name="flash" size={12} color="#FFFFFF" />
                      <Text style={styles.discountBadgeText}>
                        -{item.offer_info.discount_value}
                        {item.offer_info.discount_type === 'percentage' ? '%' : 'MAD'} {getTranslation('off')}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeItem(item.id, item.name)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EA580C" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.specialInstructionsToggle, isRTL && styles.specialInstructionsToggleAr]}
                onPress={() => toggleSpecialInstructions(item.id)}
              >
                <Text style={[styles.specialInstructionsToggleText, isRTL && styles.specialInstructionsToggleTextAr]}>
                  {item.specialInstructions ? getTranslation('editSpecial') : getTranslation('addSpecial')}
                </Text>
                <Ionicons
                  name={item.showSpecialInstructions ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.text.primary}
                />
              </TouchableOpacity>

              {item.showSpecialInstructions && (
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={[styles.textInput, isRTL && styles.textInputAr]}
                    placeholder={getTranslation('specialPlaceholder')}
                    placeholderTextColor={Colors.text.secondary}
                    multiline
                    maxLength={200}
                    value={specialInstructionsMap[item.id] || ""}
                    onChangeText={(text) => updateSpecialInstructions(item.id, text)}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                  <Text style={[styles.charCount, isRTL && styles.charCountAr]}>
                    {(specialInstructionsMap[item.id] || "").length}/200
                  </Text>
                </View>
              )}

              <View style={[styles.itemFooter, isRTL && styles.itemFooterAr]}>
                {item.original_price ? (
                  <View style={[styles.priceContainer, isRTL && styles.priceContainerAr]}>
                    {item.original_price !== item.price && (
                      <Text style={[styles.originalPrice, isRTL && styles.originalPriceAr]}>
                        {(Number(item.original_price) * Number(item.quantity)).toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
                      </Text>
                    )}
                    <Text style={[styles.itemPrice, isRTL && styles.itemPriceAr]}>
                      {(Number(item.price) * Number(item.quantity)).toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.itemPrice, isRTL && styles.itemPriceAr]}>
                    {(Number(item.price) * Number(item.quantity)).toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
                  </Text>
                )}

                <View style={[styles.quantityPill, isRTL && styles.quantityPillAr]}>
                  <TouchableOpacity
                    style={styles.quantityPillBtn}
                    onPress={() => updateQuantity(item.id, -1)}
                  >
                    <Ionicons name="remove" size={16} color="#8B4B16" />
                  </TouchableOpacity>
                  <Text style={styles.quantityPillValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityPillBtn}
                    onPress={() => updateQuantity(item.id, 1)}
                  >
                    <Ionicons name="add" size={16} color="#8B4B16" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}
        
        {inCartProducts.length > 0 && (
          <View style={styles.inCartProductsSection}>
            <View style={[styles.inCartProductsHeader, isRTL && styles.inCartProductsHeaderAr]}>
              <View style={[styles.inCartProductsTitleContainer, isRTL && styles.inCartProductsTitleContainerAr]}>
                <Ionicons name="sparkles" size={20} color={Colors.warning} />
                <Text style={[styles.inCartProductsTitle, isRTL && styles.inCartProductsTitleAr]}>
                  {getTranslation('frequentlyAdded')}
                </Text>
              </View>
              <View style={[styles.inCartProductsBadge, isRTL && styles.inCartProductsBadgeAr]}>
                <Text style={styles.inCartProductsBadgeText}>
                  {inCartProducts.length} {getTranslation('suggestions')}
                </Text>
              </View>
            </View>

            {loadingInCartProducts ? (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.inCartProductsLoading} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.inCartProductsScroll}
                contentContainerStyle={styles.inCartProductsScrollContent}
              >
                {inCartProducts.map((product) => {
                  const hasOffer = product.has_offer && product.offer_info;
                  const discountVal = hasOffer && product.offer_info ? Number(product.offer_info.discount_value) : 0;
                  const isPercentage = hasOffer && product.offer_info && product.offer_info.discount_type === 'percentage';
                  
                  const displayFinalPrice = hasOffer && product.offer_info
                    ? (isPercentage ? product.price * (1 - discountVal / 100) : product.price - discountVal)
                    : product.price;

                  return (
                    <View key={product.id} style={[styles.inCartProductCard, isRTL && styles.inCartProductCardAr]}>
                      <View style={styles.inCartProductImageContainer}>
                        {product.image ? (
                          <Image
                            source={{ uri: product.image.startsWith('http') ? product.image : `https://haba-haba-api.ubua.cloud/${product.image?.replace(/\\/g, '/')}` }}
                            style={styles.inCartProductImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.inCartProductImagePlaceholder}>
                            <Ionicons name="fast-food" size={24} color={Colors.gray[400]} />
                          </View>
                        )}

                        {hasOffer && (
                          <View style={[
                            styles.discountBadge, 
                            { position: 'absolute', top: 5, left: isRTL ? undefined : 5, right: isRTL ? 5 : undefined, height: 18, paddingHorizontal: 5, zIndex: 10 }
                          ]}>
                            <Ionicons name="flash" size={10} color="#FFFFFF" />
                            <Text style={[styles.discountBadgeText, { fontSize: 9 }]}>
                              -{product.offer_info?.discount_value}{isPercentage ? '%' : 'MAD'}
                            </Text>
                          </View>
                        )}

                        <View style={styles.inCartProductOverlay}>
                          <TouchableOpacity
                            style={styles.inCartProductAddButton}
                            onPress={() => addInCartProduct({ ...product, price: displayFinalPrice, original_price: product.price })}
                          >
                            <Ionicons name="add" size={20} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.inCartProductInfo}>
                        <Text style={[styles.inCartProductName, isRTL && styles.inCartProductNameAr]} numberOfLines={1}>
                          {product.name}
                        </Text>
                        
                        <View style={[styles.inCartProductPriceRow, isRTL && styles.inCartProductPriceRowAr]}>
                          {hasOffer ? (
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                              <Text style={[styles.inCartProductPrice, isRTL && styles.inCartProductPriceAr, { color: Colors.primary }]}>
                                {Number(displayFinalPrice).toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
                              </Text>
                              <Text style={[
                                styles.originalPrice, 
                                isRTL && styles.originalPriceAr, 
                                { fontSize: 10, marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }
                              ]}>
                                {Number(product.price).toFixed(2)}
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.inCartProductPrice, isRTL && styles.inCartProductPriceAr]}>
                              {Number(product.price).toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.footerContainer}>
          <View style={styles.paymentSection}>
            <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleAr]}>
              {getTranslation('paymentMethod')}
            </Text>

            <View style={styles.paymentWarning}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={Colors.warning}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.paymentWarningText, isRTL && styles.paymentWarningTextAr]}>
                {userLanguage === 'arabic'
                  ? 'يرجى التأكد من رقم هاتفك قبل الضغط على "إتمام الطلب"، فهذا مهم لتمكن المطعم من التعامل مع طلبك بشكل صحيح.'
                  : userLanguage === 'french'
                  ? 'Veuillez vérifier votre numéro de téléphone avant de passer la commande, car il est important pour que le restaurant puisse traiter correctement votre commande.'
                  : 'Please check your phone number before placing the order, as it is important for the restaurant to handle your order correctly.'}
              </Text>
            </View>

            <View style={[styles.paymentMethods, isRTL && styles.paymentMethodsAr]}> { /*zap */ }
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'cash' && styles.paymentMethodActive,
                  isRTL && styles.paymentMethodAr,
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <View style={styles.paymentMethodContent}>
                  <View style={styles.viewIconText}>
                  <Ionicons
                  name="cash-outline"
                  size={20}
                  color={paymentMethod === 'cash' ? Colors.primary : Colors.text.secondary}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'cash' && styles.paymentMethodTextActive,
                    isRTL && styles.paymentMethodTextAr,
                  ]}
                >
                  {getTranslation('cash')}
                </Text>
                </View>
                {paymentMethod === 'cash' && (
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 20,
                  backgroundColor: '#f0f0f0', // or any color you want
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons name="ellipse" size={15} color={Colors.primary} />
                </View>
              )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'card' && styles.paymentMethodActive,
                  isRTL && styles.paymentMethodAr,
                ]}
                onPress={handleCardSelected}
              >
                <View style={styles.paymentMethodContent}>
                  <View style={styles.viewIconText}>
                  <Ionicons
                  name="card-outline"
                  size={20}
                  color={paymentMethod === 'card' ? Colors.primary : Colors.text.secondary}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'card' && styles.paymentMethodTextActive,
                    isRTL && styles.paymentMethodTextAr,
                  ]}
                >
                  {getTranslation('card')}
                </Text>
                </View>
                {paymentMethod === 'card' && (
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 20,
                  backgroundColor: '#f0f0f0', // or any color you want
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons name="ellipse" size={15} color={Colors.primary} />
                </View>
                )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.summary}>
            <View style={[styles.summaryRow, isRTL && styles.summaryRowAr]}>
              <Text style={[styles.summaryLabel, isRTL && styles.summaryLabelAr]}>
                {getTranslation('subtotal')}
              </Text>
              <Text style={[styles.summaryValue, isRTL && styles.summaryValueAr]}>
                {Number(subtotal).toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
              </Text>
            </View>
            <View style={[styles.summaryRow, isRTL && styles.summaryRowAr]}>
              <View style={[isRTL ? styles.summaryLabelContainerAr : styles.summaryLabelContainer]}>
                <Text style={[styles.summaryLabel, isRTL && styles.summaryLabelAr]}>
                  {getTranslation('deliveryFee')}
                </Text>
                {calculatingFee && (
                  <ActivityIndicator size="small" color={Colors.primary} />
                )}
              </View>
              <Text style={[styles.summaryValue, isRTL && styles.summaryValueAr]}>
                {Number(deliveryFee).toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
              </Text>
            </View>
            {discount > 0 && (
              <View style={[styles.summaryRow, isRTL && styles.summaryRowAr]}>
                <Text style={[styles.summaryLabel, { color: Colors.success }, isRTL && styles.summaryLabelAr]}>
                  {isRTL ? `خصم (${appliedPromo})` : `${getTranslation('discount')} (${appliedPromo})`}
                </Text>
                <Text style={[styles.summaryValue, { color: Colors.success }, isRTL && styles.summaryValueAr]}>
                  -{Number(discount).toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow, isRTL && styles.summaryRowAr]}>
              <Text style={[styles.totalLabel, isRTL && styles.totalLabelAr]}>
                {getTranslation('total')}
              </Text>
              <Text style={[styles.totalValue, isRTL && styles.totalValueAr]}>
                {Number(total).toFixed(2)} {isRTL ? 'درهم' : 'MAD'}
              </Text>
            </View>
          </View>

          {paymentMethod === 'cash' ? (
            <TouchableOpacity
              style={styles.checkoutButton}
              disabled={loading}
              onPress={handlePlaceOrder}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkoutButtonText}>
                  {getTranslation('proceedToCheckout')}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.checkoutButton, styles.checkoutButtonDisabled]}
              disabled
            >
              <Text style={styles.checkoutButtonText}>
                {getTranslation('cardNotAvailableYet')}
              </Text>
              <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <AddressPicker
        visible={showAddressPicker}
        currentAddress={userAddress}
        onClose={() => setShowAddressPicker(false)}
        onSelectAddress={handleAddressSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFBF7',
  },
  headerAr: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  headerTitleAr: {
    textAlign: 'right',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  textAr: {
    textAlign: 'right',
  },
  sectionTitle: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
    marginTop: 16,
  },
  sectionTitleAr: {
    textAlign: 'right',
  },
  
  // Address Card
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  addressCardHeaderAr: {
    flexDirection: 'row-reverse',
  },
  addressIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  addressCardText: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 42,
    marginBottom: 8,
  },
  addressRowAr: {
    marginLeft: 0,
    marginRight: 42,
    flexDirection: 'row-reverse',
  },
  changeAddressButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFEDD5',
    borderRadius: 8,
  },
  changeAddressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B4B16',
  },
  estimatedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 42,
    gap: 6,
  },
  estimatedTimeRowAr: {
    flexDirection: 'row-reverse',
    marginLeft: 0,
    marginRight: 42,
  },
  estimatedTimeText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  noAddressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginLeft: 42,
    marginBottom: 12,
  },
  addAddressButton: {
    alignSelf: 'flex-start',
    marginLeft: 42,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#8B4B16',
    borderRadius: 8,
  },
  addAddressButtonAr: {
    alignSelf: 'flex-end',
    marginLeft: 0,
    marginRight: 42,
  },
  addAddressButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Promo Card
  promoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promoInputRowAr: {
    flexDirection: 'row-reverse',
  },
  promoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    paddingVertical: 4,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4B16',
  },
  applyTextDisabled: {
    color: Colors.text.secondary,
  },
  appliedPromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appliedPromoRowAr: {
    flexDirection: 'row-reverse',
  },
  appliedPromoCenter: {
    flex: 1,
  },
  appliedPromoCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  appliedPromoLabel: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 2,
  },

  // Cart Item
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cartItemAr: {
    flexDirection: 'row-reverse',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.gray[100],
  },
  itemImageAr: {
    marginRight: 0,
    marginLeft: 12,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemDetailsAr: {
    marginLeft: 0,
    marginRight: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemHeaderAr: {
    flexDirection: 'row-reverse',
  },
  itemInfo: {
    flex: 1,
  },
  itemInfoAr: {
    alignItems: 'flex-end',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  itemNameAr: {
    textAlign: 'right',
  },
  itemDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  itemDescriptionAr: {
    textAlign: 'right',
  },
  itemRestaurant: {
    fontSize: 12,
    color: Colors.text.light,
  },
  itemRestaurantAr: {
    textAlign: 'right',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  discountBadgeAr: {
    flexDirection: 'row-reverse',
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  itemFooterAr: {
    flexDirection: 'row-reverse',
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  priceContainerAr: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 13,
    color: Colors.text.secondary,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  originalPriceAr: {
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B4B16',
  },
  itemPriceAr: {
    textAlign: 'right',
  },
  
  // Quantity Pill
  quantityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 4,
    gap: 8,
  },
  quantityPillAr: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-start',
  },
  quantityPillBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  quantityPillValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    minWidth: 24,
    textAlign: 'center',
  },

  // Special Instructions
  specialInstructionsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginVertical: 8,
  },
  specialInstructionsToggleAr: {
    flexDirection: 'row-reverse',
  },
  specialInstructionsToggleText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  specialInstructionsToggleTextAr: {
    textAlign: 'right',
  },
  textInputContainer: {
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: Colors.text.primary,
  },
  textInputAr: {
    textAlign: 'right',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  charCountAr: {
    textAlign: 'left',
  },

  // In-Cart Products
  inCartProductsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  inCartProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inCartProductsHeaderAr: {
    flexDirection: 'row-reverse',
  },
  inCartProductsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inCartProductsTitleContainerAr: {
    flexDirection: 'row-reverse',
  },
  inCartProductsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  inCartProductsTitleAr: {
    textAlign: 'right',
  },
  inCartProductsBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inCartProductsBadgeAr: {
    marginLeft: 0,
    marginRight: 'auto',
  },
  inCartProductsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B4B16',
  },
  inCartProductsLoading: {
    height: 100,
  },
  inCartProductsScroll: {
    flexGrow: 0,
  },
  inCartProductsScrollContent: {
    paddingRight: 0,
  },
  inCartProductCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inCartProductCardAr: {
    marginRight: 0,
    marginLeft: 12,
  },
  inCartProductImageContainer: {
    position: 'relative',
    height: 100,
    width: '100%',
  },
  inCartProductImage: {
    width: '100%',
    height: '100%',
  },
  inCartProductImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  inCartProductOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 8,
  },
  inCartProductAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B4B16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inCartProductInfo: {
    padding: 10,
  },
  inCartProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  inCartProductNameAr: {
    textAlign: 'right',
  },
  inCartProductPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inCartProductPriceRowAr: {
    flexDirection: 'row-reverse',
  },
  inCartProductPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B4B16',
  },
  inCartProductPriceAr: {
    textAlign: 'right',
  },

  // Footer & Summary
  footerContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    marginTop: 10,
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  paymentWarningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.warning,
  },
  paymentWarningTextAr: {
    textAlign: 'right',
  },
  paymentMethods: {
    flexDirection: 'column',
    gap: 12,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  viewIconText: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  paymentMethodsAr: {
    flexDirection: 'row-reverse',
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  paymentMethodAr: {
    flexDirection: 'row-reverse',
  },
  paymentMethodActive: {
    borderColor: '#8B4B16',
    backgroundColor: '#FFFBF7',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  paymentMethodTextAr: {
    textAlign: 'right',
  },
  paymentMethodTextActive: {
    color: '#8B4B16',
  },
  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryLabelContainerAr: {
    flexDirection: 'row-reverse',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryRowAr: {
    flexDirection: 'row-reverse',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  summaryLabelAr: {
    textAlign: 'right',
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  summaryValueAr: {
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  totalLabelAr: {
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B4B16',
  },
  totalValueAr: {
    textAlign: 'right',
  },
  checkoutButton: {
    backgroundColor: '#8B4B16',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkoutButtonDisabled: {
    backgroundColor: Colors.text.secondary,
    opacity: 0.7,
  },
  
  // Empty State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateTextAr: {
    textAlign: 'right',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyStateSubtextAr: {
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#8B4B16',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Legacy styles (kept for compatibility with other screens)
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  titleAr: {
    textAlign: 'right',
  },
  itemCount: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  itemCountAr: {
    textAlign: 'right',
  },
  addressSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  addressHeaderAr: {
    flexDirection: 'row-reverse',
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  addressTitleAr: {
    textAlign: 'right',
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  addressTextAr: {
    textAlign: 'right',
  },
  changeAddressButtonLegacy: {
    alignSelf: 'flex-start',
  },
  changeAddressButtonArLegacy: {
    alignSelf: 'flex-end',
  },
  changeAddressTextLegacy: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  promoSection: {
    marginHorizontal: 10,
    marginBottom: 20,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  promoInputContainerAr: {
    flexDirection: 'row-reverse',
  },
  applyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  appliedPromoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.success + '20',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  appliedPromoContainerAr: {
    flexDirection: 'row-reverse',
  },
  appliedPromoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedPromoInfoAr: {
    flexDirection: 'row-reverse',
  },
  appliedPromoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  appliedPromoTextAr: {
    textAlign: 'right',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityControlsAr: {
    flexDirection: 'row-reverse',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    minWidth: 24,
    textAlign: 'center',
  },
  quantityTextAr: {
    textAlign: 'center',
  },
  removeButton: {
    padding: 4,
  },
  backArrow: { fontSize: 24, color: '#000' },
});