// @ts-ignore
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Image } from "expo-image";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SignupHeader from '../assets/images/playStoreLogo.png';

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
};

interface RestaurantSettings {
  is_open: boolean;
  restaurant_logo: string;
  restaurant_home_screen_icon: string;
  restaurant_name: string;
}

// ── Error Message ─────────────────────────────────────────────────────────────
const ErrorMsg = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <View style={s.errorRow}>
      <Ionicons name="alert-circle-outline" size={12} color={C.error} />
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
};

// ── Reusable Field ────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
const SignupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [isChecked, setChecked]     = useState(false);
  const [countryCode]               = useState("+212");
  const [showPassword, setShowPassword] = useState(false);

  const [firstNameFocused,  setFirstNameFocused]  = useState(false);
  const [lastNameFocused,   setLastNameFocused]   = useState(false);
  const [emailFocused,      setEmailFocused]      = useState(false);
  const [phoneFocused,      setPhoneFocused]      = useState(false);
  const [passwordFocused,   setPasswordFocused]   = useState(false);

  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    is_open: true, restaurant_logo: '', restaurant_home_screen_icon: '', restaurant_name: '',
  });

  const fetchRestaurantSettings = async () => {
    try {
      const response = await axios.get("https://haba-haba-api.ubua.cloud/api/auth/restaurant-settings");
      if (response.data.success && response.data.settings) {
        setRestaurantSettings(response.data.settings);
      }
    } catch (error) {
      console.error("Failed to fetch restaurant settings:", error);
    }
  };

  useEffect(() => { fetchRestaurantSettings(); }, []);

  const [errors, setErrors] = useState<{
    firstName?: string; lastName?: string; email?: string;
    phone?: string; password?: string; confirmPassword?: string; terms?: string;
  }>({});

  const handleSignup = async () => {
    const newErrors: typeof errors = {};
    const trimmedPhone = phone.trim();

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim())  newErrors.lastName  = "Last name is required";
    if (!trimmedPhone)     newErrors.phone     = "Phone number is required";
    if (!password)         newErrors.password  = "Password is required";
    if (!isChecked)        newErrors.terms     = "You must agree to the terms";

    if (!newErrors.phone && (trimmedPhone.startsWith("0") || trimmedPhone.startsWith("+212"))) {
      newErrors.phone = "Enter number without 0 or +212";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim() && !emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setErrors({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const fullPhone = `${countryCode}${trimmedPhone}`;
      const response = await fetch("https://haba-haba-api.ubua.cloud/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim() || null,
          password: password.trim(),
          phone: fullPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiErrors: typeof errors = {};
        if (response.status === 409) {
          if (data.message.toLowerCase().includes("phone")) {
            apiErrors.phone = "This phone number is already in use";
          } else {
            apiErrors.email = data.message;
          }
        } else {
          apiErrors.phone = data.message || "Signup failed";
        }
        setErrors(apiErrors);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("client", JSON.stringify(data.client));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");

    } catch (error) {
      console.error("Signup Error:", error);
      setErrors({ phone: "Connection error. Please try again." });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
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

          {/* ── Back Button — mirrors SignIn topNav ── */}
          <Animated.View entering={FadeInDown.delay(40).springify()} style={s.topNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Headline — mirrors SignIn headlineBlock ── */}
          <Animated.View entering={FadeInDown.delay(90).springify()} style={s.headline}>
            <Text style={s.headlineTitle}>Create Account</Text>
            <Text style={s.headlineSub}>Join us today and enjoy authentic Moroccan flavors</Text>
          </Animated.View>

          {/* ── Logo Circle — mirrors SignIn iconWrap ── */}
          <Animated.View entering={FadeInDown.delay(140).springify()} style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Image source={SignupHeader} style={s.iconImg} resizeMode="contain" />
            </View>
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View entering={FadeInDown.delay(190).springify()} style={s.form}>

            {/* Name row */}
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="First Name" focused={firstNameFocused} error={errors.firstName}>
                  <TextInput
                    placeholder="Ahmed"
                    placeholderTextColor={C.textMuted}
                    style={s.input}
                    value={firstName}
                    onChangeText={(t) => { setFirstName(t); if (errors.firstName) setErrors({ ...errors, firstName: undefined }); }}
                    onFocus={() => { setFirstNameFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    onBlur={() => setFirstNameFocused(false)}
                    editable={!loading}
                  />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="Last Name" focused={lastNameFocused} error={errors.lastName}>
                  <TextInput
                    placeholder="Hassan"
                    placeholderTextColor={C.textMuted}
                    style={s.input}
                    value={lastName}
                    onChangeText={(t) => { setLastName(t); if (errors.lastName) setErrors({ ...errors, lastName: undefined }); }}
                    onFocus={() => { setLastNameFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    onBlur={() => setLastNameFocused(false)}
                    editable={!loading}
                  />
                </Field>
              </View>
            </View>

            {/* Email */}
            <Field label="Email Address (Optional)" focused={emailFocused} error={errors.email}>
              <TextInput
                placeholder="your@email.com"
                placeholderTextColor={C.textMuted}
                style={s.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                onFocus={() => { setEmailFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                onBlur={() => setEmailFocused(false)}
                editable={!loading}
              />
            </Field>

            {/* Phone */}
            <View style={s.field}>
              <Text style={s.label}>Phone Number</Text>
              <View style={[s.phoneBox, phoneFocused && s.inputBoxFocused, !!errors.phone && s.inputBoxError]}>
                <View style={s.prefix}>
                  <Text style={s.prefixText}>+212</Text>
                </View>
                <View style={s.phoneDivider} />
                <TextInput
                  placeholder="6XX XXX XXX"
                  placeholderTextColor={C.textMuted}
                  style={s.phoneInput}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => { setPhone(t); if (errors.phone) setErrors({ ...errors, phone: undefined }); }}
                  onFocus={() => { setPhoneFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  onBlur={() => setPhoneFocused(false)}
                  editable={!loading}
                />
              </View>
              <ErrorMsg message={errors.phone} />
            </View>

            {/* Password */}
            <Field label="Password" focused={passwordFocused} error={errors.password}>
              <TextInput
                placeholder="At least 6 characters"
                placeholderTextColor={C.textMuted}
                style={[s.input, { flex: 1 }]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                onFocus={() => { setPasswordFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                onBlur={() => setPasswordFocused(false)}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => { setShowPassword(!showPassword); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={s.eyeBtn} activeOpacity={0.7}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
              </TouchableOpacity>
            </Field>

            {/* Terms */}
            <View style={s.termsRow}>
              <TouchableOpacity
                style={s.checkbox}
                onPress={() => {
                  setChecked(!isChecked);
                  if (errors.terms) setErrors({ ...errors, terms: undefined });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.8}
              >
                <View style={[s.checkboxBox, isChecked && s.checkboxBoxChecked]}>
                  {isChecked && <Ionicons name="checkmark" size={12} color={C.white} />}
                </View>
              </TouchableOpacity>
              <Text style={s.termsText}>
                I agree to the{" "}
                <Text style={s.termsLink} onPress={() => { router.push("/TermsOfService"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  Terms of Service
                </Text>
                {" "}and{" "}
                <Text style={s.termsLink} onPress={() => { router.push("/PrivacyPolicy"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
            {errors.terms && <ErrorMsg message={errors.terms} />}

            {/* CTA */}
            <TouchableOpacity
              style={[s.ctaBtn, (loading || !isChecked) && s.ctaBtnDisabled]}
              onPress={handleSignup}
              disabled={loading || !isChecked}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={s.ctaText}>Create Account</Text>
              }
            </TouchableOpacity>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => { router.push("/signin"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                activeOpacity={0.7}
              >
                <Text style={s.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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

  // ── Top Nav ───────────────────────────────────────────────────────────────
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

  // ── Headline ──────────────────────────────────────────────────────────────
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

  // ── Logo Circle ───────────────────────────────────────────────────────────
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
  iconImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
  },

  // ── Field ─────────────────────────────────────────────────────────────────
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
  eyeBtn: {
    paddingLeft: 10,
  },

  // ── Phone ─────────────────────────────────────────────────────────────────
  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 13,
    backgroundColor: C.white,
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: 14,
    height: '100%',
    backgroundColor: C.prefixBg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    letterSpacing: 0.2,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 13,
    fontSize: 15,
    color: C.text,
    height: '100%',
  },

  // ── Error ─────────────────────────────────────────────────────────────────
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

  // ── Terms ─────────────────────────────────────────────────────────────────
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    marginTop: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: C.brand,
    borderColor: C.brand,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: C.link,
    fontWeight: '600',
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
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

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: C.textSecondary,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
    color: C.brand,
  },
});

export default SignupScreen;