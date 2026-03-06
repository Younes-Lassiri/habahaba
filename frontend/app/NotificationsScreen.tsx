// app/(tabs)/notifications.tsx (the main screen)
import Colors from '@/constants/Colors';
import { useNotifications } from '@/hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  data?: any;
  created_at: string;
}

type NotificationType = 'order_delivered' | 'order_preparing' | 'order_confirmed' | 'promo' | 'offer' | 'welcome' | 'default';

interface NotificationConfig {
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  iconColor: string;
}

const getNotificationConfig = (type: NotificationType): NotificationConfig => {
  switch (type) {
    case 'order_delivered':
      return {
        icon: 'checkmark-circle',
        backgroundColor: '#DCFCE7',
        iconColor: '#16A34A',
      };
    case 'order_preparing':
      return {
        icon: 'cube',
        backgroundColor: '#DBEAFE',
        iconColor: '#2563EB',
      };
    case 'order_confirmed':
      return {
        icon: 'calendar',
        backgroundColor: '#F3E8FF',
        iconColor: '#9333EA',
      };
    case 'promo':
    case 'offer':
      return {
        icon: 'pricetag',
        backgroundColor: '#FFEDD5',
        iconColor: '#EA580C',
      };
    case 'welcome':
      return {
        icon: 'notifications',
        backgroundColor: '#FFEDD5',
        iconColor: '#EA580C',
      };
    default:
      return {
        icon: 'notifications-outline',
        backgroundColor: '#F3F4F6',
        iconColor: '#6B7280',
      };
  }
};

const determineNotificationType = (notification: Notification): NotificationType => {
  const typeStr = notification.data?.type || '';
  const title = notification.title?.toLowerCase() || '';
  const message = notification.message?.toLowerCase() || '';

  if (typeStr.includes('delivered') || title.includes('delivered') || message.includes('delivered')) {
    return 'order_delivered';
  }
  if (typeStr.includes('preparing') || title.includes('preparing') || message.includes('preparing') || message.includes('prepared')) {
    return 'order_preparing';
  }
  if (typeStr.includes('confirmed') || title.includes('confirmed') || message.includes('confirmed')) {
    return 'order_confirmed';
  }
  if (typeStr.includes('offer') || title.includes('off') || message.includes('off') || message.includes('discount')) {
    return 'offer';
  }
  if (typeStr.includes('promo') || title.includes('promo')) {
    return 'promo';
  }
  if (typeStr.includes('welcome') || title.includes('welcome')) {
    return 'welcome';
  }
  return 'default';
};

// Format relative time based on language
const formatRelativeTime = (dateString: string, language: 'english' | 'arabic' | 'french'): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    if (language === 'arabic') return 'الآن';
    if (language === 'french') return 'À l\'instant';
    return 'Just now';
  }
  if (diffMins < 60) {
    if (language === 'arabic') return `منذ ${diffMins} دقيقة`;
    if (language === 'french') return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    if (language === 'arabic') return `منذ ${diffHours} ساعة`;
    if (language === 'french') return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays === 1) {
    if (language === 'arabic') return 'أمس';
    if (language === 'french') return 'Hier';
    return 'Yesterday';
  }
  if (diffDays < 7) {
    if (language === 'arabic') return `منذ ${diffDays} أيام`;
    if (language === 'french') return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // For older dates, use locale-specific date format
  const locale = language === 'arabic' ? 'ar-SA' : language === 'french' ? 'fr-FR' : 'en-US';
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
};

