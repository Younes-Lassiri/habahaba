import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// --- Color palette (exactly matching SignupScreen) ---
const C = {
  bg:            '#FFFFFF',
  white:         '#FFFFFF',
  brand:         '#93522B',
  card:          '#F6F5F2',
  text:          '#1A1A1A',
  textSecondary: '#5E5E5E',
  textMuted:     '#9A9A9A',
  border:        '#E5E5E5',
  prefixBg:      '#F2F2F2',
  error:         '#FF3B30',
  errorBg:       '#FFF5F5',
  link:          '#93522B',
  success:       '#34C759', // kept for checkmarks, but you can also use brand
};

// --- Translation helper (same logic, just embedded) ---
const getTranslation = (userLanguage: string) => {
  const isArabic = userLanguage === 'arabic';
  return {
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
    needHelp: isArabic ? 'تحتاج مساعدة بخصوص طلبك؟' : 'Need help with your order?',
    contactSupport: isArabic ? 'تواصل مع فريق الدعم للحصول على المساعدة' : 'Contact our support team for assistance',
    getHelp: isArabic ? 'الحصول على مساعدة' : 'Get Help',
    enterOrderNumber: isArabic ? 'يرجى إدخال رقم الطلب' : 'Please enter your order number',
    loginRequired: isArabic ? 'يرجى تسجيل الدخول لتتبع طلباتك' : 'Please log in to track your orders',
    orderNotFound: isArabic ? 'الطلب غير موجود' : 'Order not found',
    invalidOrderNumber: isArabic ? 'رقم الطلب غير صالح' : 'Invalid order number',
    serverError: isArabic ? 'خطأ في الخادم. يرجى المحاولة مرة أخرى.' : 'Server error. Please try again.',
    networkError: isArabic ? 'خطأ في الشبكة. يرجى التحقق من اتصالك.' : 'Network error. Please check your connection.',
  };
};

// --- Reusable Error Message (exactly from SignupScreen) ---
const ErrorMsg = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <View style={s.errorRow}>
      <Ionicons name="alert-circle-outline" size={12} color={C.error} />
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
};

// --- Reusable Field (exactly from SignupScreen) ---
const Field = ({
  label, focused, error, children,
}: {
  label: string; focused: boolean; error?: string; children: React.ReactNode;
}) => (
  <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <View style={[s.inputBox, focused && s.inputBoxFocused, !!error && s.inputBoxError]}>
      {children}
    </View>
    <ErrorMsg message={error} />
  </View>
);

// --- Main Component ---
interface TrackMyOrdersProps {
  userLanguage?: 'english' | 'arabic';
}

