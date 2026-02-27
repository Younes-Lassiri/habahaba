import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { RefreshControl } from 'react-native';
import { addItem, updateItemQuantity, updateSpecialInstructions } from './redux/slices/orderSlice';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './redux/store';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRestaurantStatus } from '../contexts/RestaurantStatusContext';
import { RestaurantClosedBanner } from '../components/RestaurantClosedBanner';

interface AddonsState {
  extraCheese: boolean;
  bacon: boolean;
  avocado: boolean;
  frenchFries: boolean;
}

interface OfferInfo {
  offer_id: number;
  offer_name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  original_price: number;
  can_use_offer: boolean;
  times_used: number;
  max_uses: number | null;
  remaining_uses: number | null;
  user_has_used?: boolean;
  user_usage_count?: number;
  valid_until: string;
  description?: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  rating?: number;
  image?: string;
  category_id?: number | null;
  delivery?: string;
  promo: boolean;
  promoValue: number;
  badge?: string;
  discount_applied?: boolean;
  original_price?: number;
  final_price?: number;
  offer_info?: OfferInfo | null;
  has_offer?: boolean;
  is_popular?: boolean;
}

interface ProductDetailsPageProps {
  userLanguage?: 'english' | 'arabic';
}

// ─── Design Tokens ───────────────────────────────────────────────────────────
const CREAM = '#f9f8f3';
const BROWN = Colors.primary;
const BROWN_LIGHT = '#93522B';
const AMBER = '#C4813A';
const AMBER_LIGHT = '#F5E6D3';
const CHIP_BG = '#EDE8E0';
const GREEN = '#22C55E';
const RED = '#EF4444';
const GRAY_TEXT = '#9B8B7A';
const BORDER_COLOR = '#E8DDD4';

