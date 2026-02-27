import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  I18nManager,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Translation function
const getTranslation = (userLanguage: string) => {
  const isArabic = userLanguage === 'arabic';
  
  return {
    // Header
    trackYourOrder: isArabic ? 'تتبع طلبك' : 'Track Your Order',
    orderNumber: isArabic ? 'رقم الطلب' : 'Order Number',
    placeholder: isArabic ? 'مثال: ORD-123456' : 'e.g., ORD-123456',
    helperText: isArabic ? 'يمكنك العثور على رقم الطلب في بريد تأكيد الطلب' : 'You can find your order number in your order confirmation email',
    trackOrder: isArabic ? 'تتبع الطلب' : 'Track Order',
    whatYouCanTrack: isArabic ? 'ما يمكنك تتبعه:' : 'What you can track:',
    realTimeLocation: isArabic ? 'موقع التوصيل في الوقت الحقيقي' : 'Real-time delivery location',
    statusUpdates: isArabic ? 'تحديثات حالة الطلب' : 'Order status updates',
    driverInfo: isArabic ? 'معلومات السائق والاتصال' : 'Driver information & contact',
    estimatedTime: isArabic ? 'الوقت المتوقع للتوصيل' : 'Estimated delivery time',
    
    // Support
    needHelp: isArabic ? 'تحتاج مساعدة بخصوص طلبك؟' : 'Need help with your order?',
    contactSupport: isArabic ? 'تواصل مع فريق الدعم للحصول على المساعدة' : 'Contact our support team for assistance',
    getHelp: isArabic ? 'الحصول على مساعدة' : 'Get Help',
    
    // Error messages
    enterOrderNumber: isArabic ? 'يرجى إدخال رقم الطلب' : 'Please enter your order number',
    loginRequired: isArabic ? 'يرجى تسجيل الدخول لتتبع طلباتك' : 'Please log in to track your orders',
    orderNotFound: isArabic ? 'الطلب غير موجود' : 'Order not found',
    invalidOrderNumber: isArabic ? 'رقم الطلب غير صالح' : 'Invalid order number',
    serverError: isArabic ? 'خطأ في الخادم. يرجى المحاولة مرة أخرى.' : 'Server error. Please try again.',
    networkError: isArabic ? 'خطأ في الشبكة. يرجى التحقق من اتصالك.' : 'Network error. Please check your connection.',
  };
};

interface TrackMyOrdersProps {
  userLanguage?: 'english' | 'arabic';
}