const TrackMyOrders: React.FC<TrackMyOrdersProps> = ({ userLanguage = 'english' }) => {
  const insets = useSafeAreaInsets();
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const userData = await AsyncStorage.getItem('client');
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.id) {
        setError(t.loginRequired);
        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        let apiError = t.serverError;
        if (response.status === 401) apiError = data.message || t.orderNotFound;
        else if (response.status === 400) apiError = data.message || t.invalidOrderNumber;
        setError(apiError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push(`/track-order/${data.order_id}`);
      }
    } catch (err) {
      console.error('Track order error:', err);
      setError(t.networkError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const clearInput = () => {
    setOrderNumber("");
    if (error) setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={[s.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button (same as SignupScreen) */}
          <Animated.View entering={FadeInDown.delay(40).springify()} style={s.topNav}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
          </Animated.View>

          {/* Headline (same as SignupScreen) */}
          <Animated.View entering={FadeInDown.delay(90).springify()} style={s.headline}>
            <Text style={s.headlineTitle}>{t.trackYourOrder}</Text>
            <Text style={s.headlineSub}>
              {isRTL ? 'أدخل رقم الطلب لتتبع حالة التوصيل في الوقت الحقيقي' : 'Enter your order number to track delivery status in real-time'}
            </Text>
          </Animated.View>

          {/* Icon Circle (same style, with location icon) */}
          <Animated.View entering={FadeInDown.delay(140).springify()} style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Ionicons name="location-outline" size={40} color={C.brand} />
            </View>
          </Animated.View>

          {/* Form Section */}
          <Animated.View entering={FadeInDown.delay(190).springify()} style={s.form}>
            {/* Order Number Field */}
            <Field label={t.orderNumber} focused={inputFocused} error={error}>
              <TextInput
                style={[s.input, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t.placeholder}
                placeholderTextColor={C.textMuted}
                value={orderNumber}
                onChangeText={(text) => {
                  setOrderNumber(text);
                  if (error) setError("");
                }}
                onFocus={() => {
                  setInputFocused(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onBlur={() => setInputFocused(false)}
                editable={!loading}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleTrackOrder}
              />
              {orderNumber.length > 0 && !loading && (
                <TouchableOpacity onPress={clearInput} style={s.clearBtn} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </Field>

            {/* Helper text (only when no error) */}
            {!error && (
              <Text style={[s.helperText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t.helperText}
              </Text>
            )}

            {/* Track Button (same as CTA) */}
            <TouchableOpacity
              style={[s.ctaBtn, (loading || !orderNumber.trim()) && s.ctaBtnDisabled]}
              onPress={handleTrackOrder}
              disabled={loading || !orderNumber.trim()}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                  <Text style={s.ctaText}>{t.trackOrder}</Text>
                  <Ionicons name="location" size={20} color={C.white} style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Features List (styled like SignupScreen's terms, with checkmarks) */}
            <View style={s.featuresContainer}>
              <Text style={[s.featuresTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.whatYouCanTrack}</Text>
              <View style={[s.featureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="checkmark-circle" size={18} color={C.brand} />
                <Text style={[s.featureText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.realTimeLocation}</Text>
              </View>
              <View style={[s.featureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="checkmark-circle" size={18} color={C.brand} />
                <Text style={[s.featureText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.statusUpdates}</Text>
              </View>
              <View style={[s.featureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="checkmark-circle" size={18} color={C.brand} />
                <Text style={[s.featureText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.driverInfo}</Text>
              </View>
              <View style={[s.featureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="checkmark-circle" size={18} color={C.brand} />
                <Text style={[s.featureText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.estimatedTime}</Text>
              </View>
            </View>

            {/* Support Card (same card style as SignupScreen's terms area) */}
            <View style={s.supportCard}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <Ionicons name="help-buoy" size={20} color={C.brand} />
                <View style={[s.supportText, { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>
                  <Text style={[s.supportTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.needHelp}</Text>
                  <Text style={[s.supportDescription, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.contactSupport}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.supportButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Add navigation to support if needed
                }}
                activeOpacity={0.7}
              >
                <Text style={s.supportButtonText}>{t.getHelp}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles (exactly copied from SignupScreen and adapted) ---
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
    justifyContent: 'center',
  },
  // Top navigation
  topNav: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Headline
  headline: {
    marginTop: 20,
    marginBottom: 24,
  },
  headlineTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  headlineSub: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
  },
  // Icon circle
  iconWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE8E0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Form container
  form: {
    gap: 16,
  },
  // Field styles
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    letterSpacing: 0.1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    backgroundColor: C.white,
  },
  inputBoxFocused: {
    borderColor: C.brand,
  },
  inputBoxError: {
    borderColor: C.error,
    backgroundColor: C.errorBg,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    padding: 0,
  },
  clearBtn: {
    paddingLeft: 10,
  },
  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: C.error,
    fontWeight: '500',
  },
  // Helper text (extra)
  helperText: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  // CTA Button
  ctaBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#93522B',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  ctaBtnDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.3,
  },
  // Features list
  featuresContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  // Support card
  supportCard: {
    backgroundColor: C.card,
    borderRadius: 13,
    padding: 16,
    marginTop: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  supportText: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  supportDescription: {
    fontSize: 12,
    color: C.textSecondary,
  },
  supportButton: {
    alignSelf: 'flex-start',
    backgroundColor: C.brand + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.brand + '40',
  },
  supportButtonText: {
    color: C.brand,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TrackMyOrders;