const BurgerOrderScreen: React.FC<ProductDetailsPageProps> = ({
  userLanguage = 'english',
}) => {
  const insets = useSafeAreaInsets();
  const { isOpen: restaurantIsOpen, getStatusMessage } = useRestaurantStatus();

  const { id } = useLocalSearchParams();
  const productId = typeof id === 'string' ? parseInt(id, 10) : Number(id?.[0] || 0);

  const [refreshing, setRefreshing] = useState(false);
  const [addons, setAddons] = useState<AddonsState>({
    extraCheese: false,
    bacon: false,
    avocado: false,
    frenchFries: false
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const { products, restaurant_name } = useSelector((state: RootState) => state.home);

  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.orders.items);

  const selectedItem = products.find(item => item.id === productId);

  // Function to check if text contains Arabic characters
  const isArabicText = (text: string) => {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text);
  };

  useEffect(() => {
    if (selectedItem) {
      const existingCartItem = cartItems.find(item => item.id === selectedItem.id);
      if (existingCartItem?.specialInstructions) {
        setSpecialInstructions(existingCartItem.specialInstructions);
      }
    }
  }, [selectedItem?.id, cartItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshing(false);
  };

  const getBasePrice = (): number => {
    if (!selectedItem) return 0;
    const originalPrice = selectedItem.original_price || selectedItem.price || 0;
    let finalPrice = selectedItem.final_price;
    if (finalPrice === null || finalPrice === undefined || finalPrice <= 0) {
      finalPrice = originalPrice;
    }
    const hasDiscount = selectedItem.discount_applied && finalPrice < originalPrice;
    const hasPromo = selectedItem.promo && selectedItem.promoValue && !hasDiscount;
    if (hasDiscount) return Math.round(finalPrice);
    if (hasPromo) return Math.round(originalPrice * (1 - (selectedItem.promoValue || 0) / 100));
    return Math.round(originalPrice);
  };

  const calculateTotal = (): string => {
    if (!selectedItem) return '0.00';
    let basePrice = getBasePrice();
    let total = basePrice;
    if (addons.extraCheese) total += 8;
    if (addons.bacon) total += 12;
    if (addons.avocado) total += 10;
    if (addons.frenchFries) total += 15;
    return (total * quantity).toFixed(2);
  };

  const incrementQuantity = (): void => { setQuantity(prev => prev + 1); };
  const decrementQuantity = (): void => { if (quantity > 1) setQuantity(prev => prev - 1); };

  const addToCart = () => {
    if (!selectedItem) return;
    if (!restaurantIsOpen) {
      Alert.alert(
        "Restaurant Closed",
        `We're currently closed. ${getStatusMessage()}`,
        [{ text: "OK" }]
      );
      return;
    }
    let basePrice = getBasePrice();
    let finalPrice = basePrice;
    if (addons.extraCheese) finalPrice += 8;
    if (addons.bacon) finalPrice += 12;
    if (addons.avocado) finalPrice += 10;
    if (addons.frenchFries) finalPrice += 15;
    const existingItem = cartItems.find(item => item.id === selectedItem.id);
    if (existingItem && !selectedItem.discount_applied) {
      dispatch(updateItemQuantity({ id: selectedItem.id, quantity: existingItem.quantity + quantity }));
      dispatch(updateSpecialInstructions({ id: selectedItem.id, instructions: specialInstructions }));
    } else {
      dispatch(addItem({
        id: selectedItem.id,
        name: selectedItem.name,
        description: selectedItem.description || '',
        price: finalPrice,
        quantity: quantity,
        image: selectedItem.image || '',
        restaurant: restaurant_name,
        discount_applied: selectedItem.discount_applied,
        original_price: selectedItem.original_price || selectedItem.price,
        offer_info: selectedItem.offer_info,
        specialInstructions: specialInstructions,
        showSpecialInstructions: !!specialInstructions,
      }));
    }
    Toast.show({
      type: 'success',
      text1: existingItem ? 'Cart updated' : 'Added to cart',
      text2: `${selectedItem.name} has been ${existingItem ? 'updated' : 'added'}!`,
      position: 'top',
      visibilityTime: 2000,
    });
  };

  const checkIfFavorite = async (productId: number) => {
    try {
      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;
      if (!user || !user.id) { router.replace('/signin'); return; }
      const response = await axios.get(`https://haba-haba-api.ubua.cloud/api/auth/get-favorite?client_id=${user.id}`);
      if (response.data?.favorites?.length > 0) {
        const isFav = response.data.favorites.some((fav: any) => fav.id === productId);
        setIsFavorite(isFav);
      }
    } catch (error: any) {
      console.error("Error checking favorite:", error.response?.data || error.message);
    }
  };

  const addToFavorites = async (selectedItem: Product) => {
    try {
      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;
      if (!user || !user.id) { router.replace('/signin'); return; }
      if (isFavorite) {
        await axios.delete(`https://haba-haba-api.ubua.cloud/api/auth/remove-favorite`, {
          data: { client_id: user.id, product_id: selectedItem.id },
        });
        setIsFavorite(false);
        Toast.show({ type: 'info', text1: 'Removed from favorites 💔', position: 'top', visibilityTime: 1500 });
        return;
      }
      const response = await axios.post(`https://haba-haba-api.ubua.cloud/api/auth/add-favorite`, {
        client_id: user.id, product_id: selectedItem.id,
      });
      if (response.data?.message) {
        setIsFavorite(true);
        Toast.show({ type: 'success', text1: 'Added to favorites ❤️', position: 'top', visibilityTime: 1500 });
      }
    } catch (error: any) {
      console.error("Error adding favorite:", error.response?.data || error.message);
      Toast.show({ type: 'error', text1: 'Error updating favorite', text2: error.message, position: 'top', visibilityTime: 1500 });
    }
  };

  useEffect(() => {
    if (selectedItem) { checkIfFavorite(selectedItem.id); }
  }, [selectedItem]);

  // ─── Offer Badge ───────────────────────────────────────────────────────────
  const renderOfferBadge = (product: Product) => {
    if (!product.has_offer || !product.offer_info) return null;
    const offer = product.offer_info;
    if (product.discount_applied) {
      return (
        <View style={[newStyles.offerBadge, newStyles.activeOfferBadge]}>
          <Ionicons name="flash" size={13} color="#FFFFFF" />
          <Text style={newStyles.offerBadgeText}>
            -{offer.discount_value}{offer.discount_type === 'percentage' ? '%' : ' MAD'}
          </Text>
          {offer.max_uses && offer.remaining_uses !== null && offer.remaining_uses > 0 && (
            <Text style={newStyles.remainingUses}>
              {offer.remaining_uses} left
            </Text>
          )}
        </View>
      );
    } else {
      let badgeText = "Offer Used";
      let iconName: React.ComponentProps<typeof Ionicons>['name'] = "time-outline";
      if (offer.user_has_used || (offer.user_usage_count ?? 0) >= 1) {
        badgeText = "Already Used";
        iconName = "checkmark-done";
      } else if (offer.max_uses && offer.times_used >= offer.max_uses) {
        badgeText = "Limit Reached";
        iconName = "alert-circle";
      }
      return (
        <View style={[newStyles.offerBadge, newStyles.usedOfferBadge]}>
          <Ionicons name={iconName} size={13} color="#FFFFFF" />
          <Text style={newStyles.offerBadgeText}>{badgeText}</Text>
        </View>
      );
    }
  };

  // ─── Price Display ─────────────────────────────────────────────────────────
  const renderPriceDisplay = () => {
    if (!selectedItem) return null;
    const originalPrice = selectedItem.original_price || selectedItem.price || 0;
    let finalPrice = selectedItem.final_price;
    if (finalPrice === null || finalPrice === undefined || finalPrice <= 0) finalPrice = originalPrice;
    const hasDiscount = selectedItem.discount_applied && finalPrice < originalPrice;
    const hasPromo = selectedItem.promo && selectedItem.promoValue && !hasDiscount;

    if (hasDiscount) {
      return (
        <View style={newStyles.priceBlock}>
          <Text style={newStyles.priceDiscounted}>{Math.round(finalPrice)} <Text style={newStyles.priceCurrency}>MAD</Text></Text>
          <Text style={newStyles.priceStrike}>{Math.round(originalPrice)} MAD</Text>
        </View>
      );
    }
    if (hasPromo) {
      const discountedPrice = Math.round(originalPrice * (1 - (selectedItem.promoValue || 0) / 100));
      return (
        <View style={newStyles.priceBlock}>
          <Text style={newStyles.pricePromo}>{discountedPrice} <Text style={newStyles.priceCurrency}>MAD</Text></Text>
          <Text style={newStyles.priceStrike}>{Math.round(originalPrice)} MAD</Text>
        </View>
      );
    }
    return (
      <View style={newStyles.priceBlock}>
        <Text style={newStyles.priceMain}>{Math.round(originalPrice)} <Text style={newStyles.priceCurrency}>MAD</Text></Text>
      </View>
    );
  };

  // ─── Fallback States ───────────────────────────────────────────────────────
  if (!selectedItem && products.length > 0) {
    return (
      <SafeAreaView style={[newStyles.container, { paddingTop: insets.top }]}>
        <View style={newStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={AMBER} />
          <Text style={newStyles.errorTitle}>Product not found</Text>
          <Text style={newStyles.errorSubtitle}>The product you're looking for doesn't exist</Text>
          <TouchableOpacity style={newStyles.backBtn} onPress={() => router.back()}>
            <Text style={newStyles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedItem) {
    return (
      <SafeAreaView style={[newStyles.container, { paddingTop: insets.top }]}>
        <View style={newStyles.loadingContainer}>
          <ActivityIndicator size="large" color={AMBER} />
          <Text style={newStyles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determine text alignment based on content
  const nameAlignment = isArabicText(selectedItem.name) ? 'right' : 'left';
  const descriptionAlignment = selectedItem.description && isArabicText(selectedItem.description) ? 'right' : 'left';

  return (
    <SafeAreaView style={[newStyles.container, { paddingTop: insets.top }]}>
      <View style={{ zIndex: 100 }}><Toast /></View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        >

          {/* ── Hero Image ── */}
          <View style={newStyles.heroContainer}>
            <Image
              source={{
                uri: selectedItem?.image
                  ? (selectedItem.image.startsWith('http') || selectedItem.image.startsWith('file://'))
                    ? selectedItem.image
                    : `https://haba-haba-api.ubua.cloud/${selectedItem.image.replace(/\\/g, '/')}`
                  : undefined
              }}
              style={newStyles.heroImage}
            />

            {/* Back button */}
            <TouchableOpacity
              style={[newStyles.circleBtn, { top: 16, left: 16 }]}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color={BROWN} />
            </TouchableOpacity>

            {/* Favorite button */}
            <TouchableOpacity
              style={[newStyles.circleBtn, { top: 16, right: 16 }]}
              activeOpacity={0.8}
              onPress={() => addToFavorites(selectedItem)}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite ? RED : BROWN}
              />
            </TouchableOpacity>

            {/* Promo badge */}
            {selectedItem.promo && selectedItem.promoValue && !selectedItem.has_offer && (
              <View style={newStyles.promoPill}>
                <Text style={newStyles.promoPillText}>-{selectedItem.promoValue}% OFF</Text>
              </View>
            )}

            {/* Popular badge */}
            {selectedItem.is_popular && (
              <View style={newStyles.popularPill}>
                <Ionicons name="flame" size={13} color="#fff" />
                <Text style={newStyles.popularPillText}>Popular</Text>
              </View>
            )}

            {/* Offer badge */}
            {renderOfferBadge(selectedItem)}

            {/* Rating chip - pushed to top */}
            <View style={newStyles.ratingChip}>
              <Ionicons name="star" size={14} color={AMBER} />
              <Text style={newStyles.ratingChipText}>{selectedItem.rating || 4.5}</Text>
            </View>
          </View>

          {/* ── Content Card ── */}
          <View style={newStyles.card}>

            {/* Product name - alignment based on content */}
            <Text style={[newStyles.productName, { textAlign: nameAlignment }]}>
              {selectedItem.name}
            </Text>

            {/* Price - left aligned (default) */}
            <View style={{ alignItems: 'flex-start' }}>
              {renderPriceDisplay()}
            </View>

            {/* Meta row: delivery time + restaurant */}
            <View style={newStyles.metaRow}>
              {selectedItem.delivery && (
                <View style={newStyles.metaChip}>
                  <Ionicons name="time-outline" size={14} color={GRAY_TEXT} />
                  <Text style={newStyles.metaChipText}>{selectedItem.delivery}</Text>
                </View>
              )}
              <View style={newStyles.metaChip}>
                <Ionicons name="restaurant-outline" size={14} color={GRAY_TEXT} />
                <Text style={newStyles.metaChipText}>{restaurant_name}</Text>
              </View>
              {selectedItem.badge && (
                <View style={newStyles.badgePill}>
                  <Ionicons name="star" size={11} color="#fff" />
                  <Text style={newStyles.badgePillText}>{selectedItem.badge}</Text>
                </View>
              )}
            </View>

            {/* Offer info bar */}
            {selectedItem.discount_applied && selectedItem.offer_info && (
              <View style={newStyles.offerInfoBar}>
                <Ionicons name="gift" size={15} color={GREEN} />
                <Text style={newStyles.offerInfoBarText}>{selectedItem.offer_info.offer_name}</Text>
              </View>
            )}

            <View style={newStyles.divider} />

            {/* Description - alignment based on content */}
            {selectedItem.description && (
              <Text style={[newStyles.description, { textAlign: descriptionAlignment }]}>
                {selectedItem.description}
              </Text>
            )}

            {/* ── From Our Kitchen Story Card ── */}
            <View style={newStyles.storyCard}>
              <Text style={newStyles.storyTitle}>From Our Kitchen</Text>
              <Text style={newStyles.storyText}>
                This dish is prepared with the finest ingredients and the same care we'd give to our own family. Every order is made fresh, just for you.
              </Text>
            </View>

            {/* ── Special Instructions ── */}
            <View style={newStyles.sectionBlock}>
              <Text style={newStyles.sectionLabel}>Special Instructions</Text>
              <Text style={newStyles.sectionSub}>Let us know your preferences</Text>
              <TextInput
                style={newStyles.textInput}
                placeholder="Any special requests? (e.g., no onions, extra sauce)"
                placeholderTextColor={GRAY_TEXT}
                multiline
                maxLength={200}
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                textAlign="left"
              />
              <Text style={newStyles.charCount}>{specialInstructions.length}/200</Text>
            </View>

            {/* Restaurant closed banner */}
            {!restaurantIsOpen && (
              <RestaurantClosedBanner compact={true} showHoursButton={false} userLanguage={userLanguage} />
            )}
          </View>
        </ScrollView>

        {/* ── Sticky Bottom Bar ── */}
        <View style={newStyles.bottomBar}>
          {/* Quantity */}
          <View style={[
            newStyles.qtyControl,
            !restaurantIsOpen && { opacity: 0.4 }
          ]}>
            <TouchableOpacity
              style={[newStyles.qtyBtn, newStyles.qtyBtnMinus]}
              onPress={decrementQuantity}
              activeOpacity={0.7}
              disabled={quantity === 1 || !restaurantIsOpen}
            >
              <Ionicons name="remove" size={18} color={quantity === 1 || !restaurantIsOpen ? GRAY_TEXT : BROWN} />
            </TouchableOpacity>
            <Text style={newStyles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={[
                newStyles.qtyBtn, newStyles.qtyBtnPlus,
                (selectedItem?.discount_applied || !restaurantIsOpen) && { backgroundColor: CHIP_BG }
              ]}
              onPress={incrementQuantity}
              activeOpacity={selectedItem?.discount_applied || !restaurantIsOpen ? 1 : 0.8}
            >
              <Ionicons
                name="add"
                size={18}
                color={selectedItem?.discount_applied || !restaurantIsOpen ? GRAY_TEXT : '#fff'}
              />
            </TouchableOpacity>
          </View>

          {/* Add to Cart */}
          <TouchableOpacity
            style={[
              newStyles.cartBtn,
              !restaurantIsOpen && newStyles.cartBtnDisabled
            ]}
            onPress={addToCart}
            activeOpacity={restaurantIsOpen ? 0.9 : 1}
          >
            <View style={newStyles.cartBtnLeft}>
              <Ionicons name={restaurantIsOpen ? "cart-outline" : "time-outline"} size={20} color="#fff" />
              <Text style={newStyles.cartBtnText}>
                {restaurantIsOpen ? 'Add to Cart' : 'Currently Closed'}
              </Text>
            </View>
            {restaurantIsOpen && (
              <Text style={newStyles.cartBtnPrice}>
                {calculateTotal()} MAD
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const newStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },

  // Loading / Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: CREAM,
  },
  loadingText: {
    fontSize: 14,
    color: GRAY_TEXT,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
    backgroundColor: CREAM,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: BROWN,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: GRAY_TEXT,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: BROWN,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 50,
    marginTop: 16,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Hero
  heroContainer: {
    position: 'relative',
    height: 320,
    backgroundColor: CHIP_BG,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  circleBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  promoPill: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: RED,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
  },
  promoPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  popularPill: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: AMBER,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  offerBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activeOfferBadge: { backgroundColor: GREEN },
  usedOfferBadge: { backgroundColor: AMBER },
  offerBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  remainingUses: { color: '#fff', fontSize: 11, fontWeight: '600', opacity: 0.9 },
  ratingChip: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: BROWN,
  },

  // Card
  card: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 0,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 8,
  },
  productName: {
    fontSize: 26,
    fontWeight: '800',
    color: BROWN,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  // Price
  priceBlock: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  priceMain: {
    fontSize: 24,
    fontWeight: '900',
    color: BROWN,
  },
  priceDiscounted: {
    fontSize: 24,
    fontWeight: '900',
    color: GREEN,
  },
  pricePromo: {
    fontSize: 24,
    fontWeight: '900',
    color: RED,
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: AMBER,
  },
  priceStrike: {
    fontSize: 15,
    color: GRAY_TEXT,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CHIP_BG,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
  },
  metaChipText: {
    fontSize: 12,
    color: GRAY_TEXT,
    fontWeight: '600',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AMBER,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
  },
  badgePillText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },

  // Offer info bar
  offerInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  offerInfoBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
  },

  divider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: 18,
  },

  description: {
    fontSize: 15,
    color: BROWN_LIGHT,
    lineHeight: 24,
    marginBottom: 20,
  },

  // Sections
  sectionBlock: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: BROWN,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 13,
    color: GRAY_TEXT,
    marginBottom: 12,
    fontWeight: '500',
  },

  // Story card
  storyCard: {
    backgroundColor: BROWN,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  storyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: AMBER,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  storyText: {
    fontSize: 14,
    color: AMBER_LIGHT,
    lineHeight: 22,
    fontWeight: '400',
  },

  // Special instructions
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: BROWN,
    minHeight: 90,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
  },
  charCount: {
    fontSize: 12,
    color: GRAY_TEXT,
    marginTop: 6,
    textAlign: 'right',
    fontWeight: '500',
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: CREAM,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CHIP_BG,
    borderRadius: 14,
    padding: 4,
    gap: 2,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnMinus: {
    backgroundColor: '#fff',
  },
  qtyBtnPlus: {
    backgroundColor: BROWN,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    color: BROWN,
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  cartBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BROWN,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cartBtnDisabled: {
    backgroundColor: GRAY_TEXT,
    shadowColor: 'transparent',
    elevation: 0,
  },
  cartBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  cartBtnPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
});

export default BurgerOrderScreen;