import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { fetchHomePageData } from './redux/slices/homeSlice';
import { addItem } from './redux/slices/orderSlice';
import { AppDispatch } from './redux/store';

interface Product {
  product_id: number;
  product_name: string;
  product_description: string;
  product_price: number;
  product_category: string;
  product_image: string;
  is_available: boolean;
  limited_use: number;
  times_used: number;
  remaining_uses: number;
  has_applied_offer?: boolean;
}

interface Offer {
  id: number;
  name: string;
  description: string;
  discount: number;
  discount_type: 'percentage' | 'fixed' | 'free_delivery';
  end_at: string;
  start_at: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  image: string;
  products: Product[];
  is_applied_by_user?: boolean;
}

export default function OfferDetailScreen() {
  const router = useRouter();
  const { offerId } = useLocalSearchParams();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingOffer, setApplyingOffer] = useState(false);
  const [userLanguage, setUserLanguage] = useState<'english' | 'arabic' | 'french'>('english');
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    formatted: '',
    isExpired: false,
  });

  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();

  // Load language from AsyncStorage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const lang = await AsyncStorage.getItem('userLanguage');
        if (lang === 'arabic' || lang === 'french') {
          setUserLanguage(lang);
        }
      } catch (error) {
        console.error('Failed to load language:', error);
      }
    };
    loadLanguage();
  }, []);

  // Translation helper
  const t = (en: string, ar: string, fr: string) => {
    if (userLanguage === 'arabic') return ar;
    if (userLanguage === 'french') return fr;
    return en;
  };

  const isRTL = userLanguage === 'arabic';

  useEffect(() => {
    fetchOfferDetails();
  }, [offerId]);

  useEffect(() => {
    if (offer) {
      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [offer]);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      const clientData = await AsyncStorage.getItem('client');
      const token = await AsyncStorage.getItem('token');
      const config: any = {};

      if (clientData && token) {
        const client = JSON.parse(clientData);
        config.params = { userId: client.id };
        config.headers = { Authorization: `Bearer ${token}` };
      }

      const response = await axios.get(
        `https://haba-haba-api.ubua.cloud/api/auth/offers`,
        config
      );

      const targetOfferId = parseInt(offerId as string);
      const foundOffer = response.data.offers.find((o: Offer) => o.id === targetOfferId);
      setOffer(foundOffer || null);
    } catch (error) {
      console.error('Failed to fetch offer details:', error);
      Alert.alert(t('Error', 'خطأ', 'Erreur'), t('Failed to load offer details', 'فشل تحميل تفاصيل العرض', 'Échec du chargement des détails de l\'offre'));
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeLeft = () => {
    if (!offer) return;
    const endDate = new Date(offer.end_at).getTime();
    const now = new Date().getTime();
    const diff = endDate - now;

    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let formatted = '';
      if (userLanguage === 'arabic') {
        if (days > 0) {
          formatted = `${days} ${days === 2 ? 'يومان' : days > 2 ? 'أيام' : 'يوم'} متبقي`;
        } else {
          formatted = `${hours} س ${minutes} د ${seconds} ث متبقي`;
        }
      } else if (userLanguage === 'french') {
        if (days > 0) {
          formatted = `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`;
        } else {
          formatted = `${hours}h ${minutes}m ${seconds}s restantes`;
        }
      } else {
        formatted = days > 0
          ? `${days} day${days !== 1 ? 's' : ''} left`
          : `${hours}h ${minutes}m ${seconds}s left`;
      }

      setTimeLeft({ days, hours, minutes, seconds, formatted, isExpired: false });
    } else {
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formatted: t('Expired', 'انتهى', 'Expiré'),
        isExpired: true,
      });
    }
  };

  const getProgressPercentage = (): number => {
    if (!offer?.products || offer.products.length === 0) return 0;
    const totalUsed = offer.products.reduce((sum, p) => sum + (p.times_used || 0), 0);
    const totalLimit = offer.products.reduce((sum, p) => sum + (p.limited_use || 0), 0);
    if (totalLimit === 0) return 0;
    return Math.min(100, Math.max(0, (totalUsed / totalLimit) * 100));
  };

  const getDiscountText = (): string => {
    if (!offer) return '';
    if (offer.discount_type === 'percentage') {
      return t(`${offer.discount}% OFF`, `خصم %${offer.discount}`, `${offer.discount}% de réduction`);
    } else if (offer.discount_type === 'fixed') {
      return t(`${offer.discount} MAD OFF`, `خصم ${offer.discount} درهم`, `${offer.discount} MAD de réduction`);
    } else if (offer.discount_type === 'free_delivery') {
      return t('FREE DELIVERY', 'توصيل مجاني', 'LIVRAISON GRATUITE');
    }
    return t('SPECIAL OFFER', 'عرض خاص', 'OFFRE SPÉCIALE');
  };

  const getDiscountedPrice = (product: Product): number => {
    if (!offer) return product.product_price;
    if (offer.discount_type === 'percentage') {
      return product.product_price - (product.product_price * offer.discount) / 100;
    } else if (offer.discount_type === 'fixed') {
      return Math.max(0, product.product_price - offer.discount);
    }
    return product.product_price;
  };

  const handleApplyOffer = async () => {
    try {
      const userData = await AsyncStorage.getItem('client');
      if (!userData) {
        Alert.alert(
          t('Login Required', 'تسجيل الدخول مطلوب', 'Connexion requise'),
          t('Please login to apply offers', 'الرجاء تسجيل الدخول لتطبيق العروض', 'Veuillez vous connecter pour appliquer les offres')
        );
        router.push('/login');
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert(
          t('Session Expired', 'انتهت الجلسة', 'Session expirée'),
          t('Please login again', 'الرجاء تسجيل الدخول مرة أخرى', 'Veuillez vous reconnecter')
        );
        router.push('/login');
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (timeLeft.isExpired) {
        Alert.alert(
          t('Offer Expired', 'انتهى العرض', 'Offre expirée'),
          t('This offer is no longer available.', 'هذا العرض غير متاح بعد الآن.', 'Cette offre n\'est plus disponible.')
        );
        return;
      }

      setApplyingOffer(true);
      const user = JSON.parse(userData);

      const response = await axios.post(
        'https://haba-haba-api.ubua.cloud/api/auth/offers/apply-offer',
        { offerId: offer?.id, userId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setOffer(prev => prev ? { ...prev, is_applied_by_user: true, products: prev.products.map(p => ({ ...p, has_applied_offer: true })) } : prev);
        await dispatch(fetchHomePageData());

        Alert.alert(
          t('Success!', 'تم بنجاح!', 'Succès !'),
          response.data.message,
          [
            {
              text: t('View Products', 'عرض المنتجات', 'Voir les produits'),
              onPress: () => router.push('/allProducts'),
            },
            { text: t('Continue Browsing', 'متابعة التسوق', 'Continuer'), style: 'cancel' },
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to apply offer:', error);
      Alert.alert(
        t('Error', 'خطأ', 'Erreur'),
        error.response?.data?.message || t('Failed to apply offer. Please try again.', 'فشل تطبيق العرض. حاول مرة أخرى.', 'Échec de l\'application de l\'offre. Veuillez réessayer.')
      );
    } finally {
      setApplyingOffer(false);
    }
  };

  const handleAddProduct = async (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!product.is_available) {
      Alert.alert(
        t('Unavailable', 'غير متوفر', 'Indisponible'),
        t('This product is currently unavailable.', 'هذا المنتج غير متوفر حالياً.', 'Ce produit est actuellement indisponible.')
      );
      return;
    }

    if ((product.times_used || 0) >= (product.limited_use || 0)) {
      Alert.alert(
        t('Limit Reached', 'تم الوصول للحد الأقصى', 'Limite atteinte'),
        t(
          `This product has reached its maximum usage limit of ${product.limited_use} times.`,
          `وصل هذا المنتج إلى الحد الأقصى للاستخدام (${product.limited_use} مرات).`,
          `Ce produit a atteint sa limite d'utilisation maximale de ${product.limited_use} fois.`
        )
      );
      return;
    }

    const isOfferApplied = offer?.is_applied_by_user || offer?.products.every(p => p.has_applied_offer);

    if (!isOfferApplied) {
      Alert.alert(
        t('Apply Offer First', 'تطبيق العرض أولاً', 'Appliquez l\'offre d\'abord'),
        t(
          'You need to apply the offer to get discounted prices on all products.',
          'تحتاج إلى تطبيق العرض للحصول على الأسعار المخفضة لجميع المنتجات.',
          'Vous devez appliquer l\'offre pour obtenir des prix réduits sur tous les produits.'
        ),
        [
          { text: t('Apply Offer', 'تطبيق العرض', 'Appliquer l\'offre'), onPress: handleApplyOffer },
          { text: t('Cancel', 'إلغاء', 'Annuler'), style: 'cancel' },
        ]
      );
      return;
    }

    try {
      const userData = await AsyncStorage.getItem('client');
      const token = await AsyncStorage.getItem('token');
      if (!userData || !token) {
        Alert.alert(
          t('Login Required', 'تسجيل الدخول مطلوب', 'Connexion requise'),
          t('Please login to add products to cart.', 'يجب تسجيل الدخول لإضافة المنتجات للسلة.', 'Veuillez vous connecter pour ajouter des produits au panier.')
        );
        return;
      }

      const discountedPrice = getDiscountedPrice(product);
      const imageUrl = product.product_image
        ? `https://haba-haba-api.ubua.cloud/${product.product_image.replace(/\\/g, '/')}`
        : '';

      const orderItem = {
        id: product.product_id,
        name: product.product_name,
        description: product.product_description,
        price: discountedPrice,
        quantity: 1,
        image: imageUrl,
        restaurant: '',
        specialInstructions: '',
        showSpecialInstructions: false,
        discount_applied: true,
        original_price: product.product_price,
        offer_info: offer ? {
          offer_id: offer.id,
          offer_name: offer.name,
          discount_type: offer.discount_type === 'percentage' || offer.discount_type === 'fixed' ? offer.discount_type : 'percentage',
          discount_value: offer.discount,
          original_price: product.product_price,
          can_use_offer: true,
          times_used: 0,
          max_uses: product.remaining_uses ?? null,
          is_applied: true,
          reason: null,
          remaining_uses: product.remaining_uses ?? 0,
          valid_until: offer.end_at,
          description: offer.description,
        } : null,
      };

      dispatch(addItem(orderItem));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('Added', 'تمت الإضافة', 'Ajouté'),
        t(
          `${product.product_name} has been added to cart!`,
          `تمت إضافة ${product.product_name} إلى السلة!`,
          `${product.product_name} a été ajouté au panier !`
        )
      );
    } catch (error) {
      console.error('Failed to add product to cart:', error);
      Alert.alert(
        t('Error', 'خطأ', 'Erreur'),
        t('Failed to add product to cart. Please try again.', 'فشل إضافة المنتج إلى السلة. حاول مرة أخرى.', 'Échec de l\'ajout du produit au panier. Veuillez réessayer.')
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('Loading...', 'جاري التحميل...', 'Chargement...')}</Text>
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="sad-outline" size={64} color={Colors.text.secondary} />
        <Text style={styles.errorTitle}>{t('Offer Not Found', 'العرض غير موجود', 'Offre introuvable')}</Text>
        <Text style={styles.errorSubtitle}>
          {t('The offer you\'re looking for doesn\'t exist.', 'العرض الذي تبحث عنه غير موجود.', 'L\'offre que vous recherchez n\'existe pas.')}
        </Text>
        <TouchableOpacity style={styles.errorBackButton} onPress={() => router.back()}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.errorBackGradient}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.errorBackText}>{t('Go Back', 'رجوع', 'Retour')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = getProgressPercentage();
  const discountText = getDiscountText();
  const isOfferApplied = offer?.is_applied_by_user || offer?.products.every(p => p.has_applied_offer);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.headerTitleRTL]}>
          {t('Offer Details', 'تفاصيل العرض', 'Détails de l\'offre')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: offer.image.startsWith('http') ? offer.image : `https://haba-haba-api.ubua.cloud/${offer.image.replace(/\\/g, '/')}` }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.heroOverlay}
          />
          <View style={[styles.heroContent, isRTL && styles.heroContentRTL]}>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discountText}</Text>
            </View>
            <Text style={styles.heroTitle}>{offer.name}</Text>
            <Text style={styles.heroDescription} numberOfLines={2}>{offer.description}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{timeLeft.formatted}</Text>
            <Text style={styles.statLabel}>{t('Time Left', 'الوقت المتبقي', 'Temps restant')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{progress}%</Text>
            <Text style={styles.statLabel}>{t('Claimed', 'تم الطلب', 'Réclamé')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="bag-handle-outline" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{offer.products?.length || 0}</Text>
            <Text style={styles.statLabel}>{t('Products', 'المنتجات', 'Produits')}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={[styles.progressHeader, isRTL && styles.progressHeaderRTL]}>
            <Text style={styles.progressTitle}>{t('Offer Usage', 'استخدام العرض', 'Utilisation de l\'offre')}</Text>
            <Text style={styles.progressPercentage}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressSubtitle}>
            {progress >= 100
              ? t('Fully claimed!', 'تم الطلب بالكامل!', 'Entièrement réclamé !')
              : t('Hurry up before it ends!', 'بادر قبل أن ينتهي!', 'Dépêchez-vous avant la fin !')}
          </Text>
        </View>

        {/* Offer Details Card */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, isRTL && styles.cardTitleRTL]}>{t('Offer Details', 'تفاصيل العرض', 'Détails de l\'offre')}</Text>
          <View style={styles.detailsList}>
            <View style={[styles.detailRow, isRTL && styles.detailRowRTL]}>
              <Ionicons name="calendar-outline" size={20} color={Colors.text.secondary} />
              <View style={[styles.detailTexts, isRTL && styles.detailTextsRTL]}>
                <Text style={styles.detailLabel}>{t('Start Date', 'تاريخ البدء', 'Date de début')}</Text>
                <Text style={styles.detailValue}>{new Date(offer.start_at).toLocaleDateString()}</Text>
              </View>
            </View>
            <View style={[styles.detailRow, isRTL && styles.detailRowRTL]}>
              <Ionicons name="calendar-clear-outline" size={20} color={Colors.text.secondary} />
              <View style={[styles.detailTexts, isRTL && styles.detailTextsRTL]}>
                <Text style={styles.detailLabel}>{t('End Date', 'تاريخ الانتهاء', 'Date de fin')}</Text>
                <Text style={styles.detailValue}>{new Date(offer.end_at).toLocaleDateString()}</Text>
              </View>
            </View>
            <View style={[styles.detailRow, isRTL && styles.detailRowRTL]}>
              <Ionicons name="pricetag-outline" size={20} color={Colors.text.secondary} />
              <View style={[styles.detailTexts, isRTL && styles.detailTextsRTL]}>
                <Text style={styles.detailLabel}>{t('Discount Type', 'نوع الخصم', 'Type de réduction')}</Text>
                <Text style={styles.detailValue}>
                  {offer.discount_type === 'percentage'
                    ? t('Percentage', 'نسبة مئوية', 'Pourcentage')
                    : offer.discount_type === 'fixed'
                    ? t('Fixed Amount', 'مبلغ ثابت', 'Montant fixe')
                    : t('Free Delivery', 'توصيل مجاني', 'Livraison gratuite')}
                </Text>
              </View>
            </View>
            <View style={[styles.detailRow, isRTL && styles.detailRowRTL]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.text.secondary} />
              <View style={[styles.detailTexts, isRTL && styles.detailTextsRTL]}>
                <Text style={styles.detailLabel}>{t('Status', 'الحالة', 'Statut')}</Text>
                <Text style={[styles.detailValue, offer.is_active ? styles.statusActive : styles.statusInactive]}>
                  {offer.is_active ? t('Active', 'نشط', 'Actif') : t('Inactive', 'غير نشط', 'Inactif')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Products */}
        {offer.products?.length > 0 && (
          <View style={styles.productsSection}>
            <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
              <Text style={styles.sectionTitle}>{t('Included Products', 'المنتجات المشمولة', 'Produits inclus')}</Text>
              <Text style={styles.sectionSubtitle}>
                {offer.products.length} {t('products', 'منتج', 'produits')}
                {isOfferApplied && ` • ${t('Offer Applied', 'تم تطبيق العرض', 'Offre appliquée')} ✓`}
              </Text>
            </View>

            {offer.products.map((product) => {
              const disabled = !product.is_available || (product.times_used >= product.limited_use);
              const discountedPrice = getDiscountedPrice(product);

              return (
                <View key={product.product_id} style={styles.productCard}>
                  <View style={styles.productImageContainer}>
                    <Image
                      source={{ uri: product.product_image.startsWith('http') ? product.product_image : `https://haba-haba-api.ubua.cloud/${product.product_image.replace(/\\/g, '/')}` }}
                      style={styles.productImage}
                    />
                    {product.has_applied_offer && (
                      <View style={styles.appliedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                        <Text style={styles.appliedBadgeText}>{t('Applied', 'تم التطبيق', 'Appliqué')}</Text>
                      </View>
                    )}
                    {disabled && (
                      <View style={styles.disabledOverlay}>
                        <Text style={styles.disabledText}>
                          {!product.is_available
                            ? t('Unavailable', 'غير متوفر', 'Indisponible')
                            : t('Limit Reached', 'الحد الأقصى', 'Limite atteinte')}
                        </Text>
                      </View>
                    )}
                    <View style={styles.remainingBadge}>
                      <Text style={styles.remainingText}>
                        {product.remaining_uses || 0} {t('left', 'متبقي', 'restant')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{product.product_name}</Text>
                    <Text style={styles.productDescription} numberOfLines={2}>{product.product_description}</Text>

                    <View style={[styles.productFooter, isRTL && styles.productFooterRTL]}>
                      <View>
                        {offer.discount_type !== 'free_delivery' && (
                          <Text style={styles.originalPrice}>{product.product_price} MAD</Text>
                        )}
                        <Text style={styles.discountedPrice}>{discountedPrice.toFixed(2)} MAD</Text>
                        <Text style={styles.productCategory}>{product.product_category}</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.addButton, (disabled || !isOfferApplied) && styles.addButtonDisabled]}
                        onPress={() => handleAddProduct(product)}
                        disabled={disabled || !isOfferApplied}
                      >
                        <LinearGradient
                          colors={disabled || !isOfferApplied ? [Colors.gray[400], Colors.gray[500]] : [Colors.secondary, Colors.secondary]}
                          style={styles.addButtonGradient}
                        >
                          <Ionicons
                            name={disabled ? 'close' : !isOfferApplied ? 'pricetag' : 'cart'}
                            size={20}
                            color="#FFFFFF"
                          />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                    {!isOfferApplied && !disabled && (
                      <Text style={styles.offerRequired}>{t('Offer required', 'يتطلب العرض', 'Offre requise')}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Terms */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, isRTL && styles.cardTitleRTL]}>{t('How It Works', 'كيف يعمل', 'Comment ça marche')}</Text>
          <View style={styles.termsList}>
            <View style={[styles.termItem, isRTL && styles.termItemRTL]}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={[styles.termText, isRTL && styles.termTextRTL]}>
                {t(
                  'Click "Apply This Offer" to activate discounts on all products',
                  'اضغط على "تطبيق هذا العرض" لتفعيل الخصومات على جميع المنتجات',
                  'Cliquez sur "Appliquer cette offre" pour activer les réductions sur tous les produits'
                )}
              </Text>
            </View>
            <View style={[styles.termItem, isRTL && styles.termItemRTL]}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={[styles.termText, isRTL && styles.termTextRTL]}>
                {t(
                  'Then add products to your cart with discounted prices',
                  'ثم أضف المنتجات إلى سلة التسوق بالأسعار المخفضة',
                  'Ajoutez ensuite des produits à votre panier avec des prix réduits'
                )}
              </Text>
            </View>
            <View style={[styles.termItem, isRTL && styles.termItemRTL]}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={[styles.termText, isRTL && styles.termTextRTL]}>
                {t(
                  `Valid until ${new Date(offer.end_at).toLocaleDateString()}`,
                  `صالحة حتى ${new Date(offer.end_at).toLocaleDateString()}`,
                  `Valable jusqu'au ${new Date(offer.end_at).toLocaleDateString()}`
                )}
              </Text>
            </View>
            <View style={[styles.termItem, isRTL && styles.termItemRTL]}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={[styles.termText, isRTL && styles.termTextRTL]}>
                {t(
                  'Cannot be combined with other offers',
                  'لا يمكن دمجها مع عروض أخرى',
                  'Non cumulable avec d\'autres offres'
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed Apply Button */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={[styles.applyButton, (timeLeft.isExpired || isOfferApplied) && styles.applyButtonDisabled]}
          onPress={isOfferApplied ? undefined : handleApplyOffer}
          disabled={timeLeft.isExpired || isOfferApplied || applyingOffer}
        >
          <LinearGradient
            colors={timeLeft.isExpired || isOfferApplied ? [Colors.gray[400], Colors.gray[500]] : [Colors.primary, Colors.primaryDark]}
            style={styles.applyButtonGradient}
          >
            {applyingOffer ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name={isOfferApplied ? 'checkmark-circle' : 'pricetag'} size={24} color="#FFFFFF" />
                <Text style={styles.applyButtonText}>
                  {isOfferApplied
                    ? t('Offer Applied ✓', 'تم تطبيق العرض ✓', 'Offre appliquée ✓')
                    : t('Apply This Offer', 'تطبيق هذا العرض', 'Appliquer cette offre')}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBackButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  errorBackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  errorBackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  headerTitleRTL: {
    textAlign: 'right',
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroContainer: {
    height: 250,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  heroContentRTL: {
    alignItems: 'flex-end',
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 8,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: -40,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  progressSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  cardTitleRTL: {
    textAlign: 'right',
  },
  detailsList: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailRowRTL: {
    flexDirection: 'row-reverse',
  },
  detailTexts: {
    flex: 1,
  },
  detailTextsRTL: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  statusActive: {
    color: Colors.success,
  },
  statusInactive: {
    color: Colors.error,
  },
  productsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  appliedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  appliedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  remainingBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  remainingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  productFooterRTL: {
    flexDirection: 'row-reverse',
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  productCategory: {
    fontSize: 10,
    color: Colors.text.light,
    textTransform: 'capitalize',
  },
  addButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  offerRequired: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 4,
    textAlign: 'right',
  },
  termsList: {
    gap: 12,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  termItemRTL: {
    flexDirection: 'row-reverse',
  },
  termText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  termTextRTL: {
    textAlign: 'right',
  },
  bottomSpacer: {
    height: 20,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  applyButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonDisabled: {
    shadowColor: Colors.gray[400],
  },
  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});