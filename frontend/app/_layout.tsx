// app/_layout.tsx
import { useColorScheme } from "@/hooks/use-color-scheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';
import { Provider, useDispatch, useSelector } from "react-redux";
import { RestaurantStatusProvider } from "../contexts/RestaurantStatusContext";
import { ScrollPositionProvider } from "../contexts/ScrollPositionContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { setCartFromStorage } from "./redux/slices/orderSlice";
import { RootState, store } from "./redux/store";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";

// ========== NOTIFICATION CONTEXT ==========
import React, { createContext, useContext } from 'react';
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';

type NotificationContextType = ReturnType<typeof useWebSocketNotifications>;

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notificationData = useWebSocketNotifications();
  return (
    <NotificationContext.Provider value={notificationData}>
      {children}
    </NotificationContext.Provider>
  );
}
// =================================================

// Floating Cart Component - FIXED
function FloatingCart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth(); // This will now work
  const cartItems = useSelector((state: RootState) => state.orders.items);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Debug log to check authentication state
  useEffect(() => {
    console.log('FloatingCart - isAuthenticated:', isAuthenticated);
    console.log('FloatingCart - itemCount:', itemCount);
  }, [isAuthenticated, itemCount]);

  if (!isAuthenticated) {
    console.log('FloatingCart - not authenticated, returning null');
    return null;
  }
  
  if (itemCount === 0) {
    console.log('FloatingCart - cart empty, returning null');
    return null;
  }

  console.log('FloatingCart - rendering');
  return (
    <TouchableOpacity
      style={[
        styles.floatingCart,
        { bottom: insets.bottom + 90, right: 20 }
      ]}
      onPress={() => router.push('/Cart')}
      activeOpacity={0.8}
    >
      <View style={styles.cartContainer}>
        <Ionicons name="cart" size={24} color="#FFFFFF" />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Cart Persistence Component
function CartPersistence() {
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.orders.items);

  useEffect(() => {
    const loadCartFromStorage = async () => {
      try {
        const storedCart = await AsyncStorage.getItem('cartItems');
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart);
          dispatch(setCartFromStorage(parsedCart));
        }
      } catch (error) {
        console.error('Failed to load cart from storage:', error);
      }
    };
    loadCartFromStorage();
  }, [dispatch]);

  useEffect(() => {
    const saveCartToStorage = async () => {
      try {
        await AsyncStorage.setItem('cartItems', JSON.stringify(cartItems));
      } catch (error) {
        console.error('Failed to save cart to storage:', error);
      }
    };
    saveCartToStorage();
  }, [cartItems]);

  return null;
}

// Network Monitor
function NetworkMonitor() {
  const [prevConnectionState, setPrevConnectionState] = useState<boolean | null>(true);
  const [userLanguage, setUserLanguage] = useState<'english' | 'arabic'>('english');

  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        const language = await AsyncStorage.getItem('userLanguage');
        if (language === 'arabic' || language === 'english') {
          setUserLanguage(language);
        }
      } catch (error) {
        console.error('Failed to load user language for network monitor:', error);
      }
    };
    loadUserLanguage();
  }, []);

  const getNetworkMessages = () => {
    if (userLanguage === 'arabic') {
      return {
        noInternet: {
          text1: 'لا يوجد اتصال بالإنترنت',
          text2: 'يرجى التحقق من إعدادات الشبكة'
        },
        connectionRestored: {
          text1: 'تم استعادة الاتصال',
          text2: 'أنت الآن متصل بالإنترنت'
        }
      };
    }
    return {
      noInternet: {
        text1: 'No Internet Connection',
        text2: 'Please check your network settings'
      },
      connectionRestored: {
        text1: 'Connection Restored',
        text2: 'You are back online'
      }
    };
  };

  useEffect(() => {
    const messages = getNetworkMessages();
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected && state.isInternetReachable;
      if (prevConnectionState !== connected) {
        if (!connected) {
          Toast.show({
            type: 'error',
            text1: messages.noInternet.text1,
            text2: messages.noInternet.text2,
            position: 'top',
            visibilityTime: 4000,
            autoHide: true,
            text1Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
            text2Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
          });
        } else if (prevConnectionState === false) {
          Toast.show({
            type: 'success',
            text1: messages.connectionRestored.text1,
            text2: messages.connectionRestored.text2,
            position: 'top',
            visibilityTime: 3000,
            autoHide: true,
            text1Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
            text2Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
          });
        }
        setPrevConnectionState(connected);
      }
    });

    NetInfo.fetch().then((state: NetInfoState) => {
      const connected = state.isConnected && state.isInternetReachable;
      if (!connected) {
        setTimeout(() => {
          Toast.show({
            type: 'error',
            text1: messages.noInternet.text1,
            text2: messages.noInternet.text2,
            position: 'top',
            visibilityTime: 4000,
            autoHide: true,
            text1Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
            text2Style: { textAlign: userLanguage === 'arabic' ? 'right' : 'left' },
          });
        }, 1000);
      }
      setPrevConnectionState(connected);
    });

    return () => {
      unsubscribe();
    };
  }, [prevConnectionState, userLanguage]);

  return null;
}

// Main App Content component that uses auth
function AppContent() {
  const insets = useSafeAreaInsets();
  
  return (
    <>
      <NetworkMonitor />
      <CartPersistence />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="signin" options={{ headerShown: false }} />
        <Stack.Screen name="emailVerification" options={{ headerShown: false }} />
        <Stack.Screen name="forgotPasswordScreen" options={{ headerShown: false }} />
        <Stack.Screen name="resetPasswordScreen" options={{ headerShown: false }} />
        <Stack.Screen name="checkYourEmail" options={{ headerShown: false }} />
        <Stack.Screen name="editProfile" options={{ headerShown: false }} />
        <Stack.Screen name="ProductDetailsPage" options={{ headerShown: false }} />
        <Stack.Screen name="track-order/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="favoriteScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Settings" options={{ headerShown: false }} />
        <Stack.Screen name="delivery" options={{ headerShown: false }} />
        <Stack.Screen name="allProducts" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        <Stack.Screen name="verifyMyPhone" options={{ headerShown: false }} />
        <Stack.Screen name="LoyaltyRewards" options={{ headerShown: false }} />
        <Stack.Screen name="OfferDetailScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Cart" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="ReorderScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Offers" options={{ headerShown: false }} />
        <Stack.Screen name="About" options={{ headerShown: false }} />
        <Stack.Screen name="SupportScreen" options={{ headerShown: false }} />
        <Stack.Screen name="TermsOfService" options={{ headerShown: false }} />
        <Stack.Screen name="PrivacyPolicy" options={{ headerShown: false }} />
      </Stack>
      <FloatingCart />
      <Toast topOffset={insets.top} visibilityTime={4000} />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaProvider style={{ paddingBottom: insets.bottom }}>
      <Provider store={store}>
        <AuthProvider>
          <NotificationProvider>
            <RestaurantStatusProvider>
              <ScrollPositionProvider>
                <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
                  <AppContent />
                  <StatusBar style="auto" />
                </ThemeProvider>
              </ScrollPositionProvider>
            </RestaurantStatusProvider>
          </NotificationProvider>
        </AuthProvider>
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  floatingCart: {
    position: 'absolute',
    zIndex: 999,
  },
  cartContainer: {
    backgroundColor: Colors.primary,
    width: 50,
    height: 50,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});