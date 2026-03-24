import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

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
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Local language state (not from Redux)
  const [userLanguage, setUserLanguage] = useState<'english' | 'arabic' | 'french'>('english');
  const languageRef = useRef(userLanguage);

  // Poll AsyncStorage every 500ms to detect language changes
  useEffect(() => {
    const checkLanguage = async () => {
      try {
        const lang = await AsyncStorage.getItem('userLanguage');
        if (lang === 'english' || lang === 'arabic' || lang === 'french') {
          if (lang !== languageRef.current) {
            setUserLanguage(lang);
            languageRef.current = lang;
          }
        }
      } catch (error) {
        console.error('Failed to check language:', error);
      }
    };

    // Check immediately on mount
    checkLanguage();

    const interval = setInterval(checkLanguage, 500);
    return () => clearInterval(interval);
  }, []);

  const isRTL = userLanguage === 'arabic';

  // Translation helper – uses local userLanguage
  const t = (key: { en: string; ar: string; fr: string }): string => {
    if (userLanguage === 'arabic') return key.ar;
    if (userLanguage === 'french') return key.fr;
    return key.en;
  };

  // Tabs that require authentication
  const protectedTabs = ['orders', 'cart', 'notifications', 'profile'];

  // Tab definitions (unchanged)
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
        tabBarLabelPosition: 'below-icon', // ← ADD THIS LINE
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
          fontWeight: '700',
          marginBottom: 5,
        },
      }}
    >
      {orderedTabs.map((tab) => {
        const isProtected = protectedTabs.includes(tab.name);

        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              // Change profile tab title to "Login" when not authenticated
              title:
                tab.name === 'profile' && !isAuthenticated
                  ? t({ en: 'Login', ar: 'تسجيل الدخول', fr: 'Connexion' })
                  : t(tab.title),
              tabBarIcon: tab.icon,
              ...(tab.isCart && {
                tabBarLabel: t(tab.title),
                tabBarLabelPosition: 'below-icon',
              }),
              // Custom press handler for protected tabs
              tabBarButton: ({ ref: _ref, ...props }) => (
                <Pressable
                  {...props}
                  onPress={(e) => {
                    if (isProtected && !isAuthenticated) {
                      e.preventDefault();
                      router.push('/signin');
                    } else {
                      props.onPress?.(e);
                    }
                  }}
                >
                  {props.children}
                </Pressable>
              ),
            }}
          />
        );
      })}
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