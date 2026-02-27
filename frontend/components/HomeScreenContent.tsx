// components/HomeScreenContent.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import Slider from '@react-native-community/slider';

import Colors from '@/constants/Colors';
import { useRestaurantStatus } from '@/contexts/RestaurantStatusContext';
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';
import { useScrollPosition } from '@/contexts/ScrollPositionContext';
import { fetchHomePageData } from '@/app/redux/slices/homeSlice';
import { addItem, removeItem, updateItemQuantity } from '@/app/redux/slices/orderSlice';
import type { AppDispatch, RootState } from '@/app/redux/store';
import type { Product } from '@/app/redux/slices/homeSlice';

// Components
import CategoryItem from '@/components/CategoryItem';
import PopularProductCard from '@/components/PopularProductCard';
import ProductGrid from '@/components/ProductGrid';
import { RestaurantClosedBanner } from '@/components/RestaurantClosedBanner';
import CreativeSection from '@/app/specialOffers';
import { CategorySkeleton } from '@/components/ui/skeleton';
import { LiveActivityBar } from '@/app/LiveActivityBar';

const { width } = Dimensions.get('window');

// Translation helper
const t = (lang: 'english' | 'arabic' | 'french', key: {
  en: string;
  ar: string;
  fr: string;
}): string => {
  if (lang === 'arabic') return key.ar;
  if (lang === 'french') return key.fr;
  return key.en;
};

// Quick actions base
const QUICK_ACTIONS_BASE = [
  {
    id: 'menu',
    en: 'Menu',
    ar: 'القائمة',
    fr: 'Menu',
    icon: 'restaurant-outline',
    color: '#FFF8E1',
    iconColor: '#FFA726',
  },
  {
    id: 'fav',
    en: 'Favorites',
    ar: 'المفضلة',
    fr: 'Favoris',
    icon: 'heart-outline',
    color: '#FFE0E0',
    iconColor: '#F44336',
  },
  {
    id: 'offers',
    en: 'Promo codes',
    ar: 'العروض',
    fr: 'Codes promo',
    icon: 'pricetag-outline',
    color: '#E8F5E9',
    iconColor: '#4CAF50',
  },
  {
    id: 'track',
    en: 'Track',
    ar: 'التتبع',
    fr: 'Suivi',
    icon: 'location-outline',
    color: '#E3F2FD',
    iconColor: '#2196F3',
  },
];

interface RestaurantSettings {
  is_open: boolean;
  restaurant_logo: string;
  restaurant_home_screen_icon: string;
  restaurant_name: string;
}

interface HomeScreenContentProps {
  userLanguage?: 'english' | 'arabic' | 'french'; // kept as fallback
}