const TrackMyOrders: React.FC<TrackMyOrdersProps> = ({ userLanguage = 'english' }) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const t = getTranslation(userLanguage);
  const isRTL = userLanguage === 'arabic';
  
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const handleTrackOrder = async () => {
    if (!orderNumber.trim()) {
      setError(t.enterOrderNumber);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get user data from AsyncStorage
      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.id) {
        setError(t.loginRequired);
        setLoading(false);
        return;
      }

      const response = await fetch("https://haba-haba-api.ubua.cloud/api/auth/check-order-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderNumber.trim().toUpperCase(),
          user_id: user.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError(data.message || t.orderNotFound);
        } else if (response.status === 400) {
          setError(data.message || t.invalidOrderNumber);
        } else {
          setError(t.serverError);
        }
        return;
      }

      if (data.success) {
        // Order exists - navigate to track order screen with the order ID from backend
        console.log("✅ Order found, navigating to track order:", data.order_id);
        router.push(`/track-order/${data.order_id}`);
      }

    } catch (err: any) {
      console.error('Track order error:', err);
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    setOrderNumber(text);
    if (error) setError("");
  };
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, {paddingTop: insets.top}]}>
      <LinearGradient
        colors={[Colors.background, Colors.background]}
        style={styles.gradientBackground}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section - Keep centered */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[Colors.primary, Colors.primary]}
                  style={styles.iconGradient}
                >
                  <FontAwesome5 name="shipping-fast" size={32} color={Colors.background} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>{t.trackYourOrder}</Text>
              <Text style={styles.subtitle}>
                {isRTL ? 'أدخل رقم الطلب لتتبع حالة التوصيل في الوقت الحقيقي' : 'Enter your order number to track delivery status in real-time'}
              </Text>
            </View>

            {/* Illustration Section */}
            <View style={styles.illustrationContainer}>
              <View style={styles.illustration}>
                <LinearGradient
                  colors={[Colors.background, Colors.background]}
                  style={styles.illustrationGradient}
                >
                  <FontAwesome5 name="map-marker-alt" size={48} color={Colors.primary} />
                </LinearGradient>
                <View style={styles.truckIcon}>
                  <FontAwesome5 name="truck" size={24} color={Colors.background} />
                </View>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              {/* Order Number Input */}
              <View style={styles.inputGroup}>
                <View style={[styles.label, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <MaterialIcons name="confirmation-number" size={18} color={Colors.text.secondary} />
                  <Text style={[styles.labelText, { textAlign: isRTL ? 'right' : 'left', marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>
                    {t.orderNumber}
                  </Text>
                </View>
                <View style={[
                  styles.inputContainer,
                  inputFocused && styles.inputContainerFocused,
                  error && styles.inputContainerError,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' }
                ]}>
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                    placeholder={t.placeholder}
                    placeholderTextColor={Colors.text.secondary}
                    value={orderNumber}
                    onChangeText={handleInputChange}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    editable={!loading}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={handleTrackOrder}
                  />
                  {orderNumber && !loading && (
                    <TouchableOpacity
                      onPress={() => setOrderNumber("")}
                      style={styles.clearButton}
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.text.secondary} />
                    </TouchableOpacity>
                  )}
                </View>
                {!error && (
                  <Text style={[styles.helperText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.helperText}
                  </Text>
                )}
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <View style={[styles.errorBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="alert-circle" size={20} color={Colors.error} />
                    <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left', marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }]}>
                      {error}
                    </Text>
                  </View>
                </View>
              )}

              {/* Track Button */}
              <TouchableOpacity
                style={[styles.button, (loading || !orderNumber.trim()) && styles.buttonDisabled]}
                onPress={handleTrackOrder}
                disabled={loading || !orderNumber.trim()}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.gradientButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.background} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>{t.trackOrder}</Text>
                      <Ionicons name="location" size={20} color={Colors.background} style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Features List */}
              <View style={styles.featuresContainer}>
                <Text style={[styles.featuresTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.whatYouCanTrack}</Text>
                <View style={[styles.featureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={[styles.featureText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.realTimeLocation}</Text>
                </View>
                <View style={[styles.featureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={[styles.featureText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.statusUpdates}</Text>
                </View>
                <View style={[styles.featureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={[styles.featureText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.driverInfo}</Text>
                </View>
                <View style={[styles.featureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={[styles.featureText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.estimatedTime}</Text>
                </View>
              </View>
            </View>

            {/* Support Info */}
            <View style={styles.supportContainer}>
              <View style={[styles.supportBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="help-buoy" size={20} color={Colors.primary} />
                <View style={[styles.supportText, { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>
                  <Text style={[styles.supportTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.needHelp}</Text>
                  <Text style={[styles.supportDescription, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.contactSupport}
                  </Text>
                </View>
                <TouchableOpacity style={styles.supportButton}>
                  <Text style={styles.supportButtonText}>{t.getHelp}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 40 : 32,
  },
  header: {
    alignItems: "center", // Keep centered
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 12,
    color: Colors.text.primary,
    letterSpacing: -0.5,
    textAlign: 'center', // Center text
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center', // Center text
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  illustration: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  truckIcon: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  formContainer: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 12,
    fontWeight: '600',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  inputContainer: {
    alignItems: 'center',
    width: '100%',
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  inputContainerError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    padding: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  helperText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorContainer: {
    marginBottom: 20,
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    padding: 12,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  button: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.background,
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  featuresContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  featureItem: {
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  supportContainer: {
    width: '100%',
  },
  supportBox: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  supportText: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  supportDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  supportButton: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  supportButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TrackMyOrders;