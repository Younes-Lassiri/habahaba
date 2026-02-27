// @ts-ignore
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import Checkbox from "expo-checkbox";
import { useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  withSpring,
  useAnimatedStyle
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Alert,
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
  Dimensions,
} from "react-native";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from "expo-image";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SignupHeader from '../SignInSignUpHeader/SignupHeader.png';

const { width, height } = Dimensions.get('window');

// Refined Moroccan-inspired palette
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
  inactiveTab: '#F3F4F6',
  inputBorder: '#E8DDD0',
  inputBg: '#FAF8F4',
  inputFocus: '#C5A065',
  error: '#C0392B',
  errorBg: '#FDF0EE',
  success: '#10B981',
  gradientStart: '#E5C585',
  gradientEnd: '#C5A065',
  gradientLightStart: '#F9F5EB',
  gradientLightEnd: '#F2EBD9',
  divider: '#EDE4D8',
  ornamentGold: '#D4AA70',
};

interface RestaurantSettings {
  is_open: boolean;
  restaurant_logo: string;
  restaurant_home_screen_icon: string;
  restaurant_name: string;
}

const SignupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [isChecked, setChecked] = useState<boolean>(false);
  const [countryCode, setCountryCode] = useState<string>("+212");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Focus states for animations
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    is_open: true,
    restaurant_logo: '',
    restaurant_home_screen_icon: '',
    restaurant_name: ''
  });

  const fetchRestaurantSettings = async () => {
    try {
      console.log(" Fetching restaurant settings...");
      const response = await axios.get(
        "https://haba-haba-api.ubua.cloud/api/auth/restaurant-settings"
      );
      if (response.data.success && response.data.settings) {
        console.log(" Restaurant settings fetched:", response.data.settings);
        setRestaurantSettings(response.data.settings);
      } else {
        console.log(" No settings in response:", response.data);
      }
    } catch (error) {
      console.error(" Failed to fetch restaurant settings:", error);
    }
  };

  useEffect(() => {
    fetchRestaurantSettings()
  }, []);

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const handleSignup = async () => {
    const newErrors: typeof errors = {};
    const trimmedPhone = phone.trim();

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!trimmedPhone) newErrors.phone = "Phone number is required";
    if (!password) newErrors.password = "Password is required";
    if (!confirmPassword) newErrors.confirmPassword = "Confirm password is required";
    if (!isChecked) newErrors.terms = "You must agree to the Terms of Service and Privacy Policy";

    if (!newErrors.phone && (trimmedPhone.startsWith("0") || trimmedPhone.startsWith("+212"))) {
      newErrors.phone = "Please enter your number without leading 0 or +212, we add it for you.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
          name: firstName + " " + lastName,
          email,
          password: password.trim(),
          phone: fullPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiErrors: typeof errors = {};
        if (response.status === 409) {
          apiErrors.email = "Email is already registered";
        } else if (data.message) {
          apiErrors.email = data.message;
        } else {
          apiErrors.email = "Signup failed";
        }
        setErrors(apiErrors);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      await AsyncStorage.setItem("tempPassword", password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: "/emailVerification",
        params: { email },
      });
    } catch (error) {
      console.error(error);
      setErrors({ email: "An error occurred. Please try again." });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Decorative Header Component ──────────────────────────────────────────
  const DecorativeHeader = () => (
    <View style={styles.decorativeHeader}>
      <LinearGradient
        colors={['#3D2B1F', '#6B4C35', '#C5A065']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Decorative circles */}
        <View style={styles.circleTopRight} />
        <View style={styles.circleBottomLeft} />
        <View style={styles.circleMiddle} />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* Header content */}
        <View style={styles.headerContent}>
          {/* Ornamental line */}
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <View style={styles.ornamentDiamond} />
            <View style={styles.ornamentLine} />
          </View>

          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>
            Join us & savor authentic{'\n'}Moroccan flavors
          </Text>

          {/* Bottom ornament */}
          <View style={[styles.ornamentRow, { marginTop: 12 }]}>
            <View style={[styles.ornamentLine, { width: 30 }]} />
            <View style={styles.ornamentDiamond} />
            <View style={[styles.ornamentLine, { width: 30 }]} />
          </View>
        </View>
      </LinearGradient>

      {/* Curved bottom edge */}
      <View style={styles.headerCurve} />
    </View>
  );

  // ─── Field Label ──────────────────────────────────────────────────────────
  const FieldLabel = ({ icon, label }: { icon: string; label: string }) => (
    <View style={styles.labelRow}>
      <MaterialIcons name={icon as any} size={14} color={COLORS.primaryGold} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );

  // ─── Error Message ────────────────────────────────────────────────────────
  const ErrorMsg = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorBadge}>
          <Ionicons name="alert-circle" size={13} color={COLORS.error} />
          <Text style={styles.errorText}>{message}</Text>
        </View>
      </View>
    );
  };

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
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Decorative Header ── */}
            <Animated.View entering={FadeInUp.delay(50).springify()} style={{ width: '100%' }}>
              <DecorativeHeader />
            </Animated.View>

            {/* ── Form Card ── */}
            <Animated.View
              entering={FadeInUp.delay(200).springify()}
              style={styles.card}
            >

              {/* Section label */}
              <View style={styles.sectionLabelRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionLabel}>Personal Information</Text>
              </View>

              {/* ── First & Last Name ── */}
              <Animated.View
                entering={FadeInDown.delay(300).springify()}
                style={styles.nameRow}
              >
                {/* First Name */}
                <View style={[styles.inputGroup, { marginRight: 6 }]}>
                  <FieldLabel icon="person" label="First Name" />
                  <View
                    style={[
                      styles.inputContainer,
                      firstNameFocused && styles.inputContainerFocused,
                      errors.firstName && styles.inputContainerError,
                    ]}
                  >
                    <TextInput
                      placeholder="Ahmed"
                      placeholderTextColor={COLORS.lightText}
                      style={styles.input}
                      value={firstName}
                      onChangeText={(text) => {
                        setFirstName(text);
                        if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                      }}
                      onFocus={() => {
                        setFirstNameFocused(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      onBlur={() => setFirstNameFocused(false)}
                      editable={!loading}
                    />
                  </View>
                  <ErrorMsg message={errors.firstName} />
                </View>

                {/* Last Name */}
                <View style={[styles.inputGroup, { marginLeft: 6 }]}>
                  <FieldLabel icon="person" label="Last Name" />
                  <View
                    style={[
                      styles.inputContainer,
                      lastNameFocused && styles.inputContainerFocused,
                      errors.lastName && styles.inputContainerError,
                    ]}
                  >
                    <TextInput
                      placeholder="Hassan"
                      placeholderTextColor={COLORS.lightText}
                      style={styles.input}
                      value={lastName}
                      onChangeText={(text) => {
                        setLastName(text);
                        if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                      }}
                      onFocus={() => {
                        setLastNameFocused(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      onBlur={() => setLastNameFocused(false)}
                      editable={!loading}
                    />
                  </View>
                  <ErrorMsg message={errors.lastName} />
                </View>
              </Animated.View>

              {/* ── Divider ── */}
              <View style={styles.divider} />
              <View style={styles.sectionLabelRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionLabel}>Contact Details</Text>
              </View>

              {/* ── Email ── */}
              <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.fieldWrapper}>
                <FieldLabel icon="email" label="Email Address" />
                <View
                  style={[
                    styles.inputContainer,
                    emailFocused && styles.inputContainerFocused,
                    errors.email && styles.inputContainerError,
                  ]}
                >
                  <View style={styles.inputIconLeft}>
                    <MaterialIcons name="alternate-email" size={16} color={emailFocused ? COLORS.primaryGold : COLORS.lightText} />
                  </View>
                  <TextInput
                    placeholder="your@email.com"
                    placeholderTextColor={COLORS.lightText}
                    style={[styles.input, { paddingLeft: 4 }]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    onFocus={() => {
                      setEmailFocused(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onBlur={() => setEmailFocused(false)}
                    editable={!loading}
                  />
                </View>
                <ErrorMsg message={errors.email} />
              </Animated.View>

              {/* ── Phone ── */}
              <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.fieldWrapper}>
                <FieldLabel icon="phone" label="Phone Number" />
                <View
                  style={[
                    styles.phoneInputContainer,
                    phoneFocused && styles.inputContainerFocused,
                    errors.phone && styles.inputContainerError,
                  ]}
                >
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={countryCode}
                      onValueChange={(itemValue: string) => {
                        setCountryCode(itemValue);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={styles.picker}
                      itemStyle={{ height: 50, color: COLORS.darkText, fontSize: 15 }}
                    >
                      <Picker.Item label="+212" value="+212" />
                    </Picker>
                  </View>
                  <View style={styles.phoneDivider} />
                  <TextInput
                    placeholder="6XX XXX XXX"
                    placeholderTextColor={COLORS.lightText}
                    style={styles.phoneInput}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      if (errors.phone) setErrors({ ...errors, phone: undefined });
                    }}
                    onFocus={() => {
                      setPhoneFocused(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onBlur={() => setPhoneFocused(false)}
                    editable={!loading}
                  />
                </View>
                <ErrorMsg message={errors.phone} />
              </Animated.View>

              {/* ── Divider ── */}
              <View style={styles.divider} />
              <View style={styles.sectionLabelRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionLabel}>Security</Text>
              </View>

              {/* ── Password ── */}
              <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.fieldWrapper}>
                <FieldLabel icon="lock" label="Password" />
                <View
                  style={[
                    styles.inputContainer,
                    passwordFocused && styles.inputContainerFocused,
                    errors.password && styles.inputContainerError,
                  ]}
                >
                  <View style={styles.inputIconLeft}>
                    <MaterialIcons name="lock-outline" size={16} color={passwordFocused ? COLORS.primaryGold : COLORS.lightText} />
                  </View>
                  <TextInput
                    placeholder="At least 6 characters"
                    placeholderTextColor={COLORS.lightText}
                    style={[styles.input, { flex: 1, paddingLeft: 4 }]}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    onFocus={() => {
                      setPasswordFocused(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onBlur={() => setPasswordFocused(false)}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowPassword(!showPassword);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={styles.eyeIcon}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={19}
                      color={COLORS.mediumText}
                    />
                  </TouchableOpacity>
                </View>
                <ErrorMsg message={errors.password} />
              </Animated.View>

              {/* ── Confirm Password ── */}
              <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.fieldWrapper}>
                <FieldLabel icon="lock" label="Confirm Password" />
                <View
                  style={[
                    styles.inputContainer,
                    confirmPasswordFocused && styles.inputContainerFocused,
                    errors.confirmPassword && styles.inputContainerError,
                  ]}
                >
                  <View style={styles.inputIconLeft}>
                    <MaterialIcons name="lock-outline" size={16} color={confirmPasswordFocused ? COLORS.primaryGold : COLORS.lightText} />
                  </View>
                  <TextInput
                    placeholder="Repeat password"
                    placeholderTextColor={COLORS.lightText}
                    style={[styles.input, { flex: 1, paddingLeft: 4 }]}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                    }}
                    onFocus={() => {
                      setConfirmPasswordFocused(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowConfirmPassword(!showConfirmPassword);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={styles.eyeIcon}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={19}
                      color={COLORS.mediumText}
                    />
                  </TouchableOpacity>
                </View>
                <ErrorMsg message={errors.confirmPassword} />
              </Animated.View>

              {/* ── Terms & Conditions ── */}
              <Animated.View
                entering={FadeInDown.delay(800).springify()}
                style={styles.termsWrapper}
              >
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    setChecked(!isChecked);
                    if (errors.terms) setErrors({ ...errors, terms: undefined });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkboxOuter, isChecked && styles.checkboxOuterChecked]}>
                    {isChecked && (
                      <Ionicons name="checkmark" size={14} color={COLORS.white} />
                    )}
                  </View>
                  <Text style={styles.checkboxText}>
                    I agree to the{" "}
                    <Text
                      style={styles.link}
                      onPress={() => {
                        router.push("/TermsOfService");
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      Terms of Service
                    </Text>
                    {" "}and{" "}
                    <Text
                      style={styles.link}
                      onPress={() => {
                        router.push("/PrivacyPolicy");
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>
                <ErrorMsg message={errors.terms} />
              </Animated.View>

              {/* ── CTA Button ── */}
              <Animated.View entering={FadeInDown.delay(900).springify()} style={styles.ctaWrapper}>
                <TouchableOpacity
                  style={[
                    styles.signupBtn,
                    (loading || !isChecked) && styles.signupBtnDisabled,
                  ]}
                  onPress={handleSignup}
                  disabled={loading || !isChecked}
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
                        <Text style={styles.signupText}>Create Account</Text>
                        <View style={styles.btnArrow}>
                          <MaterialIcons name="arrow-forward" size={18} color={COLORS.primaryGold} />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* ── Sign In Footer ── */}
              <Animated.View
                entering={FadeInDown.delay(1000).springify()}
                style={styles.footerContainer}
              >
                <View style={styles.footerDividerRow}>
                  <View style={styles.footerDivLine} />
                  <Text style={styles.footerDivText}>or</Text>
                  <View style={styles.footerDivLine} />
                </View>
                <View style={styles.footerLinkRow}>
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <TouchableOpacity
                    onPress={() => {
                      router.push("/signin");
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.signInLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

            </Animated.View>
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
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 40,
  },

  // ── Decorative Header ──────────────────────────────────────────────────────
  decorativeHeader: {
    width: '100%',
    marginBottom: -1,
  },
  headerGradient: {
    width: '100%',
    height: height * 0.28,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
    paddingBottom: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  // Decorative circles (visual only)
  circleTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(197, 160, 101, 0.15)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -50,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  circleMiddle: {
    position: 'absolute',
    top: 30,
    right: 60,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 101, 0.3)',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 20,
    left: 20,
    zIndex: 10,
  },
  backButtonInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  headerCurve: {
    width: '100%',
    height: 28,
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
  },

  // ── Form Card ─────────────────────────────────────────────────────────────
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

  // ── Section Labels ─────────────────────────────────────────────────────────
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
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 18,
  },

  // ── Fields ────────────────────────────────────────────────────────────────
  nameRow: {
    flexDirection: "row",
    marginBottom: 0,
  },
  inputGroup: {
    flex: 1,
  },
  fieldWrapper: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    gap: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
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
    borderColor: COLORS.primaryGold,
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
  inputContainerError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
    backgroundColor: COLORS.errorBg,
  },
  inputIconLeft: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.darkText,
    padding: 0,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 6,
  },

  // ── Phone ─────────────────────────────────────────────────────────────────
  phoneInputContainer: {
    flexDirection: "row",
    width: "100%",
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
  },
  pickerContainer: {
    width: 92,
    height: '100%',
    justifyContent: 'center',
    backgroundColor: COLORS.creamDark,
  },
  picker: {
    height: 50,
    width: 92,
    color: COLORS.darkText,
  },
  phoneDivider: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.inputBorder,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.darkText,
    height: '100%',
  },

  // ── Errors ────────────────────────────────────────────────────────────────
  errorContainer: {
    marginTop: 5,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },

  // ── Terms ─────────────────────────────────────────────────────────────────
  termsWrapper: {
    marginTop: 18,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxOuterChecked: {
    backgroundColor: COLORS.primaryGold,
    borderColor: COLORS.primaryGold,
  },
  checkboxText: {
    fontSize: 13,
    color: COLORS.mediumText,
    flexShrink: 1,
    lineHeight: 19,
    flex: 1,
  },
  link: {
    color: COLORS.primaryGold,
    fontWeight: "700",
  },

  // ── CTA Button ────────────────────────────────────────────────────────────
  ctaWrapper: {
    marginTop: 20,
  },
  signupBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    width: "100%",
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
  signupBtnDisabled: {
    opacity: 0.6,
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  signupText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 16,
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

  // ── Footer ────────────────────────────────────────────────────────────────
  footerContainer: {
    marginTop: 20,
    alignItems: 'center',
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
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.mediumText,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primaryGold,
    letterSpacing: 0.3,
  },
});

export default SignupScreen;
