import { ProductCardSkeleton } from '@/components/ui/skeleton';
import Colors from '@/constants/Colors';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import axios from "axios";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useDispatch, useSelector } from "react-redux";
import { useRestaurantStatus } from '../contexts/RestaurantStatusContext';
import { Product } from './redux/slices/homeSlice';
import { addItem, updateItemQuantity } from "./redux/slices/orderSlice";
import { RootState } from "./redux/store";

// Helper to compute price considering promo (percentage discount)
const getProductPrice = (product: Product) => {
  if (product.promo && product.promoValue) {
    const original = product.price || 0;
    const discountAmount = original * (product.promoValue / 100);
    const final = Math.max(original - discountAmount, 0);
    return {
      final,
      original,
      hasDiscount: true,
    };
  }
  // Fallback to existing discount fields
  return {
    final: product.final_price || product.price,
    original: product.original_price || product.price,
    hasDiscount: product.discount_applied ?? false,
  };
};

interface FavoriteScreenProps {
  setActiveTab?: (tab: string) => void;
  setSelectedProductId?: (id: number) => void;
}

// Translation helper
const t = (lang: 'english' | 'arabic' | 'french', obj: { en: string; ar: string; fr: string }): string => {
  if (lang === 'arabic') return obj.ar;
  if (lang === 'french') return obj.fr;
  return obj.en;
};

