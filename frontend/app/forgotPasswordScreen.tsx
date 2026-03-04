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
} from 'react-native';
import axios from 'axios';
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  bg:            '#FFFFFF',
  white:         '#FFFFFF',
  brand:         '#93522B',
  card:          '#F6F5F2',
  text:          '#1A1A1A',
  textSecondary: '#5E5E5E',
  textMuted:     '#9A9A9A',
  border:        '#E5E5E5',
  error:         '#FF3B30',
  errorBg:       '#FFF5F5',
  infoBg:        '#FDF6EF',
  infoBorder:    '#F0DCC8',
};

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail]               = useState('');
  const [loading, setLoading]           = useState(false);
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
      const response = await axios.post(
        'https://haba-haba-api.ubua.cloud/api/auth/forgot-password',
        { email }
      );
      setLoading(false);
      if (response.data.success) {
        if (response.data.resetOnProcess) {
          setResetOnProcess(true);
        } else {
          router.push({
            pathname: "/checkYourEmail",
            params: { email: response.data.email },
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
    router.push({ pathname: "/checkYourEmail", params: { email } });
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Back arrow — outside scroll, always pinned at top ── */}
      <Animated.View
        entering={FadeInDown.delay(40).springify()}
        style={[s.topNav, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.push("/signin")}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Everything else is centered ── */}
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

          {/* ── Headline ── */}
          <Animated.View entering={FadeInDown.delay(90).springify()} style={s.headline}>
            <Text style={s.headlineTitle}>Forgot Password?</Text>
            <Text style={s.headlineSub}>
              No worries — enter your email and we'll send you reset instructions
            </Text>
          </Animated.View>

          {/* ── Lock Icon Circle ── */}
          <Animated.View entering={FadeInDown.delay(140).springify()} style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Ionicons name="lock-closed-outline" size={32} color={C.brand} />
            </View>
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View entering={FadeInDown.delay(190).springify()} style={s.form}>

            {/* Step indicator */}
            <View style={s.stepRow}>
              <View style={s.stepItem}>
                <View style={[s.stepDot, s.stepDotActive]}>
                  <Text style={s.stepNumActive}>1</Text>
                </View>
                <Text style={[s.stepLabel, s.stepLabelActive]}>Request</Text>
              </View>
              <View style={s.stepLine} />
              <View style={s.stepItem}>
                <View style={s.stepDot}>
                  <Text style={s.stepNum}>2</Text>
                </View>
                <Text style={s.stepLabel}>Verify</Text>
              </View>
              <View style={s.stepLine} />
              <View style={s.stepItem}>
                <View style={s.stepDot}>
                  <Text style={s.stepNum}>3</Text>
                </View>
                <Text style={s.stepLabel}>Reset</Text>
              </View>
            </View>

            {/* Email field */}
            <View style={s.field}>
              <Text style={s.label}>Email Address</Text>
              <View style={[s.inputBox, emailFocused && s.inputBoxFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={emailFocused ? C.brand : C.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={s.input}
                  placeholder="your@email.com"
                  placeholderTextColor={C.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  onFocus={() => { setEmailFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
              <Text style={s.hint}>We'll send a secure link to this address</Text>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[s.ctaBtn, loading && s.ctaBtnDisabled]}
              onPress={handleForgotPassword}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={s.ctaText}>Send Reset Link</Text>
              }
            </TouchableOpacity>

            {/* Reset already in progress banner */}
            {resetOnProcess && (
              <TouchableOpacity
                style={s.infoBox}
                onPress={handleGoToCheckEmail}
                activeOpacity={0.75}
              >
                <View style={s.infoBadge}>
                  <Ionicons name="mail" size={18} color={C.white} />
                </View>
                <View style={s.infoContent}>
                  <Text style={s.infoTitle}>Reset Already Sent</Text>
                  <Text style={s.infoText}>Check your inbox for the reset code</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.brand} />
              </TouchableOpacity>
            )}

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerText}>Remember your password? </Text>
              <TouchableOpacity
                onPress={() => { router.push("/signin"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                activeOpacity={0.7}
              >
                <Text style={s.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Back arrow — pinned at top, outside scroll ────────────────────────────
  topNav: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll — flex:1 remaining space, content centered ─────────────────────
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
    justifyContent: 'center',
  },

  // ── Headline ──────────────────────────────────────────────────────────────
  headline: {
    marginBottom: 24,
  },
  headlineTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  headlineSub: {
    fontSize: 14,
    color: '#5E5E5E',
    lineHeight: 20,
  },

  // ── Icon Circle ───────────────────────────────────────────────────────────
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
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  form: {
    gap: 16,
  },

  // ── Step Indicator ────────────────────────────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F2',
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#93522B',
    borderColor: '#93522B',
    ...Platform.select({
      ios: { shadowColor: '#93522B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 5 },
      android: { elevation: 3 },
    }),
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A9A9A',
  },
  stepNumActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9A9A9A',
  },
  stepLabelActive: {
    color: '#93522B',
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 8,
    marginBottom: 18,
  },

  // ── Field ─────────────────────────────────────────────────────────────────
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: 0.1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    borderRadius: 13,
    paddingHorizontal: 13,
    backgroundColor: '#FFFFFF',
  },
  inputBoxFocused: {
    borderColor: '#93522B',
  },
  inputIcon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    padding: 0,
  },
  hint: {
    fontSize: 12,
    color: '#9A9A9A',
    marginTop: 2,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  ctaBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#93522B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...Platform.select({
      ios: { shadowColor: '#93522B', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  ctaBtnDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ── Info Box ──────────────────────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF6EF',
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#F0DCC8',
    borderLeftWidth: 4,
    borderLeftColor: '#93522B',
    padding: 14,
    gap: 12,
  },
  infoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#93522B',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#5E5E5E',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#5E5E5E',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#93522B',
  },
});