const NotificationsScreen: React.FC = () => {
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [language, setLanguage] = useState<'english' | 'arabic' | 'french'>('english');
  const [loadingLang, setLoadingLang] = useState(true);
  const insets = useSafeAreaInsets();
  const isRTL = language === 'arabic'; // Only Arabic is RTL, French is LTR

  const {
    liveNotifications,
    clearLiveNotifications,
    markLiveNotificationAsRead,
    reconnectWebSocket,
    refreshUnreadCount,
  } = useNotifications();

  // 🔍 Debug: log live notifications to verify updates
  useEffect(() => {
    console.log('🔔 Live notifications updated:', liveNotifications.length);
  }, [liveNotifications]);

  const allNotifications = useMemo(() => [...liveNotifications, ...dbNotifications], [liveNotifications, dbNotifications]);
  const totalUnreadCount = useMemo(() => allNotifications.filter(n => !n.is_read).length, [allNotifications]);

  // Load language from AsyncStorage when screen focuses
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

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.push('/signin');
        return;
      }

      const response = await axios.get(
        'https://haba-haba-api.ubua.cloud/api/notifications',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setDbNotifications(response.data.notifications);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        router.push('/signin');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const markAsRead = useCallback(async (notificationId: number, isLiveNotification = false) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      if (isLiveNotification) {
        await markLiveNotificationAsRead(notificationId);
      } else {
        setDbNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );

        await axios.post(
          'https://haba-haba-api.ubua.cloud/api/notifications/mark-read',
          { notification_id: notificationId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [markLiveNotificationAsRead]);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const unreadIds = allNotifications.filter(n => !n.is_read).map(n => n.id);
      
      const liveUnreadIds = unreadIds.filter(id => id >= 1000000);
      const dbUnreadIds = unreadIds.filter(id => id < 1000000);

      // Mark live notifications as read
      await Promise.all(liveUnreadIds.map(id => markLiveNotificationAsRead(id)));

      // Update local state for DB notifications
      setDbNotifications(prev =>
        prev.map(notif => (dbUnreadIds.includes(notif.id) ? { ...notif, is_read: true } : notif))
      );

      // Call backend to mark all DB notifications as read
      if (dbUnreadIds.length > 0) {
        await axios.post(
          'https://haba-haba-api.ubua.cloud/api/notifications/mark-all-read',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Optionally refresh unread count
      refreshUnreadCount?.();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [allNotifications, markLiveNotificationAsRead, refreshUnreadCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback((notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id, notification.id >= 1000000);
    }

    const type = notification.data?.type || '';
    if (type.includes('order') || type.includes('assigned')) {
      router.push({
        pathname: `/track-order/${notification.data.order_id}`,
        params: { userLanguage: language },
      });
    } else if (type.includes('offer')) {
      router.push({
        pathname: '/OfferDetailScreen',
        params: { offerId: notification.data.offer_id, userLanguage: language },
      });
    } else if (type.includes('promo')) {
      router.push({
        pathname: '/Offers',
        params: { userLanguage: language },
      });
    }
  }, [markAsRead, language]);

  // Initial fetch on mount (already covered by focus effect, but keep for first load)
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const renderNotificationCard = useCallback((notification: Notification, index: number, isLive = false) => {
    const notifType = determineNotificationType(notification);
    const config = getNotificationConfig(notifType);
    const isUnread = !notification.is_read;

    return (
      <TouchableOpacity
        key={isLive ? `live-${notification.id}` : notification.id || index}
        style={[
          styles.notificationCard,
          isRTL && styles.notificationCardRtl,
          isUnread && styles.notificationCardUnread,
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.85}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.backgroundColor }]}>
          <Ionicons name={config.icon} size={22} color={config.iconColor} />
        </View>

        <View style={[styles.contentContainer, isRTL && styles.contentContainerRtl]}>
          <View style={[styles.titleRow, isRTL && styles.titleRowRtl]}>
            <Text style={[styles.notificationTitle, isRTL && styles.textRtl]} numberOfLines={1}>
              {notification.title}
            </Text>
            {isUnread && <View style={styles.unreadIndicator} />}
          </View>
          <Text style={[styles.notificationMessage, isRTL && styles.textRtl]} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={[styles.notificationTime, isRTL && styles.timeRtl]}>
            {isLive
              ? (language === 'arabic' ? 'الآن' : language === 'french' ? 'À l\'instant' : 'Just now')
              : formatRelativeTime(notification.created_at, language)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleNotificationPress, isRTL, language]);

  // Show loading only while fetching initial language or notifications
  if (loadingLang || loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, isRTL && styles.headerRtl]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'arabic' ? 'التحديثات' : language === 'french' ? 'Mises à jour' : 'Updates'}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const hasNotifications = allNotifications.length > 0;

  // Localized strings
  const headerTitle = language === 'arabic' ? 'التحديثات' : language === 'french' ? 'Mises à jour' : 'Updates';
  const readAllText = language === 'arabic' ? 'قراءة الكل' : language === 'french' ? 'Tout lire' : 'Read All';
  const liveUpdatesText = language === 'arabic' ? 'تحديثات مباشرة' : language === 'french' ? 'Mises à jour en direct' : 'Live Updates';
  const emptyStateTitle = language === 'arabic' ? 'لا توجد إشعارات' : language === 'french' ? 'Aucune notification' : 'No notifications yet';
  const emptyStateSubtext = language === 'arabic'
    ? 'ستظهر الإشعارات هنا عندما يكون هناك شيء جديد'
    : language === 'french'
    ? 'Les notifications apparaîtront ici quand il y aura du nouveau'
    : "You'll see notifications here when there's something new";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRtl]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        {hasNotifications ? (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.readAllText}>{readAllText}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRightPlaceholder} />
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Updates Section */}
        {liveNotifications.length > 0 && (
          <View style={styles.liveSection}>
            <View style={[styles.liveHeader, isRTL && styles.liveHeaderRtl]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveHeaderText}>{liveUpdatesText}</Text>
            </View>
            {liveNotifications.map((notification, index) => renderNotificationCard(notification, index, true))}
          </View>
        )}

        {/* Empty State */}
        {!hasNotifications && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.gray[400]} />
            </View>
            <Text style={[styles.emptyStateText, isRTL && styles.textRtl]}>{emptyStateTitle}</Text>
            <Text style={[styles.emptyStateSubtext, isRTL && styles.textRtl]}>{emptyStateSubtext}</Text>
          </View>
        )}

        {/* All Notifications */}
        {hasNotifications && (
          <View style={styles.notificationsList}>
            {dbNotifications.map((notification, index) => renderNotificationCard(notification, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFBF7',
  },
  headerRtl: {
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
  headerRightPlaceholder: {
    width: 60,
  },
  readAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4B16',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  liveSection: {
    marginBottom: 20,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  liveHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  liveHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationCardRtl: {
    flexDirection: 'row-reverse',
  },
  notificationCardUnread: {
    borderColor: '#8B4B16',
    backgroundColor: '#FFFBF7',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 2,
  },
  contentContainerRtl: {
    marginLeft: 0,
    marginRight: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRowRtl: {
    flexDirection: 'row-reverse',
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
    letterSpacing: -0.3,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.text.light,
    fontWeight: '500',
  },
  textRtl: {
    textAlign: 'right',
  },
  timeRtl: {
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});