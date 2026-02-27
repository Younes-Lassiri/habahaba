import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import Colors from '@/constants/Colors';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');
const API_URL = 'https://haba-haba-api.ubua.cloud/api/auth';
const MEDIA_BASE_URL = 'https://haba-haba-api.ubua.cloud/';

interface OperatingHour {
  day_of_week: number;
  day_name: string;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

interface OpenStatusResponse {
  success: boolean;
  restaurant_name: string;

  is_open: boolean;
  manual_toggle: boolean;
  current_time: string;
  current_day: string;
  current_day_index: number;
  today_schedule: {
    day_name: string;
    is_closed: boolean;
    open_time: string;
    close_time: string;
  } | null;
  next_open: {
    day_name: string;
    time: string;
    is_today: boolean;
  } | null;
  operating_hours: OperatingHour[];
}

interface RestaurantSettings {
  id: number;
  restaurant_name: string;
  restaurant_address: string;
  restaurant_latitude: number;
  restaurant_longitude: number;
  phone: string;
  restaurant_email: string;
  base_delivery_fee: number;
  per_km_fee: number;
  max_delivery_distance_km: number;
  min_delivery_fee: number;
  max_delivery_fee: number;
  is_open: boolean;
  restaurant_logo?: string;
  restaurant_home_screen_icon?: string;
  updated_at?: string;
}

export default function AboutScreen() { 
  const {userLanguage} = useLocalSearchParams()
  const isRTL = userLanguage === 'arabic';
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState('about');
  const [loading, setLoading] = useState(true);
  const [restaurantData, setRestaurantData] = useState<OpenStatusResponse | null>(null);
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchRestaurantData(), fetchRestaurantSettings()]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchRestaurantData = async () => {
    try {
      console.log('📡 Fetching restaurant open status (includes all data)...');

      const response = await axios.get(`${API_URL}/open-status`);

      if (response.data?.success) {
        setRestaurantData(response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching restaurant data:', error);
    }
  };

  const fetchRestaurantSettings = async () => {
    try {
      console.log('📡 Fetching restaurant settings (full profile)...');
      const response = await axios.get(`${API_URL}/restaurant-settings`);
      if (response.data?.success && response.data.settings) {
        setRestaurantSettings(response.data.settings);
      }
    } catch (error) {
      console.error('❌ Error fetching restaurant settings:', error);
    }
  };

  const handleCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phone = restaurantSettings?.phone || '+212528993252';
    await Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const rawPhone = restaurantSettings?.phone || '+212528993252';
    const phoneNumber = rawPhone.replace('+', '').replace(/\s/g, '');
    await Linking.openURL(`https://wa.me/${phoneNumber}`);
  };

  const handleOpenMaps = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lat = restaurantSettings?.restaurant_latitude;
    const lng = restaurantSettings?.restaurant_longitude;
    const address = restaurantSettings?.restaurant_address || "place D'cheira, 141 av Chahid bouchraya, Laayoune 70000";
    const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const renderCurrentSection = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, isRTL && styles.textRTL]}>{isRTL ? 'جاري تحميل المعلومات...' : 'Loading information...'}</Text>
        </View>
      );
    }

    switch (activeSection) {
      case 'about':
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.description, isRTL && styles.textRTL]}>
              {isRTL 
                ? 'استمتع بأفضل النكهات المغربية التقليدية في العيون. ندمج الوصفات الأصيلة مع أناقة الطعام الحديثة.'
                : 'Experience the finest traditional Moroccan flavors in Laayoune. We blend authentic recipes with modern dining elegance.'
              }
            </Text>
            <View style={styles.features}>
              <View style={[styles.feature, isRTL && styles.featureRTL]}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                <Text style={[styles.featureText, isRTL && styles.textRTL]}>{isRTL ? 'أطباق مغربية تقليدية' : 'Traditional Moroccan Dishes'}</Text>
              </View>
              <View style={[styles.feature, isRTL && styles.featureRTL]}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                <Text style={[styles.featureText, isRTL && styles.textRTL]}>{isRTL ? 'مكونات محلية طازجة' : 'Fresh Local Ingredients'}</Text>
              </View>
              <View style={[styles.feature, isRTL && styles.featureRTL]}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                <Text style={[styles.featureText, isRTL && styles.textRTL]}>{isRTL ? 'أجواء مريحة' : 'Cozy Atmosphere'}</Text>
              </View>
              <View style={[styles.feature, isRTL && styles.featureRTL]}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                <Text style={[styles.featureText, isRTL && styles.textRTL]}>{isRTL ? 'مناسب للعائلات' : 'Family Friendly'}</Text>
              </View>
            </View>
          </View>
        );

      case 'location':
        return (
          <View style={styles.sectionContent}>
            <View style={[styles.locationCard, isRTL && styles.locationCardRTL]}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={[styles.locationText, isRTL && styles.textRTL]}>
                {restaurantSettings?.restaurant_address || "place D'cheira, 141 av Chahid bouchraya, Laayoune 70000"}
              </Text>
            </View>
            <TouchableOpacity style={styles.primaryActionButton} onPress={handleOpenMaps}>
              <Ionicons name="map" size={20} color="#fff" />
              <Text style={styles.primaryActionButtonText}>{isRTL ? 'فتح في الخريطة' : 'Open in Maps'}</Text>
            </TouchableOpacity>
            
            {/* Interactive Map */}
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: restaurantSettings?.restaurant_latitude || 27.1513978,
                  longitude: restaurantSettings?.restaurant_longitude || -13.203133,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
              >
                <Marker
                  coordinate={{
                    latitude: restaurantSettings?.restaurant_latitude || 27.1513978,
                    longitude: restaurantSettings?.restaurant_longitude || -13.203133,
                  }}
                  title={restaurantSettings?.restaurant_name || 'HabaHaba Restaurant'}
                  description={restaurantSettings?.restaurant_address || "Place D'chira, Laayoune"}
                />
              </MapView>
            </View>
          </View>
        );

      case 'contact':
        return (
          <View style={styles.sectionContent}>
            <TouchableOpacity style={[styles.contactCard, isRTL && styles.contactCardRTL]} onPress={handleCall}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.primary }]}>
                <Ionicons name="call" size={22} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, isRTL && styles.textRTL]}>{isRTL ? 'اتصل بنا' : 'Call Us'}</Text>
                <Text style={[styles.contactValue, isRTL && styles.textRTL]}>{restaurantSettings?.phone || '+212 528 99 32 52'}</Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.contactCard, isRTL && styles.contactCardRTL]} onPress={handleWhatsApp}>
              <View style={[styles.iconCircle, { backgroundColor: '#25D366' }]}>
                <FontAwesome5 name="whatsapp" size={22} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, isRTL && styles.textRTL]}>WhatsApp</Text>
                <Text style={[styles.contactValue, isRTL && styles.textRTL]}>{isRTL ? 'راسلنا مباشرة' : 'Message us directly'}</Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#999" />
            </TouchableOpacity>

            <View style={[styles.contactCard, isRTL && styles.contactCardRTL]}>
              <View style={[styles.iconCircle, { backgroundColor: '#666' }]}>
                <Ionicons name="mail" size={22} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, isRTL && styles.textRTL]}>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Text>
                <Text style={[styles.contactValue, isRTL && styles.textRTL]}>{restaurantSettings?.restaurant_email || 'info@HabaHaba.com'}</Text>
              </View>
            </View>
          </View>
        );

      case 'hours':
        return (
          <View style={styles.sectionContent}>
            {restaurantData && (
              <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: restaurantData.is_open ? '#4CAF50' : '#F44336' }
                  ]} />
                  <View style={styles.statusContent}>
                    <Text style={[styles.statusTitle, isRTL && styles.textRTL]}>
                      {restaurantData.is_open ? (isRTL ? 'مفتوح الآن' : 'Open Now') : (isRTL ? 'مغلق' : 'Closed')}
                    </Text>
                    <Text style={styles.statusTime}>
                      {restaurantData.current_day} • {restaurantData.current_time}
                    </Text>

                    {/* Show today's schedule */}
                    {restaurantData.today_schedule && !restaurantData.today_schedule.is_closed && (
                      <Text style={[styles.statusSchedule, isRTL && styles.textRTL]}>
                        {isRTL ? 'اليوم: ' : 'Today: '}{formatTime(restaurantData.today_schedule.open_time)} - {formatTime(restaurantData.today_schedule.close_time)}
                      </Text>
                    )}

                    {/* Show next open time if closed */}
                    {!restaurantData.is_open && restaurantData.next_open && (
                      <Text style={[styles.statusSubtext, isRTL && styles.textRTL]}>
                        {restaurantData.next_open.is_today
                          ? (isRTL ? `يفتح اليوم الساعة ${formatTime(restaurantData.next_open.time)}` : `Opens today at ${formatTime(restaurantData.next_open.time)}`)
                          : (isRTL ? `يفتح ${restaurantData.next_open.day_name} الساعة ${formatTime(restaurantData.next_open.time)}` : `Opens ${restaurantData.next_open.day_name} at ${formatTime(restaurantData.next_open.time)}`)
                        }
                      </Text>
                    )}

                    {/* Show manual toggle status */}
                    {!restaurantData.manual_toggle && (
                      <View style={styles.manualClosedBadge}>
                        <Ionicons name="lock-closed" size={12} color="#F44336" />
                        <Text style={[styles.manualClosedText, isRTL && styles.textRTL]}>{isRTL ? 'تم الإغلاق يدوياً من قبل المسؤول' : 'Manually closed by admin'}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {restaurantData && restaurantData.operating_hours && (
              <View style={styles.hoursCard}>
                {restaurantData.operating_hours.map((hour, index) => (
                  <View
                    key={hour.day_of_week}
                    style={[
                      styles.hourRow,
                      index < restaurantData.operating_hours.length - 1 && styles.hourRowBorder
                    ]}
                  >
                    <View style={styles.dayContainer}>
                      <Text style={[styles.dayName, hour.is_closed && styles.closedDay]}>
                        {hour.day_name}
                      </Text>
                      {restaurantData.current_day === hour.day_name && (
                        <View style={styles.todayBadge}>
                          <Text style={[styles.todayBadgeText, isRTL && styles.textRTL]}>{isRTL ? 'اليوم' : 'Today'}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.hourContainer}>
                      {hour.is_closed ? (
                        <Text style={[styles.closedText, isRTL && styles.textRTL]}>{isRTL ? 'مغلق' : 'Closed'}</Text>
                      ) : (
                        <Text style={styles.hourText}>
                          {formatTime(hour.open_time)} - {formatTime(hour.close_time)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingFull}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, isRTL && styles.textRTL]}>{isRTL ? 'جاري تحميل معلومات المطعم...' : 'Loading restaurant information...'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={isRTL ? styles.headerAr : styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isRTL ? 'حول' : 'About'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero with Background Logo */}
        <View style={styles.hero}>
          {/* Background Logo */}
          {restaurantSettings?.restaurant_logo && (
            <Image
              source={{ uri: `${MEDIA_BASE_URL}${restaurantSettings.restaurant_logo}` }}
              style={styles.backgroundLogo}
              resizeMode="cover"
              blurRadius={3}
            />
          )}
          
          {/* Overlay for better text visibility */}
          <View style={styles.heroOverlay} />
          
          {/* Content */}
          <View style={styles.heroContent}>
            <View style={styles.logoContainer}>
              {restaurantSettings?.restaurant_logo ? (
                <View style={styles.logoCircle}>
                  <Image
                    source={{ uri: `${MEDIA_BASE_URL}${restaurantSettings.restaurant_logo}` }}
                    style={styles.heroLogo}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={styles.logoCircle}>
                  <Ionicons name="restaurant" size={36} color={Colors.primary} />
                </View>
              )}
              <View style={styles.starBadge}>
                <MaterialIcons name="star" size={14} color="#FFD700" />
              </View>
            </View>
            <Text style={[styles.name, isRTL && styles.textRTL]}>
              {restaurantSettings?.restaurant_name || restaurantData?.restaurant_name || 'HabaHaba Restaurant'}
            </Text>
            <Text style={[styles.tagline, isRTL && styles.textRTL]}>{isRTL ? 'المطبخ المغربي الأصيل' : 'Authentic Moroccan Cuisine'}</Text>
            <View style={styles.rating}>
              {[...Array(5)].map((_, i) => (
                <MaterialIcons key={i} name="star" size={16} color="#FFD700" />
              ))}
              <Text style={styles.ratingText}>4.8 (1.2k reviews)</Text>
            </View>
          </View>
        </View>

        {/* Navigation */}
        <View style={isRTL ? styles.tabContainerAr : styles.tabContainer}>
          {[
            { id: 'about', label: isRTL ? 'حول' : 'About', icon: 'restaurant' },
            { id: 'location', label: isRTL ? 'الموقع' : 'Location', icon: 'location' },
            { id: 'contact', label: isRTL ? 'اتصل' : 'Contact', icon: 'call' },
            { id: 'hours', label: isRTL ? 'ساعات' : 'Hours', icon: 'time' },
          ].map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.tab,
                activeSection === section.id && styles.tabActive
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveSection(section.id);
              }}
            >
              <Ionicons
                name={section.icon as any}
                size={20}
                color={activeSection === section.id ? Colors.primary : '#666'}
              />
              <Text style={[
                styles.tabText,
                activeSection === section.id && styles.tabTextActive,
                isRTL && styles.tabTextRTL
              ]}>
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderCurrentSection()}
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.callButton, { flex: 1 }]}
            onPress={handleCall}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={[styles.callButtonText, isRTL && styles.textRTL]}>{isRTL ? 'اتصل الآن' : 'Call Now'}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerTitle, isRTL && styles.textRTL]}>
            {restaurantSettings?.restaurant_name || restaurantData?.restaurant_name || 'HabaHaba Restaurant'}
          </Text>
          <Text style={[styles.footerSubtext, isRTL && styles.textRTL]}>{isRTL ? 'منذ 2025 • نخدم العيون' : 'Since 2025 • Serving Laayoune'}</Text>

          <View style={styles.social}>
            <Ionicons name="logo-facebook" size={18} color={Colors.primary} />
            <Ionicons name="logo-instagram" size={18} color={Colors.primary} />
            <Ionicons name="logo-twitter" size={18} color={Colors.primary} />
            <Ionicons name="logo-youtube" size={18} color={Colors.primary} />
          </View>
          <Text style={[styles.copyright, isRTL && styles.textRTL]}>
            &copy; {new Date().getFullYear()} {restaurantSettings?.restaurant_name || restaurantData?.restaurant_name || 'HabaHaba Restaurant'}. {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
          </Text>

          <View style={styles.developerContainer}>
            <Text style={[styles.developerText, isRTL && styles.textRTL]}>
              {isRTL ? 'طورت وصممت بواسطة' : 'Developed ,Branded and Designed by'}
            </Text>
            <View style={styles.developerBadge}>
              <Image
                source={require('@/assets/creators/Generated_Image_December_10__2025_-_12_26PM-removebg-preview.png')}
                style={styles.creatorImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerAr: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 16,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    backgroundColor: Colors.primary,
    paddingVertical: 32,
    alignItems: 'center',
    position: 'relative',
  },
  backgroundLogo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tabContainerAr: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: Colors.primary,
  },
  tabTextRTL: {
    textAlign: 'right',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  featureRTL: {
    flexDirection: 'row-reverse',
  },
  locationCardRTL: {
    flexDirection: 'row-reverse',
  },
  contactCardRTL: {
    flexDirection: 'row-reverse',
  },
  content: {
    padding: 20,
  },
  sectionContent: {
    gap: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  features: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  locationCard: {
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  map: {
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#666',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusSchedule: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 4,
  },
  manualClosedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  manualClosedText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  hoursCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  hourRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  closedDay: {
    color: '#999',
  },
  todayBadge: {
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  hourContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  closedText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  menuButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.primary + '05',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 32,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  heroLogo: {
    width: 90,
    height: 80,
    borderRadius: 40,
  },
  social: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  copyright: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  developerContainer: {
    alignItems: 'center',
  },
  developerText: {
    fontSize: 12,
    color: '#ADB5BD',
    marginBottom: 8,
  },
  developerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 25,
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.primary + '20',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  creatorImage: {
    width: 150,
    height: 40,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: '#fff',
  },
  developerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});