export default function HomeScreenContent({ userLanguage = 'english' }: HomeScreenContentProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { isOpen: restaurantIsOpen, refreshStatus: refreshRestaurantStatus } = useRestaurantStatus();
  const { unreadCount } = useWebSocketNotifications();
  const { saveScrollPosition, getScrollPosition } = useScrollPosition();

  const {
    categories,
    products,
    offers,
    restaurant_name,
    loading: storeLoading,
  } = useSelector((state: RootState) => state.home);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterProductsModal, setFilterProductsModal] = useState(false);
  const [sliderValue, setSliderValue] = useState(500);
  const [bestForValue, setBestForValue] = useState('');
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [newOrderData, setNewOrderData] = useState<{ orderId: number; orderNumber: string } | null>(null);
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    is_open: true,
    restaurant_logo: '',
    restaurant_home_screen_icon: '',
    restaurant_name: '',
  });

  // Language state – self-managed from AsyncStorage
  const [language, setLanguage] = useState<'english' | 'arabic' | 'french'>(userLanguage);
  const [loadingLang, setLoadingLang] = useState(true);
  const isRTL = language === 'arabic';

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

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const isProgrammaticScroll = useRef(false);
  const lastScrollPosition = useRef(0);
  const hasLoaded = useRef(false);

  // Memoized quick actions with language
  const quickActions = useMemo(() => {
    return QUICK_ACTIONS_BASE.map((action) => ({
      ...action,
      label: t(language, { en: action.en, ar: action.ar, fr: action.fr }),
    }));
  }, [language]);

  // Header opacity based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  // Scroll handling
  const handleScroll = useCallback(
    (event: any) => {
      if (isProgrammaticScroll.current) {
        isProgrammaticScroll.current = false;
        return;
      }
      const y = event.nativeEvent.contentOffset.y;
      lastScrollPosition.current = y;
      saveScrollPosition('Home', y);
    },
    [saveScrollPosition]
  );

  const restoreScrollPosition = useCallback(() => {
    const savedPosition = getScrollPosition('Home');
    if (savedPosition > 0 && scrollViewRef.current) {
      isProgrammaticScroll.current = true;
      scrollViewRef.current.scrollTo({ y: savedPosition, animated: false });
    }
  }, [getScrollPosition]);

  // Load saved category on focus
  useEffect(() => {
    const loadSavedCategory = async () => {
      try {
        const savedCategory = await AsyncStorage.getItem('selectedCategory');
        if (savedCategory) {
          setSelectedCategory(savedCategory);
        } else {
          const defaultCategory = t(language, { en: 'All', ar: 'الكل', fr: 'Tous' });
          setSelectedCategory(defaultCategory);
          await AsyncStorage.setItem('selectedCategory', defaultCategory);
        }
      } catch (error) {
        console.error('Failed to load selected category:', error);
      }
    };
    loadSavedCategory();
    const timer = setTimeout(restoreScrollPosition, 50);
    return () => clearTimeout(timer);
  }, [language, restoreScrollPosition]);

  // Check for new order (modal)
  useEffect(() => {
    const checkNewOrder = async () => {
      try {
        const newOrderStr = await AsyncStorage.getItem('newOrderId');
        if (newOrderStr) {
          const orderData = JSON.parse(newOrderStr);
          setNewOrderData(orderData);
          modalSlideAnim.setValue(width * 0.85);
          setShowThankYouModal(true);
          setTimeout(() => {
            Animated.spring(modalSlideAnim, {
              toValue: 0,
              tension: 50,
              friction: 8,
              useNativeDriver: true,
            }).start();
          }, 100);
          await AsyncStorage.removeItem('newOrderId');
        }
      } catch (error) {
        console.error('Error checking new order:', error);
      }
    };
    const timer = setTimeout(checkNewOrder, 800);
    return () => clearTimeout(timer);
  }, []);

  // Fetch user address from storage
  const fetchUserAddress = useCallback(async () => {
    try {
      const clientData = await AsyncStorage.getItem('client');
      if (clientData) {
        const client = JSON.parse(clientData);
        setUserAddress(client.adresses || '');
        setUserName(client.name || '');
        if (client.image) {
          const imageUrl = client.image.startsWith('http') || client.image.startsWith('file://')
            ? client.image
            : `https://haba-haba-api.ubua.cloud/uploads/profileImages/${client.image}`;
          setUserImage(imageUrl);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user address:', error);
    }
  }, []);

  // Fetch restaurant settings
  const fetchRestaurantSettings = useCallback(async () => {
    try {
      const response = await axios.get('https://haba-haba-api.ubua.cloud/api/auth/restaurant-settings');
      if (response.data.success && response.data.settings) {
        setRestaurantSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch restaurant settings:', error);
    }
  }, []);

  // Save selected category
  const saveSelectedCategory = useCallback(async (category: string) => {
    try {
      await AsyncStorage.setItem('selectedCategory', category);
      setSelectedCategory(category);
    } catch (error) {
      console.error('Failed to save selected category:', error);
    }
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchHomePageData()),
        fetchUserAddress(),
        fetchRestaurantSettings(),
        refreshRestaurantStatus(),
      ]);
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, fetchUserAddress, fetchRestaurantSettings, refreshRestaurantStatus]);

  // Filtered products (memoized)
  const filteredProducts = useMemo(() => {
    let filtered = products;
    const allLabel = t(language, { en: 'All', ar: 'الكل', fr: 'Tous' });
    if (selectedCategory !== allLabel && selectedCategory !== '') {
      filtered = filtered.filter((pro: Product) => {
        const category = pro.category_name ? String(pro.category_name) : '';
        return category === selectedCategory;
      });
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (pro: Product) =>
          pro.name?.toLowerCase().includes(query) ||
          pro.description?.toLowerCase().includes(query)
      );
    }
    if (sliderValue < 500) {
      filtered = filtered.filter((pro: Product) => {
        const price = parseFloat(String(pro.price));
        return !isNaN(price) && price <= sliderValue;
      });
    }
    if (bestForValue) {
      filtered = filtered.filter((pro: Product) => {
        const productBestFor = pro.best_for ? String(pro.best_for).toLowerCase().trim() : '';
        return productBestFor === bestForValue.toLowerCase().trim();
      });
    }
    return filtered;
  }, [selectedCategory, products, searchQuery, sliderValue, bestForValue, language]);

  // Popular products (memoized)
  const popularProducts = useMemo(() => {
    return filteredProducts.filter((product: Product) => product.is_popular === true);
  }, [filteredProducts]);

  // Add to cart
  const addToCart = useCallback(
    (product: Product) => {
      if (!restaurantSettings.is_open) {
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
      const priceToUse = product.discount_applied ? product.final_price! : product.original_price || product.price;
      dispatch(
        addItem({
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: priceToUse,
          quantity: 1,
          image: product.image || '',
          restaurant: restaurant_name,
          discount_applied: product.discount_applied,
          original_price: product.original_price || product.price,
          offer_info: product.offer_info,
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
    },
    [dispatch, restaurantSettings.is_open, restaurant_name, language, isRTL]
  );

  // Handle product press
  const handleProductPress = useCallback((id: number) => {
    saveScrollPosition('Home', lastScrollPosition.current);
    router.push({
      pathname: '/ProductDetailsPage',
      params: { id: id.toString() }
    });
  }, [router, saveScrollPosition]);

  // Handle update quantity
  const handleUpdateQuantity = useCallback(
    (id: number, quantity: number) => {
      if (!restaurantSettings.is_open) {
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

      if (quantity === 0) {
        dispatch(removeItem(id));
        Toast.show({
          type: 'success',
          text1: t(language, { en: 'Removed', ar: 'تمت الإزالة', fr: 'Supprimé' }),
          text2: t(language, { en: 'Item removed from cart', ar: 'تمت إزالة المنتج من السلة', fr: 'Article retiré du panier' }),
          position: 'top',
          visibilityTime: 2000,
        });
      } else {
        dispatch(updateItemQuantity({ id, quantity }));
        Toast.show({
          type: 'success',
          text1: t(language, { en: 'Updated', ar: 'تم التحديث', fr: 'Mis à jour' }),
          text2: t(language, { en: 'Quantity updated', ar: 'تم تحديث الكمية', fr: 'Quantité mise à jour' }),
          position: 'top',
          visibilityTime: 2000,
        });
      }
    },
    [dispatch, restaurantSettings.is_open, language, isRTL]
  );

  // Modal handlers
  const handleCloseThankYouModal = useCallback(() => {
    Animated.timing(modalSlideAnim, {
      toValue: width * 0.85,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowThankYouModal(false);
      setNewOrderData(null);
    });
  }, []);

  const handleSeeOrder = useCallback(() => {
    handleCloseThankYouModal();
    setTimeout(() => {
      router.push('/orders');
    }, 300);
  }, [handleCloseThankYouModal, router]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      try {
        const hasData = categories.length > 0 || products.length > 0;
        await Promise.all([
          fetchUserAddress(),
          fetchRestaurantSettings(),
          !hasData ? dispatch(fetchHomePageData()) : Promise.resolve(),
        ]);
      } catch (error) {
        console.error('Error in loadData:', error);
      }
    };
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadData();
    }
  }, []);

  // Update "All" category when language changes
  useEffect(() => {
    const defaultAllCategory = t(language, { en: 'All', ar: 'الكل', fr: 'Tous' });
    if (selectedCategory === 'All' || selectedCategory === 'الكل' || selectedCategory === 'Tous') {
      setSelectedCategory(defaultAllCategory);
      saveSelectedCategory(defaultAllCategory);
    }
  }, [language, selectedCategory, saveSelectedCategory]);

  // Helper for category subtitle
  const getCategorySubtitle = useCallback(
    (count: number) => {
      return t(language, {
        en: `${count} delicious option${count !== 1 ? 's' : ''}`,
        ar: count === 0 || count === 1 ? `${count} خيار لذيذ` : count === 2 ? 'خياران لذيدان' : `${count} خيارات لذيذة`,
        fr: `${count} option${count !== 1 ? 's' : ''} délicieuse${count !== 1 ? 's' : ''}`,
      });
    },
    [language]
  );

  const isLoading = storeLoading || loadingLang;

  // Header container style
  const headerContainerStyle = useMemo(() => ({
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: Platform.OS === 'android' ? insets.top : 0,
  }), [insets.top]);

  // JSX
  return (
    <View style={[styles.container]}>
      {/* Status Bar */}
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {/* Filter Modal - Redesigned */}
      <Modal
        visible={filterProductsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterProductsModal(false)}
      >
        <View style={filterModalStyles.modalOverlay}>
          <View style={filterModalStyles.modalContent}>
            <View style={[filterModalStyles.modalHeader, isRTL && filterModalStyles.modalHeaderAr]}>
              <Text style={[filterModalStyles.modalTitle, isRTL && filterModalStyles.modalTitleAr]}>
                {t(language, { en: 'Filter Options', ar: 'خيارات الترشيح', fr: 'Options de filtre' })}
              </Text>
              <TouchableOpacity onPress={() => setFilterProductsModal(false)} style={filterModalStyles.closeButton}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={filterModalStyles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Price Filter */}
              <View style={filterModalStyles.section}>
                <View style={[filterModalStyles.sectionHeader, isRTL && filterModalStyles.sectionHeaderAr]}>
                  <Text style={[filterModalStyles.sectionTitle, isRTL && filterModalStyles.sectionTitleAr]}>
                    {t(language, { en: 'Price Range', ar: 'نطاق السعر', fr: 'Gamme de prix' })}
                  </Text>
                </View>
                <View style={filterModalStyles.priceRangeContainer}>
                  <Slider
                    style={filterModalStyles.slider}
                    minimumValue={0}
                    maximumValue={500}
                    step={10}
                    value={sliderValue}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor="#E5E7EB"
                    thumbTintColor={Colors.primary}
                    onValueChange={setSliderValue}
                  />
                  <View style={[filterModalStyles.priceLabels, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={filterModalStyles.priceLabel}>
                      0 {t(language, { en: 'MAD', ar: 'درهم', fr: 'MAD' })}
                    </Text>
                    <Text style={filterModalStyles.priceLabel}>
                      500 {t(language, { en: 'MAD', ar: 'درهم', fr: 'MAD' })}
                    </Text>
                  </View>
                  <View style={[filterModalStyles.currentPriceContainer, isRTL && filterModalStyles.currentPriceContainerAr]}>
                    <Text style={[filterModalStyles.currentPriceLabel, isRTL && filterModalStyles.currentPriceLabelAr]}>
                      {t(language, { en: 'Selected:', ar: 'المختار:', fr: 'Sélectionné:' })}
                    </Text>
                    <View style={filterModalStyles.currentPriceBadge}>
                      <Text style={[filterModalStyles.currentPriceText, isRTL && filterModalStyles.currentPriceTextAr]}>
                        {sliderValue} {t(language, { en: 'MAD', ar: 'درهم', fr: 'MAD' })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Best For Section */}
              <View style={filterModalStyles.section}>
                <View style={[filterModalStyles.sectionHeader, isRTL && filterModalStyles.sectionHeaderAr]}>
                  <Text style={[filterModalStyles.sectionTitle, isRTL && filterModalStyles.sectionTitleAr]}>
                    {t(language, { en: 'Best For', ar: 'الأفضل لـ', fr: 'Idéal pour' })}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[filterModalStyles.bestForScrollContent, isRTL && filterModalStyles.bestForScrollContentAr]}
                >
                  {['snacks', 'dinner', 'lunch', 'breakfast'].map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setBestForValue(bestForValue === item ? '' : item)}
                      style={[filterModalStyles.bestForCard, bestForValue === item && filterModalStyles.selectedCard]}
                    >
                      <View style={[filterModalStyles.bestForCardContent, bestForValue === item && filterModalStyles.selectedCardContent]}>
                        <View style={[filterModalStyles.bestForIconContainer, bestForValue === item && filterModalStyles.selectedIconContainer]}>
                          <Ionicons
                            name={item === 'snacks' ? 'fast-food' : item === 'dinner' ? 'moon' : item === 'lunch' ? 'restaurant' : 'sunny'}
                            size={24}
                            color={bestForValue === item ? '#FFFFFF' : (item === 'snacks' ? '#6366F1' : item === 'dinner' ? '#DC2626' : item === 'lunch' ? '#059669' : '#D97706')}
                          />
                        </View>
                        <Text style={[filterModalStyles.bestForText, bestForValue === item && filterModalStyles.selectedText, isRTL && filterModalStyles.bestForTextAr]}>
                          {t(language, {
                            en: item.charAt(0).toUpperCase() + item.slice(1),
                            ar: item === 'snacks' ? 'الوجبات الخفيفة' : item === 'dinner' ? 'العشاء' : item === 'lunch' ? 'الغداء' : 'الفطور',
                            fr: item === 'snacks' ? 'Snacks' : item === 'dinner' ? 'Dîner' : item === 'lunch' ? 'Déjeuner' : 'Petit-déjeuner',
                          })}
                        </Text>
                        <Text style={[filterModalStyles.bestForSubtext, bestForValue === item && filterModalStyles.selectedSubtext, isRTL && filterModalStyles.bestForSubtextAr]}>
                          {item === 'snacks' ? (t(language, { en: 'Anytime', ar: 'في أي وقت', fr: 'À tout moment' })) : item === 'dinner' ? '4PM - 10PM' : item === 'lunch' ? '11AM - 4PM' : '6AM - 11AM'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={[filterModalStyles.modalFooter, isRTL && filterModalStyles.modalFooterAr]}>
              <TouchableOpacity
                style={[filterModalStyles.actionButton, filterModalStyles.resetButton]}
                onPress={() => {
                  setBestForValue('');
                  setSliderValue(250);
                }}
              >
                <Text style={[filterModalStyles.resetButtonText, isRTL && filterModalStyles.resetButtonTextAr]}>
                  {t(language, { en: 'Reset All', ar: 'إعادة تعيين الكل', fr: 'Réinitialiser' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[filterModalStyles.actionButton, filterModalStyles.applyButton]}
                onPress={() => setFilterProductsModal(false)}
              >
                <Text style={[filterModalStyles.applyButtonText, isRTL && filterModalStyles.applyButtonTextAr]}>
                  {t(language, { en: 'Apply Filters', ar: 'تطبيق الترشيح', fr: 'Appliquer' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Thank You Modal */}
      <Modal visible={showThankYouModal} transparent animationType="none" onRequestClose={handleCloseThankYouModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleCloseThankYouModal}>
          <Animated.View style={[styles.thankYouModal, { transform: [{ translateX: modalSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <LinearGradient colors={[Colors.primary, Colors.primary + 'EE']} style={styles.thankYouModalContent}>
                <View style={styles.thankYouIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#FFFFFF" />
                </View>
                <Text style={[styles.thankYouTitle, isRTL && styles.thankYouTitleAr]}>
                  {t(language, { en: 'Thank You! 🎉', ar: 'شكراً لك! 🎉', fr: 'Merci ! 🎉' })}
                </Text>
                <Text style={[styles.thankYouMessage, isRTL && styles.thankYouMessageAr]}>
                  {t(language, { en: 'Your order has been placed successfully!', ar: 'تم تقديم طلبك بنجاح!', fr: 'Votre commande a été passée avec succès !' })}
                </Text>
                {newOrderData && (
                  <Text style={[styles.thankYouOrderNumber, isRTL && styles.thankYouOrderNumberAr]}>
                    {t(language, { en: `Order #${newOrderData.orderNumber}`, ar: `طلب #${newOrderData.orderNumber}`, fr: `Commande #${newOrderData.orderNumber}` })}
                  </Text>
                )}
                <Text style={[styles.thankYouSubtext, isRTL && styles.thankYouSubtextAr]}>
                  {t(language, { en: "We're preparing your delicious meal right now!", ar: 'نحن نقوم بتحضير وجبتك اللذيذة الآن!', fr: "Nous préparons votre délicieux repas maintenant !" })}
                </Text>
                <TouchableOpacity style={styles.seeOrderButton} onPress={handleSeeOrder} activeOpacity={0.8}>
                  <LinearGradient colors={['#FFFFFF', '#F8F9FA']} style={[styles.seeOrderButtonGradient, isRTL && styles.seeOrderButtonGradientAr]}>
                    {isRTL ? (
                      <>
                        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                        <Text style={[styles.seeOrderButtonText, styles.seeOrderButtonTextAr]}>
                          {t(language, { en: 'See Your Order', ar: 'عرض طلبك', fr: 'Voir votre commande' })}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.seeOrderButtonText}>
                          {t(language, { en: 'See Your Order', ar: 'عرض طلبك', fr: 'Voir votre commande' })}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeModalButton} onPress={handleCloseThankYouModal}>
                  <Text style={[styles.closeModalText, isRTL && styles.closeModalTextAr]}>
                    {t(language, { en: 'Continue Shopping', ar: 'متابعة التسوق', fr: 'Continuer les achats' })}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Main ScrollView */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
          listener: handleScroll,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          const savedPosition = getScrollPosition('Home');
          if (savedPosition > 0 && !isLoading) {
            requestAnimationFrame(() => {
              isProgrammaticScroll.current = true;
              scrollViewRef.current?.scrollTo({ y: savedPosition, animated: false });
            });
          }
        }}
      >
        {/* Header - Redesigned */}
        <Animated.View style={[{ opacity: headerOpacity }, headerContainerStyle]}>
          <View style={[simpleHeaderStyles.header, { paddingHorizontal: 16, paddingBottom: 16 }]}>
            {/* Top Row - Brand and Profile */}
            <View style={[simpleHeaderStyles.topRow, isRTL && simpleHeaderStyles.topRowRtl]}>
              {/* Brand with bordered logo */}
              <View style={[simpleHeaderStyles.brandSection, isRTL && simpleHeaderStyles.brandSectionRtl]}>
                <View style={simpleHeaderStyles.logoWrapper}>
                  {restaurantSettings.restaurant_logo ? (
                    <Image
                      source={{
                        uri: `https://haba-haba-api.ubua.cloud/${restaurantSettings.restaurant_logo.replace(/\\/g, '/')}`,
                      }}
                      style={simpleHeaderStyles.logoImage}
                    />
                  ) : (
                    <Text style={simpleHeaderStyles.logoText}>🌵</Text>
                  )}
                </View>
                <Text style={simpleHeaderStyles.brandName}>
                  {restaurantSettings?.restaurant_name?.split(' ')[0] || 'Sahara'}
                </Text>
              </View>

              {/* Profile with border */}
              <TouchableOpacity
                style={simpleHeaderStyles.profileSection}
                onPress={() => router.push('/profile')}
              >
                {userImage ? (
                  <Image source={{ uri: userImage }} style={simpleHeaderStyles.profileImage} />
                ) : (
                  <View style={simpleHeaderStyles.profilePlaceholder}>
                    <Ionicons name="person-outline" size={20} color="#FFFFFF" />
                  </View>
                )}
                {unreadCount > 0 && (
                  <View style={[simpleHeaderStyles.notificationDot, isRTL && simpleHeaderStyles.notificationDotRtl]} />
                )}
              </TouchableOpacity>
            </View>

            {/* Welcome - Single line with name */}
            <View style={[simpleHeaderStyles.welcomeRow, isRTL && simpleHeaderStyles.welcomeRowRtl]}>
              <Text style={simpleHeaderStyles.welcomeText}>
                {isRTL
                  ? (() => {
                      const hour = new Date().getHours();
                      if (hour < 12) return 'صباح الخير';
                      if (hour < 18) return 'مساء الخير';
                      return 'مساء الخير';
                    })()
                  : language === 'french'
                  ? (() => {
                      const hour = new Date().getHours();
                      if (hour < 12) return 'Bonjour';
                      if (hour < 18) return 'Bon après-midi';
                      return 'Bonsoir';
                    })()
                  : (() => {
                      const hour = new Date().getHours();
                      if (hour < 12) return 'Good morning';
                      if (hour < 18) return 'Good afternoon';
                      return 'Good evening';
                    })()},
              </Text>
              <Text style={simpleHeaderStyles.userName}>
                {userName ? userName : t(language, { en: 'Guest', ar: 'ضيف', fr: 'Invité' })}
              </Text>
            </View>

            {/* Full Address - Always visible */}
            <View style={[simpleHeaderStyles.addressContainer, isRTL && simpleHeaderStyles.addressContainerRtl]}>
              <Ionicons name="location-outline" size={14} color="#FFFFFF" />
              <Text style={simpleHeaderStyles.addressText} numberOfLines={1}>
                {userAddress || t(language, { en: 'Laayoune, Moroccan Sahara', ar: 'العيون، الصحراء المغربية', fr: 'Laâyoune, Sahara marocain' })}
              </Text>
            </View>

            {/* Search - Taller with filter icon on the right */}
            <View style={[simpleHeaderStyles.searchContainer, isRTL && simpleHeaderStyles.searchContainerRtl]}>
              <Ionicons
                name="search-outline"
                size={20}
                color="#FFFFFF"
                style={isRTL ? simpleHeaderStyles.searchIconRtl : simpleHeaderStyles.searchIcon}
              />
              <TextInput
                style={[simpleHeaderStyles.searchInput, isRTL && simpleHeaderStyles.searchInputRtl]}
                placeholder={t(language, { en: 'Search', ar: 'بحث', fr: 'Rechercher' })}
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                style={[simpleHeaderStyles.filterButton, isRTL && simpleHeaderStyles.filterButtonRtl]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilterProductsModal(true);
                }}
              >
                <Ionicons name="options-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Subtle decorative line */}
            <View style={[simpleHeaderStyles.decorativeLine, isRTL && simpleHeaderStyles.decorativeLineRtl]} />
          </View>
        </Animated.View>

        <LiveActivityBar/>
        {/* Restaurant Closed Banner */}
        {!restaurantIsOpen && <RestaurantClosedBanner showHoursButton userLanguage={language} />}

        {/* Offers Section */}
        {offers && offers.length > 0 && <CreativeSection offers={offers as any} userLanguage={language} />}

        {/* Quick Actions */}
        <Animated.View style={isRTL ? quickActionStyles.containerAr : quickActionStyles.container}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={quickActionStyles.scrollContent}
          >
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={quickActionStyles.button}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (action.id === 'menu') {
                    router.push({
                      pathname: '/allProducts',
                      params: { restaurantSettings: JSON.stringify(restaurantSettings) }
                    });
                  } else if (action.id === 'offers') {
                    router.push('/Offers');
                  } else if (action.id === 'fav') {
                    router.push('/favoriteScreen');
                  } else if (action.id === 'track') {
                    router.push('/trackMyOrders');
                  }
                }}
              >
                <Ionicons name={action.icon as any} size={15} color={action.iconColor} />
                <Text style={quickActionStyles.label}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Categories Section */}
        <View style={styles.creativeSection}>
          {/* Category Carousel */}
          <View style={styles.categoryCarouselContainer}>
            <View style={[styles.categorySectionHeader, isRTL && styles.categorySectionHeaderAr]}>
              <Text style={styles.categorySectionTitle}>
                {t(language, { en: 'Explore Categories', ar: 'تعرّف على الفئات', fr: 'Explorer les catégories' })}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}
              style={styles.categoryScrollView}
            >
              {isLoading
                ? [...Array(5)].map((_, idx) => (
                    <View key={idx} style={[styles.categoryItem, idx === 0 && styles.categoryItemFirst]}>
                      <View style={styles.categoryImageWrapperSkeleton}>
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0', borderRadius: 12 }} />
                      </View>
                      <View style={{ width: '60%', height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginTop: 8, alignSelf: 'center' }} />
                      <View style={{ width: '30%', height: 12, backgroundColor: '#e0e0e0', borderRadius: 4, marginTop: 4, alignSelf: 'center' }} />
                    </View>
                  ))
                : categories.map((cat, index) => {
                    const isSelected = selectedCategory === cat.name;
                    const itemCount = products.filter((item) => item.category_name === cat.name).length;
                    return (
                      <CategoryItem
                        key={cat.id}
                        category={cat}
                        isSelected={isSelected}
                        onPress={(categoryName) => saveSelectedCategory(categoryName)}
                        itemCount={itemCount}
                        index={index}
                        userLanguage={language}
                      />
                    );
                  })}
            </ScrollView>
          </View>
        </View>

        {/* Popular Products Section */}
        {popularProducts.length > 0 && (
          <View style={styles.creativeSection}>
            <View style={[styles.creativeSectionHeader, isRTL && styles.creativeSectionHeaderAr]}>
              <View>
                <View style={[styles.popularSectionTitleRow, isRTL && styles.popularSectionTitleRowAr]}>
                  <Ionicons name="flame" size={20} color={Colors.warning} />
                  <Text style={styles.creativeSectionTitle}>
                    {t(language, { en: 'Popular Items', ar: 'الأكثر طلباً', fr: 'Articles populaires' })}
                  </Text>
                </View>
                <Text style={[styles.creativeSectionSubtitle, isRTL && styles.creativeSectionSubtitleAr]}>
                  {t(language, {
                    en: `${popularProducts.length} ${popularProducts.length === 1 ? 'item' : 'items'} most loved by customers`,
                    ar: `${popularProducts.length} ${popularProducts.length === 1 ? 'منتج' : 'منتجات'} الأكثر حباً من العملاء`,
                    fr: `${popularProducts.length} article${popularProducts.length !== 1 ? 's' : ''} les plus apprécié${popularProducts.length !== 1 ? 's' : ''} par les clients`,
                  })}
                </Text>
              </View>
              <View style={styles.popularCountBadge}>
                <Ionicons name="star" size={14} color={Colors.warning} />
                <Text style={styles.popularCountText}>{popularProducts.length}</Text>
              </View>
            </View>

            {isLoading ? (
              <View style={stylesPopular.popularItemsContainer}>
                {[...Array(3)].map((_, idx) => (
                  <View key={idx} style={stylesPopular.fullWidthCard}>
                    <View style={stylesPopular.imageSection}>
                      <View style={[stylesPopular.imageContainer, { backgroundColor: '#f0f0f0' }]}>
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#e0e0e0' }} />
                      </View>
                    </View>
                    <View style={stylesPopular.contentSection}>
                      <View style={stylesPopular.productHeader}>
                        <View style={{ width: '60%', height: 20, backgroundColor: '#e0e0e0', borderRadius: 6, marginBottom: 8 }} />
                      </View>
                      <View style={{ width: '90%', height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 6 }} />
                      <View style={stylesPopular.productMeta}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 40, height: 14, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                          <View style={{ width: 50, height: 14, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                        </View>
                      </View>
                      <View style={stylesPopular.productFooter}>
                        <View style={{ width: 80, height: 24, backgroundColor: '#e0e0e0', borderRadius: 8 }} />
                        <View style={{ width: 35, height: 35, backgroundColor: '#e0e0e0', borderRadius: 18, marginLeft: 12 }} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={stylesPopular.popularItemsContainer}>
                {popularProducts.slice(0, 4).map((item) => (
                  <PopularProductCard
                    key={item.id}
                    product={item}
                    onPress={handleProductPress}
                    onAddToCart={addToCart}
                    onUpdateQuantity={handleUpdateQuantity}
                    restaurantIsOpen={restaurantSettings.is_open}
                    userLanguage={language}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* All Items Section */}
        <View style={styles.creativeSection}>
          <View style={[styles.creativeSectionHeader, isRTL && styles.creativeSectionHeaderAr]}>
            <View>
              <Text style={[styles.creativeSectionTitle, isRTL && styles.creativeSectionTitleAr]}>
                {t(language, { en: 'All Items', ar: 'جميع المنتجات', fr: 'Tous les articles' })}
              </Text>
              <Text style={[styles.creativeSectionSubtitle, isRTL && styles.creativeSectionSubtitleAr]}>
                {t(language, {
                  en: `${filteredProducts.length || 0} item${filteredProducts.length !== 1 ? 's' : ''} available`,
                  ar: `${filteredProducts.length || 0} ${filteredProducts.length === 1 ? 'منتج متاح' : 'منتجات متاحة'}`,
                  fr: `${filteredProducts.length || 0} article${filteredProducts.length !== 1 ? 's' : ''} disponible${filteredProducts.length !== 1 ? 's' : ''}`,
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.viewAllButton, isRTL && styles.viewAllButtonAr]}
              onPress={() => router.push('/allProducts')}
            >
              <Text style={styles.viewAllButtonText}>
                {t(language, { en: 'View All', ar: 'عرض الكل', fr: 'Voir tout' })}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.primary}
                style={isRTL && { transform: [{ scaleX: -1 }] }}
              />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.creativeItemsGrid}>
              {[...Array(6)].map((_, idx) => (
                <View key={idx} style={styles.productCard}>
                  <View style={styles.imageWrapper}>
                    <View style={[styles.imageContainer, { backgroundColor: '#f0f0f0' }]}>
                      <View style={{ width: '100%', height: '100%', backgroundColor: '#e0e0e0', opacity: 0.5 }} />
                    </View>
                  </View>
                  <View style={styles.productDetails}>
                    <View style={styles.productHeader}>
                      <View style={{ width: '70%', height: 16, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 8 }} />
                    </View>
                    <View style={{ width: '90%', height: 12, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 4 }} />
                    <View style={{ width: '60%', height: 12, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 12 }} />
                    <View style={styles.productMeta}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 30, height: 12, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                        <View style={{ width: 40, height: 12, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                      </View>
                    </View>
                    <View style={styles.productFooter}>
                      <View style={{ width: 70, height: 20, backgroundColor: '#e0e0e0', borderRadius: 6 }} />
                      <View style={{ width: 36, height: 36, backgroundColor: '#e0e0e0', borderRadius: 18, marginLeft: 12 }} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color={Colors.gray[400]} />
              <Text style={[styles.emptyTitle, isRTL && { textAlign: 'right' }]}>
                {t(language, { en: 'No items found', ar: 'لم يتم العثور على منتجات', fr: 'Aucun article trouvé' })}
              </Text>
              <Text style={[styles.emptySubtitle, isRTL && { textAlign: 'right' }]}>
                {searchQuery
                  ? t(language, { en: 'Try a different search term', ar: 'جرب مصطلح بحث مختلف', fr: 'Essayez un autre terme de recherche' })
                  : t(language, { en: 'No products in this category', ar: 'لا توجد منتجات في هذا القسم', fr: 'Aucun produit dans cette catégorie' })}
              </Text>
            </View>
          ) : (
            <>
              <ProductGrid
                products={filteredProducts.filter(product => !product.is_popular).slice(0, 20)}
                onProductPress={handleProductPress}
                onAddToCart={addToCart}
                onUpdateQuantity={handleUpdateQuantity}
                restaurantIsOpen={restaurantSettings.is_open}
                userLanguage={language}
              />
              {filteredProducts.length > 20 && (
                <View style={styles.seeMoreContainer}>
                  <TouchableOpacity style={styles.seeMoreButton} onPress={() => router.push('/allProducts')} activeOpacity={0.8}>
                    <Text style={styles.seeMoreButtonText}>
                      {t(language, { en: 'See More', ar: 'عرض المزيد', fr: 'Voir plus' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ========== STYLES (mostly unchanged, but filter modal redesigned) ==========

const stylesPopular = StyleSheet.create({
  popularItemsContainer: {
    paddingBottom: 16,
  },
  fullWidthCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageSection: {
    width: 140,
    height: 140,
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
    gap: 4,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  promoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  promoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  contentSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  productHeader: {
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  productDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryText: {
    fontSize: 12,
    color: '#6B7280',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  discountAddButton: {},
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    backgroundColor: 'transparent',
  },
  floatingHeaderContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  creativeHeader: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  headerContent: {
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  defaultRestaurantIcon: {
    marginRight: 0,
  },
  creativeHeaderTitle: {
    fontSize: 30,
    fontWeight: '900',
    fontFamily: 'ScheherazadeNew',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  motivationalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  motivationalText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    flex: 1,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  addressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    flex: 1,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  creativeProfileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCircleGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingSearchContainer: {
    marginTop: 16,
  },
  searchBarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchIcon: {
    marginRight: 0,
  },
  creativeSearchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  creativeFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creativeQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  creativeQuickActionsAr: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  creativeQuickActionItem: {
    flex: 1,
  },
  quickActionCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  creativeQuickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creativeQuickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: 2,
  },
  creativeSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  creativeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  creativeSectionHeaderAr: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  creativeSectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -0.8,
    marginBottom: 4,
    textAlign: 'left',
  },
  creativeSectionTitleAr: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -0.8,
    marginBottom: 4,
    textAlign: 'right',
  },
  creativeSectionSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  creativeSectionSubtitleAr: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
    textAlign: 'right',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllButtonAr: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  viewAllButtonText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  categoryScroll: {
    marginBottom: 20,
    paddingVertical: 3,
  },
  categoryPillBase: {
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    height: 40,
  },
  categoryPillActiveBase: {
    borderColor: Colors.primary,
  },
  categoryPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: '100%',
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryCarouselContainer: {
    marginBottom: 20,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categorySectionHeaderAr: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categorySectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  categoryScrollView: {},
  categoryScrollContent: {
    paddingRight: 16,
    gap: 16,
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryItemFirst: {
    marginLeft: 0,
  },
  categoryImageWrapperSkeleton: {
    width: 90,
    height: 90,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  popularSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  popularSectionTitleRowAr: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  popularCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.warning,
  },
  creativeItemsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.border + '40',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  productDetails: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
    flex: 1,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  productDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 10,
    lineHeight: 18,
    minHeight: 36,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  discountedPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  promoPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  currency: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  originalPrice: {
    fontSize: 13,
    color: Colors.text.secondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  discountAddButton: {
    shadowColor: '#22C55E',
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  seeMoreContainer: {
    alignItems: 'center',
    marginVertical: 16,
    width: '100%',
  },
  seeMoreButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  seeMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 0,
  },
  thankYouModal: {
    width: width * 0.85,
    maxWidth: 380,
    height: '100%',
    backgroundColor: 'transparent',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  thankYouModalContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    minHeight: '100%',
  },
  thankYouIconContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    padding: 12,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thankYouTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 34,
  },
  thankYouTitleAr: {
    textAlign: 'right',
  },
  thankYouMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  thankYouMessageAr: {
    textAlign: 'right',
  },
  thankYouOrderNumber: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thankYouOrderNumberAr: {
    textAlign: 'right',
  },
  thankYouSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  thankYouSubtextAr: {
    textAlign: 'right',
  },
  seeOrderButton: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  seeOrderButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  seeOrderButtonGradientAr: {
    flexDirection: 'row-reverse',
  },
  seeOrderButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  seeOrderButtonTextAr: {
    marginRight: 0,
    marginLeft: 8,
  },
  closeModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  closeModalText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  closeModalTextAr: {
    textAlign: 'right',
  },
  offerBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  activeOfferBadge: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
  },
  usedOfferBadge: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
  },
  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  remainingUses: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.9,
    marginLeft: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  promoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 2,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  promoBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

// ========== REDESIGNED FILTER MODAL STYLES ==========
const filterModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderAr: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalTitleAr: {
    textAlign: 'right',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderAr: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  sectionTitleAr: {
    textAlign: 'right',
  },
  priceRangeContainer: {
    marginTop: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  priceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  currentPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  currentPriceContainerAr: {
    flexDirection: 'row-reverse',
  },
  currentPriceLabel: {
    fontSize: 14,
    color: '#475569',
  },
  currentPriceLabelAr: {
    textAlign: 'right',
  },
  currentPriceBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currentPriceText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  currentPriceTextAr: {
    textAlign: 'right',
  },
  bestForScrollContent: {
    paddingRight: 20,
    gap: 12,
  },
  bestForScrollContentAr: {
    flexDirection: 'row-reverse',
    paddingLeft: 20,
    paddingRight: 0,
  },
  bestForCard: {
    width: 140,
  },
  selectedCard: {
    borderRadius: 12,
  },
  bestForCardContent: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCardContent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bestForIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bestForText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  bestForTextAr: {
    textAlign: 'right',
  },
  bestForSubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  selectedSubtext: {
    color: '#E2E8F0',
  },
  bestForSubtextAr: {
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  modalFooterAr: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resetButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 16,
  },
  resetButtonTextAr: {
    textAlign: 'right',
  },
  applyButton: {
    backgroundColor: Colors.primary,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  applyButtonTextAr: {
    textAlign: 'right',
  },
});

// ========== HEADER STYLES (updated for new header) ==========
const simpleHeaderStyles = StyleSheet.create({
  // No container style here – applied via headerContainerStyle above
  header: {
    backgroundColor: 'transparent',
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  topRowRtl: {
    flexDirection: 'row-reverse',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandSectionRtl: {
    flexDirection: 'row-reverse',
  },
  logoWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileSection: {
    position: 'relative',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  profilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationDotRtl: {
    right: undefined,
    left: -2,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  welcomeRowRtl: {
    flexDirection: 'row-reverse',
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  addressContainerRtl: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
  },
  addressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 4,
  },
  searchContainerRtl: {
    flexDirection: 'row-reverse',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchIconRtl: {
    marginLeft: 8,
    marginRight: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    padding: 0,
  },
  searchInputRtl: {
    textAlign: 'right',
  },
  filterButton: {
    padding: 6,
    marginLeft: 4,
  },
  filterButtonRtl: {
    marginLeft: 0,
    marginRight: 4,
  },
  decorativeLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 40,
    borderRadius: 1,
    marginTop: 4,
  },
  decorativeLineRtl: {
    alignSelf: 'flex-end',
  },
});

const quickActionStyles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  containerAr: {
    marginVertical: 12,
  },
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    includeFontPadding: false,
    marginLeft: 6,
  },
});