// Favorite Card Component
const FavoriteCard = React.memo(({
  product,
  onRemove,
  onAddToCart,
  onUpdateQuantity,
  restaurantIsOpen,
  userLanguage,
  restaurantName,
}: {
  product: Product;
  onRemove: (id: number) => void;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
  restaurantIsOpen: boolean;
  userLanguage: 'english' | 'arabic' | 'french';
  restaurantName: string;
}) => {
  const cartItem = useSelector((state: RootState) =>
    state.orders.items.find(item => item.id === product.id)
  );
  const quantityInCart = cartItem?.quantity || 0;
  const isRTL = userLanguage === 'arabic';
  const isLTR = !isRTL;

  // Get price info (promo-aware)
  const { final, original, hasDiscount } = getProductPrice(product);

  const handleAddToCart = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddToCart(product);
  };

  const handleIncrease = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateQuantity(product.id, quantityInCart + 1);
  };

  const handleDecrease = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (quantityInCart > 1) {
      onUpdateQuantity(product.id, quantityInCart - 1);
    } else {
      onUpdateQuantity(product.id, 0);
    }
  };

  const getImageUrl = () => {
    if (!product.image) return undefined;
    if (product.image.startsWith('http') || product.image.startsWith('file://')) {
      return product.image;
    }
    return `https://haba-haba-api.ubua.cloud/${product.image.replace(/\\/g, '/')}`;
  };

  const renderPrice = () => {
    const currency = t(userLanguage, { en: 'MAD', ar: 'د.م.', fr: 'MAD' });

    if (hasDiscount) {
      return (
        <View style={[styles.priceContainer, isLTR && styles.priceContainerLtr]}>
          <Text style={styles.price}>
            {Math.round(final)} <Text style={styles.currency}>{currency}</Text>
          </Text>
          <Text style={styles.oldPrice}>{Math.round(original)} {currency}</Text>
        </View>
      );
    }
    return (
      <Text style={styles.price}>
        {Math.round(original)} <Text style={styles.currency}>{currency}</Text>
      </Text>
    );
  };

  const renderOfferTag = () => {
    if (!product.has_offer || !product.offer_info) return null;

    if (product.discount_applied) {
      return (
        <View style={[styles.activeOfferTag, isLTR ? styles.offerTagLtr : styles.offerTagRtl]}>
          <Ionicons name="pricetag" size={12} color="#fff" />
          <Text style={styles.activeOfferText} numberOfLines={1}>
            {product.offer_info.offer_name}
          </Text>
        </View>
      );
    } else {
      return (
        <View style={[styles.inactiveOfferTag, isLTR ? styles.offerTagLtr : styles.offerTagRtl]}>
          <Ionicons name="pricetag-outline" size={12} color={Colors.text.secondary} />
          <Text style={styles.inactiveOfferText} numberOfLines={1}>
            {product.offer_info.offer_name}
          </Text>
        </View>
      );
    }
  };

  const cartButton = () => {
    if (quantityInCart > 0) {
      return (
        <View style={[styles.quantityControl, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={handleDecrease} style={styles.quantityBtn} disabled={!restaurantIsOpen}>
            <Ionicons name="remove" size={16} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantityInCart}</Text>
          <TouchableOpacity onPress={handleIncrease} style={styles.quantityBtn} disabled={!restaurantIsOpen}>
            <Ionicons name="add" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={handleAddToCart} disabled={!restaurantIsOpen}>
        <LinearGradient
          colors={restaurantIsOpen ? ['#93522B', '#7A4324'] : ['#D1D5DB', '#9CA3AF']}
          style={styles.addBtn}
        >
          <Ionicons name={restaurantIsOpen ? "cart" : "lock-closed"} size={22} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, hasDiscount && styles.discountedCard]}
      activeOpacity={0.9}
      onPress={() => {
        // Optional: navigate to product details
      }}
    >
      {/* Content Section (on the left) */}
      <View style={[styles.contentArea, isLTR ? styles.contentAreaLtr : styles.contentAreaRtl]}>
        <Text style={[styles.title, isRTL && styles.textRtl]} numberOfLines={1}>
          {product.name}
        </Text>

        <Text style={[styles.desc, isRTL && styles.textRtl]} numberOfLines={2}>
          {product.description || t(userLanguage, { en: 'Product description', ar: 'وصف المنتج', fr: 'Description du produit' })}
        </Text>

        <Text style={[styles.restaurantName, isRTL && styles.textRtl]} numberOfLines={1}>
          {restaurantName}
        </Text>

        {renderOfferTag()}

        <View style={[styles.footer, isRTL && styles.footerRtl]}>
          {cartButton()}
          {renderPrice()}
        </View>
      </View>

      {/* Image Section (always on the right) */}
      <View style={styles.imageSection}>
        {product.image ? (
          <Image source={{ uri: getImageUrl() }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="restaurant" size={30} color="#E5E7EB" />
          </View>
        )}

        {/* Rating badge */}
        <View style={[styles.ratingBadge, isRTL && { left: undefined, right: 8 }]}>
          <Ionicons name="star" size={10} color="#FFB800" />
          <Text style={styles.ratingText}>{product.rating || 4.9}</Text>
        </View>

        {/* Heart icon */}
        <TouchableOpacity
          style={[styles.heartIcon, isRTL && { right: undefined, left: 8 }]}
          onPress={() => onRemove(product.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="heart" size={18} color={Colors.primary}/>
        </TouchableOpacity>

        {product.is_popular && (
          <View style={[styles.popularBadge, isRTL && { right: undefined, left: 8 }]}>
            <Ionicons name="flame" size={12} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

FavoriteCard.displayName = 'FavoriteCard';

const FavoriteScreen: React.FC<FavoriteScreenProps> = () => {
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [userContext, setUserContext] = useState<any>(null);

  // Language state – self-managed from AsyncStorage
  const [language, setLanguage] = useState<'english' | 'arabic' | 'french'>('english');
  const [loadingLang, setLoadingLang] = useState(true);

  const { isOpen: restaurantIsOpen } = useRestaurantStatus();
  const isRTL = language === 'arabic';
  const isLTR = !isRTL;

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

  const fetchFavorites = async () => {
    try {
      const userData = await AsyncStorage.getItem("client");
      const user = userData ? JSON.parse(userData) : null;
      if (!user || !user.id) {
        router.replace("/signin");
        return;
      }

      const response = await axios.get(`https://haba-haba-api.ubua.cloud/api/auth/get-favorite`, {
        params: { client_id: user.id },
      });

      setFavorites(response.data?.favorites || []);
      setRestaurantName(response.data.restaurant_name);
      setUserContext(response.data.user_context);
    } catch (error: any) {
      console.error("Error fetching favorites:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (productId: number) => {
    try {
      const userData = await AsyncStorage.getItem("client");
      const user = userData ? JSON.parse(userData) : null;
      if (!user || !user.id) return;

      await axios.delete(`https://haba-haba-api.ubua.cloud/api/auth/remove-favorite`, {
        data: { client_id: user.id, product_id: productId },
      });

      setFavorites((prev) => prev.filter((f) => f.id !== productId));
      Toast.show({
        type: 'info',
        text1: t(language, { en: 'Removed from favorites 💔', ar: 'تم إزالته من المفضلة 💔', fr: 'Retiré des favoris 💔' }),
        position: 'top',
        visibilityTime: 1500,
      });
    } catch (error: any) {
      console.error("Error removing favorite:", error.response?.data || error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const dispatch = useDispatch();

  const addToCart = (product: Product) => {
    if (!restaurantIsOpen) {
      Toast.show({
        type: 'error',
        text1: t(language, { en: 'Restaurant Closed', ar: 'المطعم مغلق', fr: 'Restaurant fermé' }),
        text2: t(language, { en: 'The restaurant is currently closed. Please try again later.', ar: 'المطعم مغلق حاليًا. يرجى المحاولة لاحقًا.', fr: 'Le restaurant est actuellement fermé. Veuillez réessayer plus tard.' }),
        position: 'top',
        visibilityTime: 2000,
        text1Style: { textAlign: isRTL ? 'right' : 'left' },
        text2Style: { textAlign: isRTL ? 'right' : 'left' },
      });
      return;
    }

    // Use the same helper to get the correct price and discount status
    const { final, original, hasDiscount } = getProductPrice(product);

    dispatch(
      addItem({
        id: product.id,
                name: product.name,
                description: product.description || '',
                price: final,
                quantity: 1,
                image: product.image || '',
                restaurant: restaurantName, // use from Redux
                discount_applied: hasDiscount,
                original_price: original,
                offer_info: product.offer_info,
                specialInstructions: '',
                showSpecialInstructions: false,
      })
    );

    Toast.show({
      type: 'success',
      text1: t(language, { en: 'Added to cart', ar: 'تمت الإضافة للسلة', fr: 'Ajouté au panier' }),
      text2: t(language, { en: `${product.name} has been added!`, ar: `${product.name} تمت إضافته!`, fr: `${product.name} a été ajouté !` }),
      position: 'top',
      visibilityTime: 2000,
      text1Style: { textAlign: isRTL ? 'right' : 'left' },
      text2Style: { textAlign: isRTL ? 'right' : 'left' },
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    dispatch(updateItemQuantity({ id: productId, quantity: newQuantity }));
  };

  const renderItem = ({ item }: { item: Product }) => (
    <FavoriteCard
      product={item}
      onRemove={removeFavorite}
      onAddToCart={addToCart}
      onUpdateQuantity={updateQuantity}
      restaurantIsOpen={restaurantIsOpen}
      userLanguage={language}
      restaurantName={restaurantName}
    />
  );

  const activeDiscountCount = favorites.filter(f => {
    const { hasDiscount } = getProductPrice(f);
    return hasDiscount;
  }).length;

  if (loadingLang || loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={isRTL ? styles.titleAr : styles.title}>
            {t(language, { en: 'Favorites', ar: 'المفضلة', fr: 'Favoris' })}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 16 }}>
          {[1, 2, 3].map(i => <ProductCardSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, Platform.OS === 'android' ? { paddingTop: insets.top } : null]}>
      <View style={{ zIndex: 100 }}><Toast /></View>

      {/* Header */}
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={isRTL ? styles.titleAr : styles.title}>
          {t(language, { en: 'Favorites', ar: 'المفضلة', fr: 'Favoris' })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {!loading && (
        <Text style={[styles.subHeader, isRTL && { textAlign: 'right' }]}>
          {t(language, { 
            en: `${favorites.length} favorite item${favorites.length !== 1 ? 's' : ''}`,
            ar: `${favorites.length} عناصر مفضلة`,
            fr: `${favorites.length} article${favorites.length !== 1 ? 's' : ''} favori${favorites.length !== 1 ? 's' : ''}`
          })}
          {activeDiscountCount > 0 && (
            <Text style={styles.offerCount}>
              {t(language, {
                en: ` • ${activeDiscountCount} with active discount${activeDiscountCount !== 1 ? 's' : ''}`,
                ar: ` • ${activeDiscountCount} مع خصومات نشطة`,
                fr: ` • ${activeDiscountCount} avec réduction${activeDiscountCount !== 1 ? 's' : ''} active${activeDiscountCount !== 1 ? 's' : ''}`
              })}
            </Text>
          )}
        </Text>
      )}

      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={40} color={Colors.gray[400]} />
          <Text style={[styles.emptyStateText, isRTL && { textAlign: 'right' }]}>
            {t(language, { en: 'No favorites yet', ar: 'لا توجد مفضلات بعد', fr: 'Aucun favori pour l\'instant' })}
          </Text>
          <Text style={[styles.emptyStateSubtext, isRTL && { textAlign: 'right' }]}>
            {t(language, { en: 'Start adding items to your favorites!', ar: 'ابدأ بإضافة عناصر إلى مفضلاتك!', fr: 'Commencez à ajouter des articles à vos favoris !' })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  titleAr: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'right',
  },
  subHeader: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 10,
  },
  offerCount: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  // Card styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    height: 160,
    flexDirection: 'row',
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  discountedCard: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: '#FFF9F5',
  },
  imageSection: {
    width: 140,
    height: '100%',
    borderRadius: 16,
    position: 'relative',
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  popularBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: Colors.warning,
    padding: 6,
    borderRadius: 12,
    zIndex: 5,
  },
  heartIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    padding: 4,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  contentAreaRtl: {
    paddingRight: 12,
    paddingLeft: 0,
  },
  contentAreaLtr: {
    paddingLeft: 12,
    paddingRight: 0,
    marginRight: 10, // separates content from image
  },
  desc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 2,
  },
  restaurantName: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerRtl: {
    flexDirection: 'row-reverse',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceContainerLtr: {
    alignItems: 'flex-end', // keep price aligned right
  },
  price: {
    fontSize: 18,
    fontWeight: '900',
    color: '#93522B',
  },
  currency: {
    fontSize: 11,
  },
  oldPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  addBtn: {
    width: 45,
    height: 32,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityControl: {
    backgroundColor: '#93522B',
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
    minWidth: 22,
    textAlign: 'center',
  },
  activeOfferTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  inactiveOfferTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  offerTagLtr: {
    alignSelf: 'flex-start', // left aligned for LTR
  },
  offerTagRtl: {
    alignSelf: 'flex-end',   // right aligned for RTL
  },
  activeOfferText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  inactiveOfferText: {
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  textRtl: {
    textAlign: 'right',
  },
});

export default FavoriteScreen;