import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useDispatch } from 'react-redux';
import { setLanguage } from './redux/slices/languageSlice';
// Remove this line: import useLogout from './logout';
import { useAuth } from '../contexts/AuthContext'; // ADD THIS

// SVG Icons (unchanged) ...

interface ProfileStats {
  totalOrders: number;
  memberSince: string;
  favorite: string;
}

interface ProfileScreenComponentProps {
  userLanguage?: 'english' | 'arabic' | 'french';
}

const ProfileScreenComponent: React.FC<ProfileScreenComponentProps> = ({
  userLanguage = 'english',
}) => {
  const dispatch = useDispatch();
  // Remove: const logout = useLogout();
  const { logout } = useAuth(); // ADD THIS - use the auth context
  
  const [loading, setLoading] = useState(true);
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [client, setClient] = useState<any>({
    name: '',
    email: '',
    phone: '',
    avatar: null,
    isPhoneVerified: false,
  });
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    totalOrders: 0,
    memberSince: '',
    favorite: 'N/A',
  });

  // Local language state to ensure UI updates immediately
  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'arabic' | 'french'>(userLanguage);

  // Language modal state
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const languages = ['English', 'Arabic', 'French'];

  const insets = useSafeAreaInsets();

  // Sync with AsyncStorage on mount to ensure consistency
  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('userLanguage');
      if (storedLang && (storedLang === 'english' || storedLang === 'arabic' || storedLang === 'french')) {
        setCurrentLanguage(storedLang);
      }
    };
    loadLanguage();
  }, []);

  // Translation helper
  const t = (key: {
    en: string;
    ar: string;
    fr: string;
  }): string => {
    if (currentLanguage === 'arabic') return key.ar;
    if (currentLanguage === 'french') return key.fr;
    return key.en;
  };

  // Update language on backend and storage
  const updateLanguage = async (selectedLanguage: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert(
          t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
          t({ en: 'No authentication token found', ar: 'رمز المصادقة غير موجود', fr: 'Aucun jeton d\'authentification trouvé' })
        );
        return;
      }

      // Map display name to code expected by backend
      const langCode = selectedLanguage === 'English' ? 'english' : selectedLanguage === 'Arabic' ? 'arabic' : 'french';

      const response = await axios.post(
        'https://haba-haba-api.ubua.cloud/api/auth/set-language',
        { currentLang: langCode },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.success) {
        // Update local state and storage immediately
        setCurrentLanguage(langCode);
        await AsyncStorage.setItem('userLanguage', langCode);
        
        // Dispatch to Redux so that other screens (like tabs) update instantly
        dispatch(setLanguage(langCode));
        
        setShowLanguageModal(false);
      } else {
        Alert.alert(
          t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
          response.data.message || t({ en: 'Failed to update language', ar: 'فشل في تحديث اللغة', fr: 'Échec de la mise à jour de la langue' })
        );
      }
    } catch (error: any) {
      console.error('Language update error:', error);
      const errorMessage = error.response?.data?.message || error.message || t({ en: 'Network error. Please try again.', ar: 'خطأ في الشبكة. حاول مرة أخرى.', fr: 'Erreur réseau. Veuillez réessayer.' });
      Alert.alert(
        t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
        errorMessage
      );
    }
  };

  useFocusEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.push('/signin');
        return;
      }
      setLoading(false);
    };
    checkAuth();
  });

  const fetchUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('client');
      if (userData) {
        const parsed = JSON.parse(userData);
        setClient({
          ...parsed,
        });
      }
    } catch (error) {
      console.log('Error fetching user data', error);
    }
  };

  const fetchUserStats = async () => {
  try {
    // 1. Retrieve the client data and the raw token from storage
    const userData = await AsyncStorage.getItem('client');
    const token = await AsyncStorage.getItem('token'); // Get token from storage

    const user = userData ? JSON.parse(userData) : null;

    // Guard clause: if no user or token, don't attempt the call
    if (!user || !user.id || !token) return;

    // 2. Make the GET request using the Authorization header
    const res = await axios.get(`https://haba-haba-api.ubua.cloud/api/auth/profile-stats`, {
      headers: {
        Authorization: `Bearer ${token}` // This matches your verifyToken middleware
      }
    });
    
    console.log('zap: ', res.data.stats.clientmemberSince)

    // 3. Process the data returned from your getProfileStats controller
    // Note: Based on the controller we built, the data is in res.data.stats
    const { deliveredOrders, favorites, clientmemberSince } = res.data.stats;

    // Logic for 'Member Since' (often better to get this directly from a user.created_at field)
    const memberSince = new Date().toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });

    setProfileStats({
      totalOrders: deliveredOrders, // Use the count from the backend
      memberSince: clientmemberSince,
      favorite: favorites,    // Updating to use the real favorite count
    });

  } catch (error) {
    console.error('❌ Error fetching user stats:');
  }
};

  useEffect(() => {
    fetchUserData();
    fetchUserStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUserData();
      await fetchUserStats();
    } catch (error) {
      console.log('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleReorder = (): void => {
    router.push({
      pathname: '/ReorderScreen',
      params: { userLanguage: currentLanguage }
    });
  };

  const handleCoupons = (): void => {
    router.push({
      pathname: '/Offers',
      params: { userLanguage: currentLanguage }
    });
  };

  // Update the handleLogout function
  const handleLogout = async (): Promise<void> => {
    await logout(); // This now comes from useAuth()
    // No need to call router.replace here because the logout function in AuthContext
    // doesn't handle navigation. Let's add navigation:
    router.replace('/signin');
  };

  const handleLoyaltyRewards = () => {
    router.push({
      pathname: '/LoyaltyRewards',
      params: { userLanguage: currentLanguage }
    });
  };

  const sendVerificationCode = async () => {
    if (!client?.phone) {
      Alert.alert(
        t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
        t({ en: 'Phone number not found', ar: 'رقم الهاتف غير موجود', fr: 'Numéro de téléphone introuvable' })
      );
      return;
    }

    setLoadingPhone(true);
    try {
      const response = await axios.post(
        'https://haba-haba-api.ubua.cloud/api/auth/send-verification-code',
        {
          phone: client.phone
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      if (!response.data.success) {
        router.push('/verifyMyPhone');
      } else {
        Alert.alert(
          t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
          response.data.message || t({ en: 'Failed to send verification code', ar: 'فشل في إرسال رمز التحقق', fr: 'Échec de l\'envoi du code de vérification' })
        );
      }
    } catch (error: any) {
      if (error.response) {
        Alert.alert(
          t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
          error.response.data?.message || t({ en: 'Server error occurred', ar: 'حدث خطأ في الخادم', fr: 'Erreur serveur' })
        );
      } else if (error.request) {
        Alert.alert(
          t({ en: 'Connection Error', ar: 'خطأ في الاتصال', fr: 'Erreur de connexion' }),
          t({ en: 'No response from server. Check your connection.', ar: 'لا يوجد استجابة من الخادم. تحقق من اتصالك.', fr: 'Aucune réponse du serveur. Vérifiez votre connexion.' })
        );
      } else {
        Alert.alert(
          t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
          error.message || t({ en: 'Failed to send verification code', ar: 'فشل في إرسال رمز التحقق', fr: 'Échec de l\'envoi du code de vérification' })
        );
      }
    } finally {
      setLoadingPhone(false);
    }
  };

  const isRTL = currentLanguage === 'arabic';

  // Helper to get display name for current language
  const getCurrentLanguageDisplay = () => {
    switch (currentLanguage) {
      case 'arabic': return 'العربية';
      case 'french': return 'Français';
      default: return 'English';
    }
  };

  return (
    <View style={[styles.container, Platform.OS === 'android' ? { paddingTop: insets.top } : null]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerAr]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isRTL && styles.headerTitleAr]}>
            {t({ en: 'Profile', ar: 'الملف الشخصي', fr: 'Profil' })}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Profile Info */}
        {loading ? (
          <View style={styles.profileSection}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.profileSection}>
            {/* Avatar with camera overlay */}
            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                style={styles.avatarContainer}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/editProfile',
                    params: { userLanguage: currentLanguage }
                  })
                }
              >
                {client.image ? (
                  <Image
                    source={{
                      uri: client.image.startsWith("http") || client.image.startsWith("file://")
                        ? client.image
                        : `https://haba-haba-api.ubua.cloud/uploads/profileImages/${client.image}`,
                    }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={36} color="#FFFFFF" />
                  </View>
                )}
                {/* Camera icon overlay */}
                <View style={styles.cameraOverlay}>
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Name and Email - Centered */}
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, isRTL && styles.profileNameAr]}>
                {client.name || t({ en: 'User', ar: 'مستخدم', fr: 'Utilisateur' })}
              </Text>
              <Text style={[styles.profileEmail, isRTL && styles.profileEmailAr]}>
                {client.email || t({ en: 'No email', ar: 'لا يوجد بريد إلكتروني', fr: 'Aucun email' })}
              </Text>
            </View>

            {/* Stats Card */}
            <View style={styles.statsCard}>
              <View style={[styles.statItem, styles.statItemBorder]}>
                <Text style={[styles.statNumber, isRTL && styles.statNumberAr]}>
                  {profileStats.totalOrders}
                </Text>
                <Text style={[styles.statLabel, isRTL && styles.statLabelAr]}>
                  {t({ en: 'Orders', ar: 'طلب', fr: 'Commandes' })}
                </Text>
              </View>
              <View style={[styles.statItem, styles.statItemBorder]}>
                <Text style={[styles.statNumber, isRTL && styles.statNumberAr]}>
                  {profileStats.favorite}
                </Text>
                <Text style={[styles.statLabel, isRTL && styles.statLabelAr]}>
                  {t({ en: 'Favorites', ar: 'مفضل', fr: 'Favoris' })}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, isRTL && styles.statNumberAr]}>
                  {new Date(profileStats.memberSince).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
                <Text style={[styles.statLabel, isRTL && styles.statLabelAr]}>
                  {t({ en: 'Since', ar: 'منذ', fr: 'Depuis' })}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Menu Items - All actions as menu items */}
        <View style={styles.menuSection}>
          {/* Reorder */}
          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemAr]}
            onPress={handleReorder}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemLeft, isRTL && styles.menuItemLeftAr]}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="repeat-outline" size={20} color="#8B4B16" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemLabel, isRTL && styles.menuItemLabelAr]}>
                  {t({ en: 'Reorder', ar: 'إعادة الطلب', fr: 'Récommander' })}
                </Text>
                <Text style={[styles.menuItemSubtitle, isRTL && styles.menuItemSubtitleAr]}>
                  {t({ en: 'Order your favorite meal again', ar: 'اطلب وجبتك المفضلة مرة أخرى', fr: 'Commandez à nouveau votre plat préféré' })}
                </Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Coupons */}
          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemAr]}
            onPress={handleCoupons}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemLeft, isRTL && styles.menuItemLeftAr]}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="pricetag-outline" size={20} color="#2563EB" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemLabel, isRTL && styles.menuItemLabelAr]}>
                  {t({ en: 'Coupons', ar: 'كوبونات', fr: 'Coupons' })}
                </Text>
                <Text style={[styles.menuItemSubtitle, isRTL && styles.menuItemSubtitleAr]}>
                  {t({ en: 'Offers & discounts', ar: 'العروض والخصومات', fr: 'Offres et réductions' })}
                </Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Loyalty Rewards */}
          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemAr]}
            onPress={handleLoyaltyRewards}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemLeft, isRTL && styles.menuItemLeftAr]}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="trophy-outline" size={20} color="#9333EA" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemLabel, isRTL && styles.menuItemLabelAr]}>
                  {t({ en: 'Loyalty Rewards', ar: 'مكافآت الولاء', fr: 'Récompenses de fidélité' })}
                </Text>
                <Text style={[styles.menuItemSubtitle, isRTL && styles.menuItemSubtitleAr]}>
                  {t({ en: 'Your points & rewards', ar: 'نقاطك ومكافآتك', fr: 'Vos points et récompenses' })}
                </Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Verify Phone (conditional) */}
          {client && !client.isPhoneVerified && (
            <TouchableOpacity
              style={[styles.menuItem, isRTL && styles.menuItemAr]}
              onPress={sendVerificationCode}
              disabled={loadingPhone}
              activeOpacity={0.7}
            >
              <View style={[styles.menuItemLeft, isRTL && styles.menuItemLeftAr]}>
                <View style={styles.menuItemIconContainer}>
                  {loadingPhone ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
                  )}
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemLabel, isRTL && styles.menuItemLabelAr]}>
                    {t({ en: 'Verify Phone', ar: 'تحقق من الهاتف', fr: 'Vérifier le téléphone' })}
                  </Text>
                  <Text style={[styles.menuItemSubtitle, isRTL && styles.menuItemSubtitleAr]}>
                    {t({ en: 'Confirm your phone number', ar: 'تأكيد رقم هاتفك', fr: 'Confirmez votre numéro de téléphone' })}
                  </Text>
                </View>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Favorite Dishes */}
          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemAr]}
            onPress={() => router.push({ pathname: '/favoriteScreen', params: { userLanguage: currentLanguage } })}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemLeft, isRTL && styles.menuItemLeftAr]}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="heart-outline" size={20} color="#8B4B16" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemLabel, isRTL && styles.menuItemLabelAr]}>
                  {t({ en: 'Favorite Dishes', ar: 'الأطباق المفضلة', fr: 'Plats favoris' })}
                </Text>
                <Text style={[styles.menuItemSubtitle, isRTL && styles.menuItemSubtitleAr]}>
                  {t({ en: 'Your saved items', ar: 'العناصر المحفوظة', fr: 'Vos articles sauvegardés' })}
                </Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemAr]}
            onPress={() => router.push({ pathname: '/HelpSupport', params: { userLanguage: currentLanguage } })}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemLeft, isRTL && styles.menuItemLeftAr]}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="help-circle-outline" size={20} color="#8B4B16" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemLabel, isRTL && styles.menuItemLabelAr]}>
                  {t({ en: 'Help & Support', ar: 'المساعدة والدعم', fr: 'Aide et support' })}
                </Text>
                <Text style={[styles.menuItemSubtitle, isRTL && styles.menuItemSubtitleAr]}>
                  {t({ en: 'Get assistance', ar: 'الحصول على المساعدة', fr: 'Obtenir de l\'aide' })}
                </Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemAr]}
            onPress={() => router.push({ pathname: '/About', params: { userLanguage: currentLanguage } })}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemLeft, isRTL && styles.menuItemLeftAr]}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="information-circle-outline" size={20} color="#8B4B16" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemLabel, isRTL && styles.menuItemLabelAr]}>
                  {t({ en: 'About', ar: 'حول التطبيق', fr: 'À propos' })}
                </Text>
                <Text style={[styles.menuItemSubtitle, isRTL && styles.menuItemSubtitleAr]}>
                  {t({ en: 'App information', ar: 'معلومات التطبيق', fr: 'Informations sur l\'application' })}
                </Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
          {/* Language Selector */}
          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemAr]}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemLeft, isRTL && styles.menuItemLeftAr]}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="language-outline" size={20} color="#8B4B16" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemLabel, isRTL && styles.menuItemLabelAr]}>
                  {t({ en: 'Language', ar: 'اللغة', fr: 'Langue' })}
                </Text>
                <Text style={[styles.menuItemSubtitle, isRTL && styles.menuItemSubtitleAr]}>
                  {getCurrentLanguageDisplay()}
                </Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutButton, isRTL && styles.logoutButtonAr]}
            activeOpacity={0.7}
          >
            <View style={styles.logoutIconContainer}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.logoutText, isRTL && styles.logoutTextAr]}>
              {t({ en: 'Log Out', ar: 'تسجيل الخروج', fr: 'Se déconnecter' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={[styles.versionText, isRTL && styles.versionTextAr]}>
          Version 1.0.0
        </Text>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t({ en: 'Select Language', ar: 'اختر اللغة', fr: 'Choisir la langue' })}
              </Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language}
                  style={[
                    styles.modalOption,
                    ((language === 'English' && currentLanguage === 'english') ||
                     (language === 'Arabic' && currentLanguage === 'arabic') ||
                     (language === 'French' && currentLanguage === 'french')) && styles.modalOptionActive,
                  ]}
                  onPress={() => updateLanguage(language)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      ((language === 'English' && currentLanguage === 'english') ||
                       (language === 'Arabic' && currentLanguage === 'arabic') ||
                       (language === 'French' && currentLanguage === 'french')) && styles.modalOptionTextActive,
                    ]}
                  >
                    {language}
                  </Text>
                  {((language === 'English' && currentLanguage === 'english') ||
                    (language === 'Arabic' && currentLanguage === 'arabic') ||
                    (language === 'French' && currentLanguage === 'french')) && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (all your existing styles) ...
  container: {
    flex: 1,
    backgroundColor: '#FFFBF7',
  },
  scrollView: {
    flex: 1,
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
  profileSection: {
    backgroundColor: '#FFFBF7',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  avatarWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B4B16',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B4B16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B4B16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8B4B16',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileDetails: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  profileNameAr: {
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '400',
  },
  profileEmailAr: {
    textAlign: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B4B16',
    marginBottom: 4,
  },
  statNumberAr: {
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  statLabelAr: {
    textAlign: 'center',
  },
  menuSection: {
    backgroundColor: '#FFFBF7',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItemAr: {
    flexDirection: 'row-reverse',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLeftAr: {
    flexDirection: 'row-reverse',
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTextContainer: {
    gap: 2,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  menuItemLabelAr: {
    textAlign: 'right',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  menuItemSubtitleAr: {
    textAlign: 'right',
  },
  logoutSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  logoutButtonAr: {
    flexDirection: 'row-reverse',
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  logoutTextAr: {
    textAlign: 'right',
  },
  versionText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  versionTextAr: {
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  modalOptionActive: {
    backgroundColor: '#FFEDD5',
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  modalOptionTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
});

export default ProfileScreenComponent;