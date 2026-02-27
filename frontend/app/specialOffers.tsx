import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  is_applied_by_user: boolean;
}

interface TimeLeft {
  [key: number]: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
  };
}

interface CreativeSectionProps {
  offers: Offer[];
  userLanguage?: 'english' | 'arabic' | 'french'; // optional fallback
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = screenWidth - 32;
const CARD_HEIGHT = 220;

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

const CreativeSection: React.FC<CreativeSectionProps> = ({ offers, userLanguage: initialLanguage = 'english' }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Language state – self-managed from AsyncStorage, fallback to prop
  const [language, setLanguage] = useState<'english' | 'arabic' | 'french'>(initialLanguage);
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

  // Timer logic
  useEffect(() => {
    const calculateTimeLeft = () => {
      const newTimeLeft: TimeLeft = {};

      offers?.forEach(offer => {
        const endDate = new Date(offer.end_at).getTime();
        const now = new Date().getTime();
        const difference = endDate - now;

        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);

          newTimeLeft[offer.id] = {
            days,
            hours,
            minutes,
            seconds,
            formatted: days > 0
              ? t(language, { en: `${days}d ${hours}h left`, ar: `متبقي ${days}ي ${hours}س`, fr: `Reste ${days}j ${hours}h` })
              : t(language, { en: `${hours}h ${minutes}m left`, ar: `متبقي ${hours}س ${minutes}د`, fr: `Reste ${hours}h ${minutes}m` })
          };
        } else {
          newTimeLeft[offer.id] = {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            formatted: t(language, { en: 'Expired', ar: 'منتهي', fr: 'Expiré' })
          };
        }
      });

      setTimeLeft(newTimeLeft);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [offers, language]);

  // Helper functions
  const getProgressPercentage = (offer: Offer): number => {
    if (!offer.products || offer.products.length === 0) return 0;
    const totalTimeUsed = offer.products.reduce((sum, p) => sum + (p.times_used || 0), 0);
    const totalMaxUsage = offer.products.reduce((sum, p) => sum + (p.limited_use || 0), 0);
    if (totalMaxUsage === 0) return 0;
    return Math.round(Math.min(100, Math.max(0, (totalTimeUsed / totalMaxUsage) * 100)));
  };

  const getDiscountText = (offer: Offer): string => {
    if (offer.discount_type === 'percentage') {
      return t(language, { en: `${offer.discount}% OFF`, ar: `خصم %${offer.discount}`, fr: `${offer.discount}% de réduction` });
    } else if (offer.discount_type === 'fixed') {
      return t(language, { en: `${offer.discount} MAD OFF`, ar: `خصم ${offer.discount} درهم`, fr: `${offer.discount} MAD de réduction` });
    } else if (offer.discount_type === 'free_delivery') {
      return t(language, { en: 'FREE DELIVERY', ar: 'توصيل مجاني', fr: 'LIVRAISON GRATUITE' });
    }
    return t(language, { en: 'SPECIAL OFFER', ar: 'عرض خاص', fr: 'OFFRE SPÉCIALE' });
  };

  const getOfferIcon = (offer: Offer): string => {
    const name = offer.name.toLowerCase();
    if (name.includes('aid') || name.includes('mubarak')) return 'sparkles';
    if (name.includes('jomo3a') || name.includes('friday')) return 'pricetag-outline';
    if (name.includes('family') || name.includes('bundle')) return 'people-outline';
    if (name.includes('delivery') || name.includes('shipping')) return 'rocket-outline';
    if (name.includes('weekend') || name.includes('special')) return 'flash';
    return 'pricetag-outline';
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (CARD_WIDTH + CARD_MARGIN));
    setCurrentIndex(Math.min(index, offers.length - 1));
  };

