import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';

interface LoyaltyData {
  totalPoints: number;
  tier: string;
  nextTier: string;
  pointsToNextTier: number;
  progressPercentage: number;
  stats: {
    totalOrders: number;
    totalSpend: string;
    uniqueItemsTried: number;
    lunchOrders: number;
    dinnerOrders: number;
  };
  breakdown: {
    orderPoints: number;
    spendPoints: number;
    uniqueItemsPoints: number;
    timingBonus: number;
  };
}

export default function LoyaltyRewardsScreen() {
  const { userLanguage } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Determine if language is Arabic
  const isRTL = userLanguage === 'arabic';

  const fetchLoyaltyRewards = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.id) {
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `https://haba-haba-api.ubua.cloud/api/auth/get-loyalty-rewards`,
        {
          params: { user_id: user.id },
        }
      );

      if (response.data.success && response.data.loyalty) {
        setLoyaltyData(response.data.loyalty);
      }
    } catch (error: any) {
      console.error('Error fetching loyalty rewards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyRewards();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLoyaltyRewards();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Bronze':
        return '#CD7F32';
      case 'Silver':
        return '#C0C0C0';
      case 'Gold':
        return '#FFD700';
      case 'Platinum':
        return '#E5E4E2';
      default:
        return Colors.primary;
    }
  };

  // Function to get tier name in Arabic
  const getTierName = (tier: string) => {
    if (!isRTL) return tier;
    
    switch (tier) {
      case 'Bronze':
        return 'برونزي';
      case 'Silver':
        return 'فضي';
      case 'Gold':
        return 'ذهبي';
      case 'Platinum':
        return 'بلاتيني';
      default:
        return tier;
    }
  };

  // Function to get next tier name in Arabic
  const getNextTierName = (nextTier: string) => {
    if (!isRTL) return nextTier;
    
    switch (nextTier) {
      case 'Bronze':
        return 'برونزي';
      case 'Silver':
        return 'فضي';
      case 'Gold':
        return 'ذهبي';
      case 'Platinum':
        return 'بلاتيني';
      default:
        return nextTier;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, isRTL && styles.headerAr]}>
        {/* Back arrow always on the left */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        {/* Title - text aligned right in Arabic */}
        <Text style={[styles.title, isRTL && styles.titleAr]}>
          {isRTL ? 'مكافآت الولاء' : 'Loyalty Rewards'}
        </Text>
      </View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, isRTL && styles.loadingTextAr]}>
              {isRTL ? 'جاري تحميل بيانات الولاء...' : 'Loading loyalty data...'}
            </Text>
          </View>
        ) : loyaltyData ? (
          <View style={[styles.loyaltyCard, isRTL && styles.loyaltyCardAr]}>
            <View style={[styles.loyaltyIcon, { backgroundColor: `${getTierColor(loyaltyData.tier)}20` }]}>
              <Ionicons name="trophy" size={24} color={getTierColor(loyaltyData.tier)} />
            </View>
            <View style={styles.loyaltyInfo}>
              <View style={[styles.loyaltyHeader, isRTL && styles.loyaltyHeaderAr]}>
                <Text style={[styles.loyaltyTitle, isRTL && styles.loyaltyTitleAr]}>
                  {isRTL ? 'مكافآت الولاء' : 'Loyalty Rewards'}
                </Text>
                <View style={[styles.tierBadge, { backgroundColor: getTierColor(loyaltyData.tier) }]}>
                  <Text style={styles.tierBadgeText}>
                    {getTierName(loyaltyData.tier)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.loyaltyDescription, isRTL && styles.loyaltyDescriptionAr]}>
                {isRTL ? 'اكسب نقاطًا مع كل طلب وافتح مكافآت حصرية' : 'Earn points with every order and unlock exclusive rewards'}
              </Text>
              <View style={styles.pointsContainer}>
                <Text style={[styles.currentPoints, isRTL && styles.currentPointsAr]}>
                  {loyaltyData.totalPoints.toLocaleString()} {isRTL ? 'نقطة' : 'pts'}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${loyaltyData.progressPercentage}%`,
                        backgroundColor: getTierColor(loyaltyData.tier),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.nextReward, isRTL && styles.nextRewardAr]}>
                  {loyaltyData.pointsToNextTier > 0
                    ? `${loyaltyData.pointsToNextTier} ${isRTL ? 'نقطة' : 'points'} ${isRTL ? 'إلى' : 'to'} ${getNextTierName(loyaltyData.nextTier)} ${isRTL ? 'المستوى' : 'tier'}`
                    : `${isRTL ? 'لقد وصلت إلى المستوى' : 'You\'ve reached the'} ${getTierName(loyaltyData.tier)} ${isRTL ? '' : 'tier!'}`}
                </Text>
              </View>

              {/* Stats Grid */}
              <View style={[styles.statsGrid, isRTL && styles.statsGridAr]}>
                <View style={styles.statItem}>
                  <Ionicons name="bag" size={20} color={Colors.primary} />
                  <Text style={[styles.statValue, isRTL && styles.statValueAr]}>
                    {loyaltyData.stats.totalOrders}
                  </Text>
                  <Text style={[styles.statLabel, isRTL && styles.statLabelAr]}>
                    {isRTL ? 'الطلبات' : 'Orders'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="cash" size={20} color={Colors.success} />
                  <Text style={[styles.statValue, isRTL && styles.statValueAr]}>
                    {loyaltyData.stats.totalSpend}
                  </Text>
                  <Text style={[styles.statLabel, isRTL && styles.statLabelAr]}>
                    {isRTL ? 'درهم مبذول' : 'MAD Spent'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="restaurant" size={20} color={Colors.warning} />
                  <Text style={[styles.statValue, isRTL && styles.statValueAr]}>
                    {loyaltyData.stats.uniqueItemsTried}
                  </Text>
                  <Text style={[styles.statLabel, isRTL && styles.statLabelAr]}>
                    {isRTL ? 'عناصر مجربة' : 'Items Tried'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="time" size={20} color={Colors.error} />
                  <Text style={[styles.statValue, isRTL && styles.statValueAr]}>
                    {loyaltyData.stats.lunchOrders + loyaltyData.stats.dinnerOrders}
                  </Text>
                  <Text style={[styles.statLabel, isRTL && styles.statLabelAr]}>
                    {isRTL ? 'مكافأة الوقت' : 'Timing Bonus'}
                  </Text>
                </View>
              </View>

              {/* Points Breakdown */}
              <View style={styles.breakdownContainer}>
                <Text style={[styles.breakdownTitle, isRTL && styles.breakdownTitleAr]}>
                  {isRTL ? 'تفصيل النقاط' : 'Points Breakdown'}
                </Text>
                <View style={[styles.breakdownRow, isRTL && styles.breakdownRowAr]}>
                  <Text style={[styles.breakdownLabel, isRTL && styles.breakdownLabelAr]}>
                    {isRTL ? `الطلبات (${loyaltyData.stats.totalOrders})` : `Orders (${loyaltyData.stats.totalOrders})`}
                  </Text>
                  <Text style={[styles.breakdownValue, isRTL && styles.breakdownValueAr]}>
                    +{loyaltyData.breakdown.orderPoints} {isRTL ? 'نقطة' : 'pts'}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, isRTL && styles.breakdownRowAr]}>
                  <Text style={[styles.breakdownLabel, isRTL && styles.breakdownLabelAr]}>
                    {isRTL ? `الإنفاق (${loyaltyData.stats.totalSpend} درهم)` : `Spending (${loyaltyData.stats.totalSpend} MAD)`}
                  </Text>
                  <Text style={[styles.breakdownValue, isRTL && styles.breakdownValueAr]}>
                    +{loyaltyData.breakdown.spendPoints} {isRTL ? 'نقطة' : 'pts'}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, isRTL && styles.breakdownRowAr]}>
                  <Text style={[styles.breakdownLabel, isRTL && styles.breakdownLabelAr]}>
                    {isRTL ? `عناصر مميزة (${loyaltyData.stats.uniqueItemsTried})` : `Unique Items (${loyaltyData.stats.uniqueItemsTried})`}
                  </Text>
                  <Text style={[styles.breakdownValue, isRTL && styles.breakdownValueAr]}>
                    +{loyaltyData.breakdown.uniqueItemsPoints} {isRTL ? 'نقطة' : 'pts'}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, isRTL && styles.breakdownRowAr]}>
                  <Text style={[styles.breakdownLabel, isRTL && styles.breakdownLabelAr]}>
                    {isRTL ? `مكافأة الوقت (${loyaltyData.stats.lunchOrders} غداء، ${loyaltyData.stats.dinnerOrders} عشاء)` : `Timing Bonus (${loyaltyData.stats.lunchOrders} lunch, ${loyaltyData.stats.dinnerOrders} dinner)`}
                  </Text>
                  <Text style={[styles.breakdownValue, isRTL && styles.breakdownValueAr]}>
                    +{loyaltyData.breakdown.timingBonus} {isRTL ? 'نقطة' : 'pts'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.loyaltyCard}>
            <Ionicons name="trophy-outline" size={48} color={Colors.gray[400]} />
            <Text style={[styles.emptyLoyaltyText, isRTL && styles.emptyLoyaltyTextAr]}>
              {isRTL ? 'لا توجد بيانات ولاء متاحة' : 'No loyalty data available'}
            </Text>
            <Text style={[styles.emptyLoyaltySubtext, isRTL && styles.emptyLoyaltySubtextAr]}>
              {isRTL ? 'ابدأ الطلب لتحصل على نقاط الولاء!' : 'Start ordering to earn loyalty points!'}
            </Text>
          </View>
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
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAr: {
    flexDirection: 'row',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  titleAr: {
    textAlign: 'right',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  loadingTextAr: {
    textAlign: 'center',
  },
  loyaltyCard: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    gap: 16,
    minHeight: 200,
    alignItems: 'flex-start',
  },
  loyaltyCardAr: {
    flexDirection: 'row-reverse',
  },
  loyaltyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9333EA20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  loyaltyHeaderAr: {
    flexDirection: 'row-reverse',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  loyaltyInfo: {
    flex: 1,
  },
  loyaltyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  loyaltyTitleAr: {
    textAlign: 'right',
  },
  loyaltyDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  loyaltyDescriptionAr: {
    textAlign: 'right',
  },
  backArrow: { 
    fontSize: 24, 
    color: '#000' 
  },
  pointsContainer: {
    marginBottom: 12,
  },
  currentPoints: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#9333EA',
    marginBottom: 8,
  },
  currentPointsAr: {
    textAlign: 'right',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E9D5FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9333EA',
  },
  nextReward: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  nextRewardAr: {
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  statsGridAr: {
    flexDirection: 'row-reverse',
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 4,
  },
  statValueAr: {
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  statLabelAr: {
    textAlign: 'center',
  },
  breakdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  breakdownTitleAr: {
    textAlign: 'right',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  breakdownRowAr: {
    flexDirection: 'row-reverse',
  },
  breakdownLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
  },
  breakdownLabelAr: {
    textAlign: 'right',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  breakdownValueAr: {
    textAlign: 'left',
  },
  emptyLoyaltyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyLoyaltyTextAr: {
    textAlign: 'center',
  },
  emptyLoyaltySubtext: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyLoyaltySubtextAr: {
    textAlign: 'center',
  },
});