import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { RestaurantClosedBanner } from '../components/RestaurantClosedBanner';
import { useRestaurantStatus } from '../contexts/RestaurantStatusContext';
import { Category as HomeCategory, Product as HomeProduct } from './redux/slices/homeSlice';
import { addItem, updateItemQuantity } from './redux/slices/orderSlice';
import { RootState } from './redux/store';
import ProductGrid from '../components/ProductGrid';
import { useScrollPosition } from '@/contexts/ScrollPositionContext';

const { width } = Dimensions.get('window');

interface Product extends HomeProduct { }
interface Category extends HomeCategory { }

interface AllProductsProps {
  userLanguage?: 'english' | 'arabic';
}

type FilterType = 'all' | 'popular' | 'normal';

const AllProductsPage: React.FC<AllProductsProps> = ({
  userLanguage = 'english',
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();

  // Modal visibility
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Restaurant settings from navigation
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);

  useEffect(() => {
    if (params.restaurantSettings) {
      try {
        const settings = JSON.parse(params.restaurantSettings as string);
        setRestaurantSettings(settings);
      } catch (error) {
        console.error('Failed to parse restaurant settings:', error);
      }
    }
  }, [params.restaurantSettings]);

  // Scroll restoration
  const { saveScrollPosition, getScrollPosition } = useScrollPosition();
  const flashListRef = useRef<React.ElementRef<typeof FlashList<Product>>>(null);
  const isProgrammaticScroll = useRef(false);
  const lastScrollPosition = useRef(0);

  const { isOpen: restaurantIsOpen } = useRestaurantStatus();
  const { products, categories, restaurant_name, loading } = useSelector(
    (state: RootState) => state.home
  );

  const [userId, setUserId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<FilterType>('all');
  const [cartQuantities, setCartQuantities] = useState<Record<number, number>>({});

  const cartItems = useSelector((state: RootState) => state.orders.items);

  // Update local quantities when cart changes
  useEffect(() => {
    const quantities: Record<number, number> = {};
    cartItems.forEach(item => {
      quantities[item.id] = item.quantity;
    });
    setCartQuantities(quantities);
  }, [cartItems]);

  // Category persistence
  const saveSelectedCategory = async (category: string | null) => {
    try {
      if (category) {
        await AsyncStorage.setItem('selectedCategoryAllProducts', category);
      } else {
        await AsyncStorage.setItem('selectedCategoryAllProducts', 'null');
      }
    } catch (error) {
      console.error("Failed to save selected category:", error);
    }
  };

  const loadSelectedCategory = async () => {
    try {
      const savedCategory = await AsyncStorage.getItem('selectedCategoryAllProducts');
      if (savedCategory && savedCategory !== 'null') {
        setSelectedCategory(savedCategory);
      }
    } catch (error) {
      console.error("Failed to load selected category:", error);
    }
  };

  useEffect(() => {
    const getUserId = async () => {
      try {
        const clientData = await AsyncStorage.getItem('client');
        if (clientData) {
          const client = JSON.parse(clientData);
          setUserId(client.id);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    const initializeData = async () => {
      await getUserId();
      await loadSelectedCategory();
    };

    initializeData();
  }, []);

  // ---------- FILTERED PRODUCTS ----------
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by popularity
    if (productFilter === 'popular') {
      filtered = filtered.filter((product) => product.is_popular === true);
    } else if (productFilter === 'normal') {
      filtered = filtered.filter((product) => product.is_popular !== true);
    }

    // Filter by category – make sure the property name matches your data!
    // If your product object uses `category` instead of `category_name`, change it below.
    if (selectedCategory !== null) {
      filtered = filtered.filter((product) => product.category_name === selectedCategory);
    }

    return filtered;
  }, [products, productFilter, selectedCategory]);
  // ---------------------------------------

  // Scroll handling
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }
    const y = event.nativeEvent.contentOffset.y;
    lastScrollPosition.current = y;
    saveScrollPosition('AllProducts', y);
  }, [saveScrollPosition]);

  const restoreScrollPosition = useCallback(() => {
    const savedPosition = getScrollPosition('AllProducts');
    if (savedPosition > 0 && flashListRef.current) {
      isProgrammaticScroll.current = true;
      flashListRef.current.scrollToOffset({
        offset: savedPosition,
        animated: false,
      });
    }
  }, [getScrollPosition]);

  // Restore scroll position on focus
  useFocusEffect(
    useCallback(() => {
      const loadSavedCategory = async () => {
        await loadSelectedCategory();
      };
      loadSavedCategory();

      const restoreWhenReady = () => {
        if (!loading && flashListRef.current && filteredProducts.length > 0) {
          restoreScrollPosition();
        } else {
          setTimeout(restoreWhenReady, 100);
        }
      };
      const timer = setTimeout(restoreWhenReady, 100);
      return () => clearTimeout(timer);
    }, [restoreScrollPosition, loading, filteredProducts.length])
  );

  // Actions
  const addToCart = useCallback((product: Product) => {
    if (!restaurantSettings?.is_open) {
      Toast.show({
        type: 'error',
        text1: userLanguage === 'arabic' ? 'المطعم مغلق' : 'Restaurant Closed',
        text2: userLanguage === 'arabic' ? 'المطعم مغلق حاليًا. يرجى المحاولة لاحقًا.' : "The restaurant is currently closed. Please try again later.",
        position: 'top',
        visibilityTime: 2000,
        text1Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
        text2Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
      });
      return;
    }
    const priceToUse = product.discount_applied && product.final_price !== undefined ? product.final_price :
      product.original_price || product.price;
    dispatch(
      addItem({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: priceToUse,
        quantity: 1,
        image: product.image || '',
        restaurant: restaurant_name,
        discount_applied: product.discount_applied || false,
        original_price: product.original_price || product.price,
        offer_info: product.offer_info,
      })
    );
    Toast.show({
      type: 'success',
      text1: userLanguage === 'arabic' ? 'تمت الإضافة للسلة' : 'Added to cart',
      text2: userLanguage === 'arabic' ? `${product.name} تمت إضافته!` : `${product.name} has been added!`,
      position: 'top',
      visibilityTime: 2000,
      text1Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
      text2Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
    });
  }, [restaurantSettings?.is_open, userLanguage, restaurant_name, dispatch]);

  const handleUpdateQuantity = useCallback((productId: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    dispatch(updateItemQuantity({ id: productId, quantity: newQuantity }));
  }, [dispatch]);

  const handlePressedProduct = useCallback((id: number) => {
    saveScrollPosition('AllProducts', lastScrollPosition.current);
    router.push({ pathname: '/ProductDetailsPage', params: { id: id.toString() } });
  }, [saveScrollPosition, router]);

  // Filter modal handlers
  const openFilterModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterModalVisible(true);
  }, []);

  const selectFilter = useCallback((filter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductFilter(filter);
    setFilterModalVisible(false);
  }, []);

  const openCategoryModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategoryModalVisible(true);
  }, []);

  const selectCategory = useCallback((categoryName: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(categoryName);
    saveSelectedCategory(categoryName);
    setCategoryModalVisible(false);
  }, []);

  // Display texts
  const getFilterDisplayText = useCallback(() => {
    switch (productFilter) {
      case 'popular': return userLanguage === 'arabic' ? 'الأكثر طلباً' : 'Popular';
      case 'normal': return userLanguage === 'arabic' ? 'عادي' : 'Regular';
      default: return userLanguage === 'arabic' ? 'كل المنتجات' : 'All Products';
    }
  }, [productFilter, userLanguage]);

  const getCategoryDisplayText = useCallback(() => {
    if (selectedCategory) return selectedCategory;
    return userLanguage === 'arabic' ? 'الكل' : 'All Categories';
  }, [selectedCategory, userLanguage]);

  const headerSubtitle = useMemo(() => {
    const base = userLanguage === 'arabic' ? `${filteredProducts.length} منتج متاح` : `${filteredProducts.length} items available`;
    const offersActive = userId && products.some(p => p.has_offer)
      ? (userLanguage === 'arabic' ? ' • عروض الأعضاء نشطة' : ` • Member Offers Active`)
      : '';
    const discountsApplied = userId && products.some(p => p.discount_applied)
      ? (userLanguage === 'arabic' ? ' • تم تطبيق الخصومات' : ` • Discounts Applied`)
      : '';
    return base + offersActive + discountsApplied;
  }, [filteredProducts.length, userId, products, userLanguage]);

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' ? { paddingTop: insets.top } : null]}>
      <View style={{ zIndex: 100 }}><Toast /></View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={userLanguage === 'english' ? styles.headerTitle : styles.headerTitleAr}>
            {userLanguage === 'arabic' ? 'جميع المنتجات' : 'All Products'}
          </Text>
          <Text style={userLanguage === 'english' ? styles.headerSubtitle : styles.headerSubtitleAr}>
            {headerSubtitle}
          </Text>
        </View>
      </View>

      {!restaurantIsOpen && (
        <RestaurantClosedBanner compact={false} showHoursButton={true} userLanguage="english" />
      )}

      {/* Filter Buttons */}
      <View style={styles.filterButtonsContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={openFilterModal} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={18} color={Colors.primary} />
          <Text style={styles.filterButtonText}>{getFilterDisplayText()}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={openCategoryModal} activeOpacity={0.7}>
          <Ionicons name="apps-outline" size={18} color={Colors.primary} />
          <Text style={styles.filterButtonText} numberOfLines={1}>{getCategoryDisplayText()}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent animationType="fade" onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { marginTop: Platform.OS === 'ios' ? insets.top + 120 : 140 }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{userLanguage === 'arabic' ? 'تصفية المنتجات' : 'Filter Products'}</Text>
                  <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                    <Ionicons name="close" size={24} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.modalOption, productFilter === 'all' && styles.modalOptionActive]} onPress={() => selectFilter('all')}>
                  <Ionicons name="grid-outline" size={20} color={productFilter === 'all' ? Colors.primary : Colors.text.secondary} />
                  <Text style={[styles.modalOptionText, productFilter === 'all' && styles.modalOptionTextActive]}>
                    {userLanguage === 'arabic' ? 'كل المنتجات' : 'All Products'}
                  </Text>
                  {productFilter === 'all' && <Ionicons name="checkmark" size={20} color={Colors.primary} style={styles.modalOptionCheck} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalOption, productFilter === 'popular' && styles.modalOptionActive]} onPress={() => selectFilter('popular')}>
                  <Ionicons name="flame" size={20} color={productFilter === 'popular' ? Colors.primary : Colors.warning} />
                  <Text style={[styles.modalOptionText, productFilter === 'popular' && styles.modalOptionTextActive]}>
                    {userLanguage === 'arabic' ? 'الأكثر طلباً' : 'Popular'}
                  </Text>
                  {productFilter === 'popular' && <Ionicons name="checkmark" size={20} color={Colors.primary} style={styles.modalOptionCheck} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalOption, productFilter === 'normal' && styles.modalOptionActive]} onPress={() => selectFilter('normal')}>
                  <Ionicons name="restaurant-outline" size={20} color={productFilter === 'normal' ? Colors.primary : Colors.text.secondary} />
                  <Text style={[styles.modalOptionText, productFilter === 'normal' && styles.modalOptionTextActive]}>
                    {userLanguage === 'arabic' ? 'عادي' : 'Regular'}
                  </Text>
                  {productFilter === 'normal' && <Ionicons name="checkmark" size={20} color={Colors.primary} style={styles.modalOptionCheck} />}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Category Modal */}
      <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setCategoryModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, styles.categoryModalContent, { marginTop: Platform.OS === 'ios' ? insets.top + 120 : 140 }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{userLanguage === 'arabic' ? 'اختر الفئة' : 'Select Category'}</Text>
                  <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                    <Ionicons name="close" size={24} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity style={[styles.modalOption, selectedCategory === null && styles.modalOptionActive]} onPress={() => selectCategory(null)}>
                    <Ionicons name="apps-outline" size={20} color={selectedCategory === null ? Colors.primary : Colors.text.secondary} />
                    <Text style={[styles.modalOptionText, selectedCategory === null && styles.modalOptionTextActive]}>
                      {userLanguage === 'arabic' ? 'الكل' : 'All Categories'}
                    </Text>
                    {selectedCategory === null && <Ionicons name="checkmark" size={20} color={Colors.primary} style={styles.modalOptionCheck} />}
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity key={category.id} style={[styles.modalOption, selectedCategory === category.name && styles.modalOptionActive]} onPress={() => selectCategory(category.name)}>
                      <Ionicons name="folder-outline" size={20} color={selectedCategory === category.name ? Colors.primary : Colors.text.secondary} />
                      <Text style={[styles.modalOptionText, selectedCategory === category.name && styles.modalOptionTextActive]} numberOfLines={1}>
                        {category.name}
                      </Text>
                      {selectedCategory === category.name && <Ionicons name="checkmark" size={20} color={Colors.primary} style={styles.modalOptionCheck} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 10, backgroundColor: Colors.primaryLight, }}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={Colors.text.secondary} />
              <Text style={styles.emptyStateText}>
                {userLanguage === 'arabic' ? 'لم يتم العثور على منتجات في هذا القسم' : 'No products found in this category'}
              </Text>
            </View>
          ) : (
            <ProductGrid
              products={filteredProducts}
              onProductPress={handlePressedProduct}
              onAddToCart={addToCart}
              onUpdateQuantity={handleUpdateQuantity}
              restaurantIsOpen={restaurantSettings?.is_open ?? true}
              userLanguage={userLanguage}
              // No favoritesMap or onToggleFavorite – each card handles its own state
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerTitleContainer: { flex: 1, gap: 0 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text.primary, flex: 1 },
  headerTitleAr: { fontSize: 18, fontWeight: '600', color: Colors.text.primary, textAlign: 'right' },
  headerSubtitle: { fontSize: 13, color: Colors.text.secondary, fontWeight: '500' },
  headerSubtitleAr: { fontSize: 13, color: Colors.text.secondary, fontWeight: '500', textAlign: 'right' },
  filterButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray[50],
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border + '60',
    gap: 8,
  },
  filterButtonText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyStateText: { fontSize: 16, color: Colors.text.secondary, marginTop: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-start', alignItems: 'center' },
  modalContent: {
    width: width * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  categoryModalContent: { maxHeight: 400 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: Colors.gray[50],
  },
  modalOptionActive: { backgroundColor: Colors.primary + '10', borderWidth: 1, borderColor: Colors.primary + '30' },
  modalOptionText: { flex: 1, fontSize: 16, fontWeight: '500', color: Colors.text.primary, marginLeft: 12 },
  modalOptionTextActive: { color: Colors.primary, fontWeight: '700' },
  modalOptionCheck: { marginLeft: 'auto' },
});

export default AllProductsPage;