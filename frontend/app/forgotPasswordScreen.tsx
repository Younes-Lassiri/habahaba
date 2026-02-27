import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// ── Palette (aligned with signup redesign) ────────────────────────────────
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
  gradientStart: '#E5C585',
  gradientEnd: '#C5A065',
  divider: '#EDE4D8',
  ornamentGold: '#D4AA70',
  infoGold: '#FEF3E2',
};

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetOnProcess, setResetOnProcess] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  // ── Original logic — UNCHANGED ───────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('https://haba-haba-api.ubua.cloud/api/auth/forgot-password', { email });
      setLoading(false);
      if (response.data.success) {
        if (response.data.resetOnProcess) {
          setResetOnProcess(true);
        } else {
          router.push({
            pathname: "/checkYourEmail",
            params: { email: response.data.email }
          });
        }
      } else {
        Alert.alert('Error', response.data.message || 'Something went wrong');
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      Alert.alert('Error', 'Failed to send reset email');
    }
  };

  const handleGoToCheckEmail = () => {
    router.push({
      pathname: "/checkYourEmail",
      params: { email }
    });
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── Step Indicator (UI-only, visual guide) ────────────────────────────────
  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {/* Step 1 — active */}
      <View style={styles.stepItem}>
        <View style={[styles.stepDot, styles.stepDotActive]}>
          <Text style={styles.stepDotText}>1</Text>
        </View>
        <Text style={[styles.stepLabel, styles.stepLabelActive]}>Request</Text>
      </View>

      <View style={styles.stepConnector} />

      {/* Step 2 — inactive */}
      <View style={styles.stepItem}>
        <View style={styles.stepDot}>
          <Text style={styles.stepDotTextInactive}>2</Text>
        </View>
        <Text style={styles.stepLabel}>Verify</Text>
      </View>

      <View style={styles.stepConnector} />

      {/* Step 3 — inactive */}
      <View style={styles.stepItem}>
        <View style={styles.stepDot}>
          <Text style={styles.stepDotTextInactive}>3</Text>
        </View>
        <Text style={styles.stepLabel}>Reset</Text>
      </View>
    </View>
  );

  // ── Decorative Header ─────────────────────────────────────────────────────
  const DecorativeHeader = () => (
    <View style={styles.decorativeHeader}>
      <LinearGradient
        colors={['#2C1810', '#3D2B1F', '#6B4C35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Background circles */}
        <View style={styles.circleTopRight} />
        <View style={styles.circleBottomLeft} />
        <View style={styles.circleSmall} />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButtonHeader}
          onPress={() => router.push("/signin")}
          activeOpacity={0.8}
        >
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* Lock icon */}
        <View style={styles.lockIconWrapper}>
          <LinearGradient
            colors={['rgba(229,197,133,0.25)', 'rgba(197,160,101,0.15)']}
            style={styles.lockIconBg}
          >
            <View style={styles.lockIconInner}>
              <MaterialIcons name="lock-outline" size={36} color={COLORS.primaryGoldLight} />
            </View>
          </LinearGradient>
        </View>

        {/* Title content */}
        <View style={styles.headerContent}>
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <View style={styles.ornamentDiamond} />
            <View style={styles.ornamentLine} />
          </View>
          <Text style={styles.headerTitle}>Forgot Password?</Text>
          <Text style={styles.headerSubtitle}>
            No worries — we'll send you{'\n'}reset instructions right away
          </Text>
        </View>
      </LinearGradient>

      {/* Curved bottom transition */}
      <View style={styles.headerCurve} />
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

            {/* ── Decorative Header ── */}
            <DecorativeHeader />

            {/* ── Main Card ── */}
            <View style={styles.card}>

              {/* Step indicator */}
              <StepIndicator />

              {/* Divider */}
              <View style={styles.divider} />

              {/* Section label */}
              <View style={styles.sectionLabelRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionLabel}>Enter Your Email</Text>
              </View>

              {/* ── Email Input ── */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <MaterialIcons name="email" size={14} color={COLORS.primaryGold} />
                  <Text style={styles.label}> Email Address</Text>
                </View>
                <View style={[
                  styles.inputContainer,
                  emailFocused && styles.inputContainerFocused,
                ]}>
                  <View style={styles.inputIconLeft}>
                    <MaterialIcons
                      name="alternate-email"
                      size={16}
                      color={emailFocused ? COLORS.primaryGold : COLORS.lightText}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={COLORS.lightText}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>

                {/* Helper hint */}
                <Text style={styles.inputHint}>
                  We'll send a secure link to this address
                </Text>
              </View>

              {/* ── Submit Button ── */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={loading}
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
                      <Text style={styles.buttonText}>Send Reset Link</Text>
                      <View style={styles.btnArrow}>
                        <MaterialIcons name="arrow-forward" size={17} color={COLORS.primaryGold} />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* ── Reset On Process Banner ── */}
              {resetOnProcess && (
                <TouchableOpacity
                  style={styles.infoBox}
                  onPress={handleGoToCheckEmail}
                  activeOpacity={0.75}
                >
                  <View style={styles.infoBadge}>
                    <Ionicons name="mail" size={18} color={COLORS.white} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Reset Already Sent</Text>
                    <Text style={styles.infoText}>Check your inbox for the reset code</Text>
                  </View>
                  <View style={styles.infoChevron}>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.primaryGold} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Footer: Back to Sign In ── */}
            <View style={styles.footerContainer}>
              <View style={styles.footerDividerRow}>
                <View style={styles.footerDivLine} />
                <Text style={styles.footerDivText}>or</Text>
                <View style={styles.footerDivLine} />
              </View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push("/signin")}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={16} color={COLORS.primaryGold} />
                <Text style={styles.backText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

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
    height: height * 0.34,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  circleTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(197, 160, 101, 0.12)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  circleSmall: {
    position: 'absolute',
    top: 40,
    right: 70,
    width: 55,
    height: 55,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 101, 0.28)',
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
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  lockIconWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 16,
    right: 24,
  },
  lockIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,160,101,0.2)',
  },
  lockIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(197,160,101,0.15)',
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
    letterSpacing: 0.1,
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
      android: {
        elevation: 6,
      },
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
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
    marginBottom: 14,
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

  // ── Input ──────────────────────────────────────────────────────────────────
  inputGroup: {
    marginBottom: 22,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.inputBg,
  },
  inputContainerFocused: {
    borderColor: COLORS.inputFocus,
    borderWidth: 2,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryGold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
    }),
  },
  inputIconLeft: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.darkText,
    padding: 0,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 6,
    marginLeft: 2,
    letterSpacing: 0.1,
  },

  // ── Button ─────────────────────────────────────────────────────────────────
  button: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryGoldDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
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

  // ── Info Box (resetOnProcess) ──────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoGold,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F0D9B5',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryGold,
    padding: 14,
    marginTop: 4,
  },
  infoBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryGold,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryGold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.mediumText,
  },
  infoChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(197,160,101,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
