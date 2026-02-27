import { Tabs } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useNotifications } from '@/hooks/useNotifications';

// Define tab configuration
type TabConfig = {
  name: string;
  title: { en: string; ar: string; fr: string };
  icon: (props: { color: string; focused: boolean }) => React.ReactNode;
  isCart?: boolean;
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const cartItems = useSelector((state: RootState) => state.orders.items);
  const cartItemCount = cartItems?.length || 0;
  const { unreadCount } = useNotifications();

  // Language from Redux – this updates immediately when dispatch is called
  const language = useSelector((state: RootState) => state.language.current) || 'english';
  const isRTL = language === 'arabic';

  // Translation helper
  const t = (key: { en: string; ar: string; fr: string }): string => {
    if (language === 'arabic') return key.ar;
    if (language === 'french') return key.fr;
    return key.en;
  };

  // Tab definitions
  const tabs: TabConfig[] = [
    {
      name: 'index',
      title: { en: 'Home', ar: 'الرئيسية', fr: 'Accueil' },
      icon: ({ color }) => (
        <Image
          source={require('@/assets/images/habaRestoLogoNav.png')}
          style={styles.homeIcon}
          resizeMode="contain"
        />
      ),
    },
    {
      name: 'orders',
      title: { en: 'Orders', ar: 'الطلبات', fr: 'Commandes' },
      icon: ({ color }) => <Ionicons name="receipt-outline" size={24} color={color} />,
    },
    {
      name: 'cart',
      title: { en: 'Cart', ar: 'السلة', fr: 'Panier' },
      isCart: true,
      icon: ({ color }) => (
        <View style={styles.cartIconContainer}>
          <View style={styles.cartIconBackground}>
            <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
          </View>
          {cartItemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </Text>
            </View>
          )}
        </View>
      ),
    },
    {
      name: 'notifications',
      title: { en: 'Updates', ar: 'التحديثات', fr: 'Mises à jour' },
      icon: ({ color }) => (
        <View style={styles.notificationIconContainer}>
          <Ionicons name="notifications-outline" size={24} color={color} />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      ),
    },
    {
      name: 'profile',
      title: { en: 'Profile', ar: 'الملف الشخصي', fr: 'Profil' },
      icon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
    },
  ];

  // Reverse order for RTL (Arabic)
  const orderedTabs = isRTL ? [...tabs].reverse() : tabs;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: 70,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F1F1F1',
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 5,
        },
      }}
    >
      {orderedTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.title),
            tabBarIcon: tab.icon,
            ...(tab.isCart && {
              tabBarLabel: t(tab.title),
              tabBarLabelPosition: 'below-icon',
            }),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  homeIcon: {
    width: 44,
    height: 44,
  },
  cartIconContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
  },
  cartIconBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  notificationIconContainer: {
    position: 'relative',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: 'red',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 3,
  },
});