  const handleOfferPress = (offer: Offer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/OfferDetailScreen",
      params: { offerId: offer.id, userLanguage: language }
    });
  };

  // Don't render until language is loaded and offers exist
  if (loadingLang || !offers || offers.length === 0) {
    return null;
  }

  return (
    <View style={styles.creativeSection}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View>
          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {t(language, { en: 'Special Offers', ar: 'عروض مميزة', fr: 'Offres spéciales' })}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
            {t(language, { en: 'Limited time deals and discounts', ar: 'عروض وخصومات لفترة محدودة', fr: 'Offres et réductions à durée limitée' })}
          </Text>
        </View>
        <View style={styles.hotBadge}>
          <Ionicons name="flash" size={14} color={Colors.primary} />
          <Text style={styles.hotBadgeText}>
            {t(language, { en: 'HOT', ar: 'حصري', fr: 'CHAUD' })}
          </Text>
        </View>
      </View>

      {/* Offers Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        snapToInterval={CARD_WIDTH + CARD_MARGIN}
        decelerationRate="fast"
        snapToAlignment="start"
        contentContainerStyle={styles.carouselContainer}
      >
        {offers.map((offer, index) => {
          const progress = getProgressPercentage(offer);
          const isApplied = offer.is_applied_by_user;
          const iconName = getOfferIcon(offer);
          const discountText = getDiscountText(offer);
          const timeRemaining = timeLeft[offer.id];

          return (
            <View key={offer.id} style={styles.cardWrapper}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => handleOfferPress(offer)}
              >
                <ImageBackground
                  source={{ uri: offer.image.startsWith('http') ? offer.image : `https://haba-haba-api.ubua.cloud/${offer.image.replace(/\\/g, '/')}` }}
                  style={styles.imageBackground}
                  imageStyle={styles.image}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={isApplied
                      ? ['rgba(76, 175, 80, 0.85)', 'rgba(56, 142, 60, 0.85)']
                      : ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.overlay}
                  >
                    {/* Applied badge */}
                    {isApplied && (
                      <View style={[styles.appliedBadge, isRTL && { right: undefined, left: 16 }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text>
                          {t(language, { en: 'Applied', ar: 'مفعل', fr: 'Appliqué' })}
                        </Text>
                      </View>
                    )}

                    {/* Discount badge */}
                    <View style={[styles.discountBadge, isRTL && { alignSelf: 'flex-end' }]}>
                      <Text style={styles.discountBadgeText}>{discountText}</Text>
                    </View>

                    <View style={styles.content}>
                      <View style={[styles.titleRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Text style={styles.offerTitle} numberOfLines={2}>
                          {offer.name}
                        </Text>
                        <Ionicons name={iconName as any} size={22} color="#fff" />
                      </View>

                      <Text style={[styles.offerDescription, isRTL && { textAlign: 'right' }]} numberOfLines={2}>
                        {offer.description}
                      </Text>

                      {/* Progress bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${progress}%` }]} />
                        </View>
                        <Text style={[styles.progressText, isRTL && { textAlign: 'right' }]}>
                          {t(language, {
                            en: `${progress}% claimed • ${offer.products?.length || 0} items`,
                            ar: `${progress}% تمت المطالبة • ${offer.products?.length || 0} منتج`,
                            fr: `${progress}% réclamé • ${offer.products?.length || 0} articles`
                          })}
                        </Text>
                      </View>

                      {/* Footer */}
                      <View style={[styles.footer, isRTL && styles.footerRTL]}>
                        <View style={styles.timer}>
                          <Ionicons name="time-outline" size={14} color="#fff" />
                          <Text style={styles.timerText}>
                            {timeRemaining?.formatted || t(language, { en: 'Loading...', ar: 'تحميل...', fr: 'Chargement...' })}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.claimButton, isApplied && styles.claimButtonApplied]}
                          onPress={() => handleOfferPress(offer)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={isApplied ? ['#4CAF50', '#388E3C'] : ['#FFFFFF', '#F5F5F5']}
                            style={styles.claimGradient}
                          >
                            <Text style={[styles.claimText, { color: isApplied ? '#FFFFFF' : Colors.primary }]}>
                              {isApplied
                                ? t(language, { en: 'Applied ✓', ar: 'مفعل ✓', fr: 'Appliqué ✓' })
                                : t(language, { en: 'Claim', ar: 'اطلب الآن', fr: 'Obtenir' })}
                            </Text>
                            <Ionicons
                              name={isApplied ? "checkmark" : "arrow-forward"}
                              size={14}
                              color={isApplied ? '#FFFFFF' : Colors.primary}
                              style={isRTL && !isApplied ? { transform: [{ scaleX: -1 }] } : undefined}
                            />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Pagination dots */}
      {offers.length > 1 && (
        <View style={[styles.pagination, isRTL && { flexDirection: 'row-reverse' }]}>
          {offers.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.dotActive
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  creativeSection: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#757575',
  },
  textRTL: {
    textAlign: 'right',
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  hotBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  carouselContainer: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: CARD_MARGIN,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  card: {
    borderRadius: 16,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  imageBackground: {
    flex: 1,
  },
  image: {
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  appliedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    zIndex: 10,
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  offerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  offerDescription: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2.5,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2.5,
  },
  progressText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRTL: {
    flexDirection: 'row-reverse',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  claimButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  claimButtonApplied: {
    // additional styles if needed
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  claimText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
  },
  dotActive: {
    width: 22,
    height: 6,
    backgroundColor: Colors.primary,
  },
});

export default CreativeSection;