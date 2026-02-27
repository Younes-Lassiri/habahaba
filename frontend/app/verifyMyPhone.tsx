import React, { useState, useRef } from "react";
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
  Dimensions,
  Animated,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// ── Palette (aligned with signup & forgot password redesigns) ─────────────
const COLORS = {
  primaryGold: '#C5A065',
  primaryGoldDark: '#9C7C3A',
  primaryGoldLight: '#E8C98A',
  lightGold: '#F9F5EB',
  cream: '#FAF7F2',
  creamDark: '#F2EBD9',
  white: '#FFFFFF',
  darkBrown: '#2C1810',
  deepBrown: '#3D2B1F',
  warmBrown: '#6B4C35',
  darkText: '#1F2937',
  mediumText: '#6B7280',
  lightText: '#9CA3AF',
  inputBorder: '#E8DDD0',
  inputBg: '#FAF8F4',
  inputFocus: '#C5A065',
  error: '#C0392B',
  errorBg: '#FDF0EE',
  errorLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  gradientStart: '#E5C585',
  gradientEnd: '#C5A065',
  divider: '#EDE4D8',
  ornamentGold: '#D4AA70',
  infoGold: '#FEF3E2',
  background: '#F8FAFC',
};

const VerifyMyPhone = () => {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ── Original logic — UNCHANGED ─────────────────────────────────────────
  React.useEffect(() => {
    const verificationCode = code.join("");
    if (verificationCode.length === 6) {
      handleVerify();
    }
  }, [code]);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    if (/^\d*$/.test(text)) {
      newCode[index] = text;
      setCode(newCode);
      setError("");
      if (text && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Please enter all 6 digits");
      triggerShake();
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const userData = await AsyncStorage.getItem('client');
      const client = userData ? JSON.parse(userData) : null;
      if (!client?.id) {
        setError("Client information not found");
        return;
      }
      const response = await fetch('https://haba-haba-api.ubua.cloud/api/auth/verify-my-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          code: verificationCode
        }),
      });
      const data = await response.json();
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccess(true);
        const updatedClient = { ...client, isPhoneVerified: true };
        await AsyncStorage.setItem('client', JSON.stringify(updatedClient));
        setTimeout(() => {
          Alert.alert(
            'Success!',
            'Your phone number has been verified successfully.',
            [{ text: 'Continue', onPress: () => router.back() }]
          );
        }, 500);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(data.message || 'Invalid verification code');
        triggerShake();
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Verification error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Failed to verify code. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const canVerify = code.every(digit => digit !== "");
  // ─────────────────────────────────────────────────────────────────────────

  // ── Decorative Header ─────────────────────────────────────────────────────
  const DecorativeHeader = () => (
    <View style={styles.decorativeHeader}>
      <LinearGradient
        colors={['#2C1810', '#3D2B1F', '#6B4C35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Background decorative circles */}
        <View style={styles.circleTopRight} />
        <View style={styles.circleBottomLeft} />
        <View style={styles.circleSmall} />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButtonHeader}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* Phone icon — top right floating */}
        <View style={styles.phoneIconWrapper}>
          <LinearGradient
            colors={['rgba(229,197,133,0.22)', 'rgba(197,160,101,0.12)']}
            style={styles.phoneIconBg}
          >
            <View style={styles.phoneIconInner}>
              <Ionicons name="phone-portrait-outline" size={32} color={COLORS.primaryGoldLight} />
            </View>
          </LinearGradient>
        </View>

        {/* Header text */}
        <View style={styles.headerContent}>
          {/* Ornament */}
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <View style={styles.ornamentDiamond} />
            <View style={styles.ornamentLine} />
          </View>

          <Text style={styles.headerTitle}>Verify Your Phone</Text>
          <Text style={styles.headerSubtitle}>
            Enter the 6-digit code sent{'\n'}to your phone number
          </Text>

          {/* Phone number pill badge */}
          <View style={styles.phonePill}>
            <Ionicons name="call-outline" size={13} color={COLORS.primaryGold} />
            <Text style={styles.phonePillText}>+212 6XX XXX XXX</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Curved transition */}
      <View style={styles.headerCurve} />
    </View>
  );

  // ── Step Indicator (UI-only) ──────────────────────────────────────────────
  const StepIndicator = () => (
    <View style={styles.stepRow}>
      <View style={styles.stepItem}>
        <View style={[styles.stepDot, styles.stepDotDone]}>
          <Ionicons name="checkmark" size={13} color={COLORS.white} />
        </View>
        <Text style={[styles.stepLabel, styles.stepLabelDone]}>Request</Text>
      </View>
      <View style={styles.stepConnector} />
      <View style={styles.stepItem}>
        <View style={[styles.stepDot, styles.stepDotActive]}>
          <Text style={styles.stepDotText}>2</Text>
        </View>
        <Text style={[styles.stepLabel, styles.stepLabelActive]}>Verify</Text>
      </View>
      <View style={styles.stepConnector} />
      <View style={styles.stepItem}>
        <View style={styles.stepDot}>
          <Text style={styles.stepDotTextInactive}>3</Text>
        </View>
        <Text style={styles.stepLabel}>Done</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepBrown} />
      <View style={styles.background}>
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

            {/* ── Header ── */}
            <DecorativeHeader />

            {/* ── Card ── */}
            <Animated.View
              style={[
                styles.card,
                { transform: [{ translateX: shakeAnimation }] }
              ]}
            >
              {/* Step indicator */}
              <StepIndicator />

              {/* Divider */}
              <View style={styles.divider} />

              {/* Section label */}
              <View style={styles.sectionLabelRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionLabel}>Verification Code</Text>
              </View>

              {/* ── OTP Inputs ── */}
              <View style={styles.otpSection}>
                <View style={styles.codeContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={ref => { inputRefs.current[index] = ref; }}
                      style={[
                        styles.codeInput,
                        digit && styles.codeInputFilled,
                        index === code.findIndex(d => d === "") && styles.codeInputActive,
                        error && styles.codeInputError,
                        success && styles.codeInputSuccess,
                      ]}
                      value={digit}
                      onChangeText={(text) => handleCodeChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      editable={!loading && !success}
                    />
                  ))}
                </View>

                {/* Dots hint row */}
                <View style={styles.dotHintRow}>
                  {code.map((digit, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dotHint,
                        digit && styles.dotHintFilled,
                        error && styles.dotHintError,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* ── Error Banner ── */}
              {error ? (
                <View style={styles.errorBadge}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* ── Verify Button ── */}
              <TouchableOpacity
                style={[styles.button, (loading || !canVerify) && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={loading || !canVerify}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd, COLORS.primaryGoldDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify & Continue</Text>
                      <View style={styles.btnArrow}>
                        <MaterialIcons name="arrow-forward" size={17} color={COLORS.primaryGold} />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* ── Countdown / Resend ── */}
              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <View style={styles.countdownPill}>
                    <Ionicons name="time-outline" size={14} color={COLORS.primaryGold} />
                    <Text style={styles.countdownText}>
                      Resend in <Text style={styles.countdownBold}>{countdown}s</Text>
                    </Text>
                  </View>
                ) : (
                  <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive the code? </Text>
                    <TouchableOpacity
                      disabled={resendLoading || countdown > 0}
                      activeOpacity={0.7}
                    >
                      {resendLoading ? (
                        <ActivityIndicator size="small" color={COLORS.primaryGold} />
                      ) : (
                        <Text style={styles.resendButton}>Resend Code</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* ── Info Box ── */}
              <View style={styles.infoBox}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primaryGold} />
                </View>
                <Text style={styles.infoText}>
                  Code expires in <Text style={styles.infoTextBold}>10 minutes</Text> for your security
                </Text>
              </View>
            </Animated.View>

            {/* ── Footer ── */}
            <View style={styles.footerContainer}>
              <View style={styles.footerDividerRow}>
                <View style={styles.footerDivLine} />
                <Text style={styles.footerDivText}>or</Text>
                <View style={styles.footerDivLine} />
              </View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={16} color={COLORS.primaryGold} />
                <Text style={styles.backText}>Back to Previous</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.deepBrown,
  },
  background: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 40,
  },

  // ── Decorative Header ──────────────────────────────────────────────────────
  decorativeHeader: {
    width: '100%',
    marginBottom: -1,
  },
  headerGradient: {
    width: '100%',
    height: height * 0.36,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
    paddingBottom: 42,
    overflow: 'hidden',
    position: 'relative',
  },
  circleTopRight: {
    position: 'absolute',
    top: -55,
    right: -55,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(197, 160, 101, 0.11)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -45,
    left: -65,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circleSmall: {
    position: 'absolute',
    top: 45,
    right: 75,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 101, 0.26)',
  },
  backButtonHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 20,
    left: 20,
    zIndex: 10,
  },
  backButtonInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  phoneIconWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 16,
    right: 24,
  },
  phoneIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,160,101,0.18)',
  },
  phoneIconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(197,160,101,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ornamentLine: {
    height: 1,
    width: 20,
    backgroundColor: COLORS.ornamentGold,
    opacity: 0.7,
  },
  ornamentDiamond: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.ornamentGold,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 6,
    opacity: 0.9,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 20,
    marginBottom: 14,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197,160,101,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(197,160,101,0.3)',
    gap: 6,
  },
  phonePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryGoldLight,
    letterSpacing: 0.5,
  },
  headerCurve: {
    width: '100%',
    height: 28,
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 22,
    width: width - 32,
    ...Platform.select({
      ios: {
        shadowColor: '#2C1810',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },

  // ── Step Indicator ─────────────────────────────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: COLORS.primaryGold,
    borderColor: COLORS.primaryGold,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryGold,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  stepDotDone: {
    backgroundColor: COLORS.primaryGoldDark,
    borderColor: COLORS.primaryGoldDark,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  stepDotTextInactive: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.lightText,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.lightText,
    letterSpacing: 0.3,
  },
  stepLabelActive: {
    color: COLORS.primaryGold,
  },
  stepLabelDone: {
    color: COLORS.primaryGoldDark,
  },
  stepConnector: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.divider,
    marginHorizontal: 8,
    marginBottom: 18,
  },

  // ── Section ────────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginBottom: 16,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: COLORS.primaryGold,
    marginRight: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warmBrown,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── OTP Inputs ─────────────────────────────────────────────────────────────
  otpSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 64,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    backgroundColor: COLORS.inputBg,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.darkText,
    ...Platform.select({
      ios: {
        shadowColor: '#2C1810',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  codeInputFilled: {
    borderColor: COLORS.primaryGold,
    backgroundColor: COLORS.lightGold,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryGold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
    }),
  },
  codeInputActive: {
    borderColor: COLORS.primaryGold,
    borderWidth: 2.5,
    transform: [{ scale: 1.06 }],
  },
  codeInputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBg,
  },
  codeInputSuccess: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },

  // Small dot indicators beneath OTP boxes
  dotHintRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  dotHint: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.inputBorder,
  },
  dotHintFilled: {
    backgroundColor: COLORS.primaryGold,
  },
  dotHintError: {
    backgroundColor: COLORS.error,
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5C6C6',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    gap: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // ── Button ─────────────────────────────────────────────────────────────────
  button: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryGoldDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  btnArrow: {
    marginLeft: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Countdown / Resend ─────────────────────────────────────────────────────
  resendRow: {
    alignItems: 'center',
    marginBottom: 18,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoGold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F0D9B5',
    gap: 6,
  },
  countdownText: {
    fontSize: 13,
    color: COLORS.warmBrown,
    fontWeight: '500',
  },
  countdownBold: {
    fontWeight: '800',
    color: COLORS.primaryGoldDark,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: COLORS.mediumText,
  },
  resendButton: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryGold,
    letterSpacing: 0.2,
  },

  // ── Info Box ───────────────────────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoGold,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0D9B5',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryGold,
    padding: 13,
    gap: 10,
  },
  infoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(197,160,101,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.mediumText,
    flex: 1,
    lineHeight: 18,
  },
  infoTextBold: {
    fontWeight: '700',
    color: COLORS.warmBrown,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footerContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: width - 32,
  },
  footerDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  footerDivLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  footerDivText: {
    fontSize: 12,
    color: COLORS.lightText,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(197,160,101,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(197,160,101,0.25)',
  },
  backText: {
    color: COLORS.primaryGold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default VerifyMyPhone;
