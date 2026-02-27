import React, { useState, useEffect } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface PromoCode {
  id: string;
  badge: string;
  color: string;
  title: string;
  description: string;
  minOrder: number;
  validUntil: string;
  code: string;
}

interface PromoCodesScreenProps {
  onBack?: () => void;
  userLanguage?: 'english' | 'arabic' | 'french';
}

export default function PromoCodesScreen({ onBack, userLanguage: propUserLanguage }: PromoCodesScreenProps) {
  const insets = useSafeAreaInsets();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [userLanguage, setUserLanguage] = useState<'english' | 'arabic' | 'french'>('english');

  // Load language from AsyncStorage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem('userLanguage');
        if (storedLanguage === 'arabic' || storedLanguage === 'french') {
          setUserLanguage(storedLanguage);
        } else if (propUserLanguage) {
          setUserLanguage(propUserLanguage);
        }
      } catch (error) {
        console.error('Failed to load language:', error);
      }
    };
    loadLanguage();
  }, [propUserLanguage]);

  const isRTL = userLanguage === 'arabic';
  const isFrench = userLanguage === 'french';

  const t = (en: string, ar: string, fr: string) => {
    if (isRTL) return ar;
    if (isFrench) return fr;
    return en;
  };

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('https://haba-haba-api.ubua.cloud/api/auth/get-promo-codes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success && response.data.promoCodes) {
        setPromoCodes(response.data.promoCodes);
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      setPromoCodes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPromoCodes();
  };

  const handleCopyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const featuredCode = promoCodes.length > 0 ? promoCodes[0] : null;
  const regularCodes = promoCodes.slice(1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Simple header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.headerTitleAr]}>
          {t('Promo Codes', 'رموز ترويجية', 'Codes promo')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading && promoCodes.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('Loading promo codes...', 'جاري تحميل الرموز الترويجية...', 'Chargement des codes promo...')}</Text>
          </View>
        ) : promoCodes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={80} color={Colors.gray[300]} />
            <Text style={styles.emptyTitle}>{t('No promo codes yet', 'لا توجد رموز ترويجية بعد', 'Pas encore de codes promo')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('Check back soon for exclusive discounts!', 'ترقبوا العروض الحصرية قريباً!', 'Revenez bientôt pour des réductions exclusives !')}
            </Text>
          </View>
        ) : (
          <>
            {/* Featured promo code (first one) */}
            {featuredCode && (
              <View style={styles.featuredCard}>
                <View style={[styles.featuredBadge, { backgroundColor: featuredCode.color }]}>
                  <Text style={styles.featuredBadgeText}>{featuredCode.badge}</Text>
                </View>
                <Text style={styles.featuredTitle}>{featuredCode.title}</Text>
                <Text style={styles.featuredDescription}>
                  {featuredCode.description || t('Limited time offer', 'عرض لفترة محدودة', 'Offre à durée limitée')}
                </Text>
                <View style={styles.featuredMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="basket-outline" size={14} color={Colors.text.secondary} />
                    <Text style={styles.metaText}>{t('Min.', 'الحد الأدنى', 'Min.')} {featuredCode.minOrder} {t('MAD', 'درهم', 'MAD')}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.text.secondary} />
                    <Text style={styles.metaText}>{featuredCode.validUntil}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.codeButton}
                  onPress={() => handleCopyCode(featuredCode.code)}
                >
                  <Text style={styles.codeText}>{featuredCode.code}</Text>
                  <Ionicons
                    name={copiedCode === featuredCode.code ? 'checkmark' : 'copy-outline'}
                    size={18}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Regular promo codes grid */}
            {regularCodes.length > 0 && (
              <View style={styles.gridSection}>
                <Text style={[styles.gridTitle, isRTL && styles.gridTitleAr]}>
                  {t('More promo codes', 'المزيد من الرموز الترويجية', 'Plus de codes promo')}
                </Text>
                <View style={styles.grid}>
                  {regularCodes.map((code) => (
                    <View key={code.id} style={styles.gridItem}>
                      <View style={styles.gridCard}>
                        <View style={[styles.gridBadge, { backgroundColor: code.color }]}>
                          <Text style={styles.gridBadgeText}>{code.badge}</Text>
                        </View>
                        <Text style={styles.gridTitleText} numberOfLines={1}>{code.title}</Text>
                        <Text style={styles.gridDescText} numberOfLines={2}>
                          {code.description || t('Special discount', 'خصم خاص', 'Réduction spéciale')}
                        </Text>
                        <View style={styles.gridMeta}>
                          <Text style={styles.gridMetaText}>
                            {t('Min.', 'الحد الأدنى', 'Min.')} {code.minOrder} {t('MAD', 'درهم', 'MAD')}
                          </Text>
                          <Text style={styles.gridMetaText}> • </Text>
                          <Text style={styles.gridMetaText}>{code.validUntil}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.gridCodeButton}
                          onPress={() => handleCopyCode(code.code)}
                        >
                          <Text style={styles.gridCodeText}>{code.code}</Text>
                          <Ionicons
                            name={copiedCode === code.code ? 'checkmark' : 'copy-outline'}
                            size={14}
                            color={Colors.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* How to use steps */}
            <View style={styles.howToSection}>
              <Text style={[styles.howToTitle, isRTL && styles.howToTitleAr]}>
                {t('How to use', 'كيفية الاستخدام', 'Comment utiliser')}
              </Text>
              <View style={styles.steps}>
                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="cart" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepNumber}>{t('Step 1', 'الخطوة 1', 'Étape 1')}</Text>
                    <Text style={styles.stepText}>{t('Add items to cart', 'أضف المنتجات إلى السلة', 'Ajoutez au panier')}</Text>
                  </View>
                </View>
                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="pricetag" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepNumber}>{t('Step 2', 'الخطوة 2', 'Étape 2')}</Text>
                    <Text style={styles.stepText}>{t('Enter promo code at checkout', 'أدخل الرمز عند الدفع', 'Saisissez le code')}</Text>
                  </View>
                </View>
                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="happy" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepNumber}>{t('Step 3', 'الخطوة 3', 'Étape 3')}</Text>
                    <Text style={styles.stepText}>{t('Enjoy your discount', 'استفد من الخصم', 'Profitez de la réduction')}</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
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
    fontWeight: '600',
    color: Colors.text.primary,
  },
  headerTitleAr: {
    textAlign: 'right',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  featuredCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  featuredBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  featuredDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  gridSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  gridTitleAr: {
    textAlign: 'right',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  gridItem: {
    width: (width - 40) / 2,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  gridCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  gridBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  gridBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  gridTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  gridDescText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
    minHeight: 32,
  },
  gridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  gridMetaText: {
    fontSize: 10,
    color: Colors.text.light,
  },
  gridCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  gridCodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  howToSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  howToTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  howToTitleAr: {
    textAlign: 'right',
  },
  steps: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepNumber: {
    fontSize: 11,
    color: Colors.text.light,
    marginBottom: 2,
  },
  stepText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
});