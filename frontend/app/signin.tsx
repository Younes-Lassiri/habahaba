import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Colors from "@/constants/Colors";
import { registerForPushNotificationsAsync } from "@/utils/notifications";
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  GoogleSignin,
  statusCodes
} from '@react-native-google-signin/google-signin';
import { Picker } from "@react-native-picker/picker";
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoginHeader from '../SignInSignUpHeader/LoginHeader.png';
import { useAuth } from "@/contexts/AuthContext";

const { width, height } = Dimensions.get('window');

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  brown: '#93522B',
  brownDark: '#6B3A1F',
  cream: '#F9F8F3',
  creamDark: '#F0EBE0',
  border: '#E8DDD4',
  borderFocus: '#93522B',
  gray: '#999999',
  grayLight: '#C5BAB0',
  text: '#1A1A1A',
  white: '#FFFFFF',
  googleRed: '#DB4437',
  error: '#EF4444',
};

interface EmailFormProps {
  email: string;
  setEmail: (text: string) => void;
  password: string;
  setPassword: (text: string) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  loading: boolean;
  handleSignIn: () => Promise<void>;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  emailFocused: boolean;
  setEmailFocused: (value: boolean) => void;
  passwordFocused: boolean;
  setPasswordFocused: (value: boolean) => void;
  router: ReturnType<typeof useRouter>;
}

interface RestaurantSettings {
  is_open: boolean;
  restaurant_logo: string;
  restaurant_home_screen_icon: string;
  restaurant_name: string;
}

const EmailForm: React.FC<EmailFormProps> = React.memo(({
  email, setEmail, password, setPassword, rememberMe, setRememberMe,
  loading, handleSignIn, showPassword, setShowPassword,
  emailFocused, setEmailFocused, passwordFocused, setPasswordFocused, router,
}) => {
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  return (
    <>
      {/* Email */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={newStyles.fieldGroup}>
        <Text style={newStyles.label}>Email Address</Text>
        <View style={[newStyles.inputWrap, emailFocused && newStyles.inputWrapFocused]}>
          <Ionicons name="mail-outline" size={18} color={emailFocused ? BRAND.brown : BRAND.grayLight} style={newStyles.inputIcon} />
          <TextInput
            ref={emailInputRef}
            style={newStyles.input}
            placeholder="your@email.com"
            placeholderTextColor={BRAND.grayLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            onFocus={() => { setEmailFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            onBlur={() => setEmailFocused(false)}
            editable={!loading}
          />
        </View>
      </Animated.View>

      {/* Password */}
      <Animated.View entering={FadeInDown.delay(300).springify()} style={newStyles.fieldGroup}>
        <Text style={newStyles.label}>Password</Text>
        <View style={[newStyles.inputWrap, passwordFocused && newStyles.inputWrapFocused]}>
          <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? BRAND.brown : BRAND.grayLight} style={newStyles.inputIcon} />
          <TextInput
            ref={passwordInputRef}
            style={[newStyles.input, { flex: 1 }]}
            placeholder="Enter your password"
            placeholderTextColor={BRAND.grayLight}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => { setPasswordFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            onBlur={() => setPasswordFocused(false)}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => { setShowPassword(!showPassword); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={newStyles.eyeBtn}
            activeOpacity={0.7}
          >
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={BRAND.grayLight} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Forgot password */}
      <Animated.View entering={FadeInDown.delay(380).springify()} style={newStyles.forgotRow}>
        <TouchableOpacity
          onPress={() => { router.push("/forgotPasswordScreen"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          activeOpacity={0.7}
        >
          <Text style={newStyles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Sign In Button */}
      <Animated.View entering={FadeInDown.delay(460).springify()}>
        <TouchableOpacity
          style={[newStyles.signInBtn, loading && { opacity: 0.6 }]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={BRAND.white} />
          ) : (
            <Text style={newStyles.signInBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </>
  );
});

interface PhoneFormProps {
  phone: string;
  setPhone: (text: string) => void;
  password: string;
  setPassword: (text: string) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  countryCode: string;
  setCountryCode: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  phoneFocused: boolean;
  setPhoneFocused: (value: boolean) => void;
  passwordFocused: boolean;
  setPasswordFocused: (value: boolean) => void;
  loading: boolean;
  handlePhoneSignIn: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}

const PhoneForm: React.FC<PhoneFormProps> = React.memo(({
  phone, setPhone, password, setPassword, rememberMe, setRememberMe,
  countryCode, setCountryCode, showPassword, setShowPassword,
  phoneFocused, setPhoneFocused, passwordFocused, setPasswordFocused,
  loading, handlePhoneSignIn, router,
}) => {
  return (
    <>
      {/* Phone */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={newStyles.fieldGroup}>
        <Text style={newStyles.label}>Phone Number</Text>
        <View style={[newStyles.phoneWrap, phoneFocused && newStyles.inputWrapFocused]}>
          <View style={newStyles.countryCodeBox}>
            <Picker
              selectedValue={countryCode}
              onValueChange={(itemValue: string) => { setCountryCode(itemValue); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={newStyles.picker}
            >
              <Picker.Item label="+212" value="+212" />
            </Picker>
          </View>
          <TextInput
            style={newStyles.phoneInput}
            placeholder="Enter phone number"
            placeholderTextColor={BRAND.grayLight}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            onFocus={() => { setPhoneFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            onBlur={() => setPhoneFocused(false)}
          />
        </View>
      </Animated.View>

      {/* Password */}
      <Animated.View entering={FadeInDown.delay(300).springify()} style={newStyles.fieldGroup}>
        <Text style={newStyles.label}>Password</Text>
        <View style={[newStyles.inputWrap, passwordFocused && newStyles.inputWrapFocused]}>
          <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? BRAND.brown : BRAND.grayLight} style={newStyles.inputIcon} />
          <TextInput
            style={[newStyles.input, { flex: 1 }]}
            placeholder="Enter your password"
            placeholderTextColor={BRAND.grayLight}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => { setPasswordFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            onBlur={() => setPasswordFocused(false)}
          />
          <TouchableOpacity
            onPress={() => { setShowPassword(!showPassword); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={newStyles.eyeBtn}
            activeOpacity={0.7}
          >
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={BRAND.grayLight} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Forgot password */}
      <Animated.View entering={FadeInDown.delay(380).springify()} style={newStyles.forgotRow}>
        <TouchableOpacity
          onPress={() => { router.push("/forgotPasswordScreen"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          activeOpacity={0.7}
        >
          <Text style={newStyles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Sign In Button */}
      <Animated.View entering={FadeInDown.delay(460).springify()}>
        <TouchableOpacity
          style={[newStyles.signInBtn, loading && { opacity: 0.6 }]}
          onPress={handlePhoneSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={BRAND.white} />
          ) : (
            <Text style={newStyles.signInBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </>
  );
});

const SignIn: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Email' | 'Phone'>('Email');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const checkToken = async () => {
        const token = await AsyncStorage.getItem('token');
        const deliveryManToken = await AsyncStorage.getItem('DeliveryManToken');
        const adminToken = await AsyncStorage.getItem('adminToken');
        if (token) router.push('/');
        if (adminToken) router.push('/admin/orders');
        if (deliveryManToken) router.push('/delivery/tabs');
      };
      checkToken();
    }, [])
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [countryCode, setCountryCode] = useState('+212');
  const { login } = useAuth(); // ADD THIS LINE
  // Handle login with email (UNCHANGED)
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter both email and password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await fetch("https://haba-haba-api.ubua.cloud/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Login failed", data.message || "Invalid credentials.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (data.admin) {
        await AsyncStorage.setItem("adminToken", data.token);
        await AsyncStorage.setItem("adminData", JSON.stringify(data.admin));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const adminId = data.admin.id;
        if (adminId) await registerForPushNotificationsAsync("admin", adminId);
        else console.error('No client ID found in response!');
        router.push("/admin/orders");
        return;
      }
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("client", JSON.stringify(data.client));
      await login(); // ADD THIS LINE
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const clientId = data.client.id || data.client._id;
      if (clientId) await registerForPushNotificationsAsync("client", clientId);
      else console.error('No client ID found in response!');
      router.push("/");
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert("Error", error.message || "Something went wrong.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phoneNumber: any) => {
    if (!phoneNumber) return '';
    let formattedPhone = phoneNumber.trim().replace(/\s/g, '');
    if (formattedPhone.startsWith('+2120')) formattedPhone = '+212' + formattedPhone.substring(5);
    else if (formattedPhone.startsWith('+212')) { /* correct */ }
    else if (formattedPhone.startsWith('002120')) formattedPhone = '+212' + formattedPhone.substring(6);
    else if (formattedPhone.startsWith('00212')) formattedPhone = '+212' + formattedPhone.substring(5);
    else if (formattedPhone.startsWith('00')) formattedPhone = '+' + formattedPhone.substring(2);
    else if (formattedPhone.startsWith('0')) formattedPhone = '+212' + formattedPhone.substring(1);
    else if (/^\d+$/.test(formattedPhone) && !formattedPhone.startsWith('+')) formattedPhone = '+212' + formattedPhone;
    formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
    if (formattedPhone.length === 13 && formattedPhone.startsWith('+212')) return formattedPhone;
    else { console.warn('Phone number format may be invalid:', phoneNumber, '->', formattedPhone); return formattedPhone; }
  };

  // Handle login with phone (UNCHANGED)
  const handlePhoneSignIn = async () => {
    if (!phone || !password) {
      Alert.alert("Missing fields", "Please enter both phone number and password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const formattedPhone = formatPhoneNumber(phone);
      const response = await fetch("https://haba-haba-api.ubua.cloud/api/auth/login-with-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Login failed", data.message || "Invalid credentials.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("client", JSON.stringify(data.client));
      await login(); // ADD THIS LINE
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const clientId = data.client.id || data.client._id;
      if (clientId) await registerForPushNotificationsAsync("client", clientId);
      else console.error('No client ID found in response!');
      router.push("/");
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert("Error", error.message || "Something went wrong.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/userinfo.email'],
      webClientId: '925005686846-t5dj1p024m13u8lqvvbtadlema5slpjo.apps.googleusercontent.com',
      iosClientId: '925005686846-l7g7sb6eojdcmp793mb55fbpo7l188qt.apps.googleusercontent.com',

      offlineAccess: true,
    });
  }, []);


  const handleGoogleSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoadingGoogle(true);

      // Check if device has Google Play services (Android only)
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const googleResponse = await GoogleSignin.signIn();

      console.log('Google Sign-In Success:', googleResponse);

      // Get the ID token - different method
      const tokens = await GoogleSignin.getTokens();
      const idToken = tokens.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Extract user info - using non-null assertion since we know it exists
      const userInfo = (googleResponse as any).user || (googleResponse as any).data?.user;

      if (!userInfo || !userInfo.email) {
        throw new Error('No user info received from Google');
      }

      // Send token to your backend for verification
      const response = await fetch("https://haba-haba-api.ubua.cloud/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          email: userInfo.email,
          name: userInfo.name || userInfo.givenName,
          photo: userInfo.photo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Google login failed");
      }

      // Save user data
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("client", JSON.stringify(data.client));

      const clientId = data.client && data.client.id;
      if (clientId) {
        await registerForPushNotificationsAsync("client", clientId);
      } else {
        console.error('No client ID found in response!');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push("/");

    } catch (error: any) {
      console.error('Google Sign-In Error:', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Cancelled', 'Sign in was cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('In Progress', 'Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Play Services', 'Google Play services not available');
      } else {
        Alert.alert('Error', error.message || 'Google sign in failed');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoadingGoogle(false);
    }
  };

  // Tab animation (UNCHANGED logic)
  const tabAnimatedStyle = useAnimatedStyle(() => {
    const tabWidth = (width - 96) / 2;
    const translateX = activeTab === 'Email' ? 0 : tabWidth;
    return {
      transform: [{ translateX: withSpring(translateX, { damping: 50, stiffness: 100 }) }],
      width: tabWidth,
    };
  });

  return (
    <SafeAreaView style={[newStyles.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.cream} />

      {/* Floating delivery button (UNCHANGED logic) */}
      <TouchableOpacity
        style={newStyles.floatingDeliveryBtn}
        activeOpacity={0.7}
        onPress={() => { router.push("/delivery/login"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
      >
        <Ionicons name="bicycle-outline" size={20} color={BRAND.brown} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={newStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Top Nav ── */}
          <Animated.View entering={FadeInDown.delay(50).springify()} style={newStyles.topNav}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={newStyles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={BRAND.text} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Headline ── */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={newStyles.headlineBlock}>
            <Text style={newStyles.headline}>Welcome Back</Text>
            <Text style={newStyles.headlineSub}>
              Sign in to continue ordering your favorite Moroccan dishes
            </Text>
          </Animated.View>

          {/* ── Food Icon ── */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={newStyles.iconCircleWrap}>
            <View style={newStyles.iconCircle}>
              <Image
                source={LoginHeader}
                style={newStyles.iconCircleImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* ── Tab Switcher ── */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={newStyles.tabBar}>
            <Animated.View style={[newStyles.tabIndicator, tabAnimatedStyle]} />
            <TouchableOpacity
              style={newStyles.tabBtn}
              onPress={() => { setActiveTab('Email'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              activeOpacity={0.7}
            >
              <Text style={[newStyles.tabText, activeTab === 'Email' && newStyles.tabTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={newStyles.tabBtn}
              onPress={() => { setActiveTab('Phone'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              activeOpacity={0.7}
            >
              <Text style={[newStyles.tabText, activeTab === 'Phone' && newStyles.tabTextActive]}>
                Phone
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Conditional Form ── */}
          <View style={newStyles.formBlock}>
            {activeTab === 'Email' ? (
              <EmailForm
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                rememberMe={rememberMe} setRememberMe={setRememberMe}
                loading={loading} handleSignIn={handleSignIn}
                showPassword={showPassword} setShowPassword={setShowPassword}
                emailFocused={emailFocused} setEmailFocused={setEmailFocused}
                passwordFocused={passwordFocused} setPasswordFocused={setPasswordFocused}
                router={router}
              />
            ) : (
              <PhoneForm
                phone={phone} setPhone={setPhone}
                password={password} setPassword={setPassword}
                rememberMe={rememberMe} setRememberMe={setRememberMe}
                countryCode={countryCode} setCountryCode={setCountryCode}
                showPassword={showPassword} setShowPassword={setShowPassword}
                phoneFocused={phoneFocused} setPhoneFocused={setPhoneFocused}
                passwordFocused={passwordFocused} setPasswordFocused={setPasswordFocused}
                loading={loading} handlePhoneSignIn={handlePhoneSignIn}
                router={router}
              />
            )}
          </View>

          {/* ── OR Divider ── */}
          <Animated.View entering={FadeInDown.delay(560).springify()} style={newStyles.dividerRow}>
            <View style={newStyles.dividerLine} />
            <Text style={newStyles.dividerText}>OR</Text>
            <View style={newStyles.dividerLine} />
          </Animated.View>

          {/* ── Google Button ── */}
          <Animated.View entering={FadeInDown.delay(620).springify()} style={newStyles.socialRow}>
            <TouchableOpacity
              style={newStyles.googleBtn}
              activeOpacity={0.7}
              disabled={loading}
              onPress={handleGoogleSignIn}
            >
              <FontAwesome name="google" size={18} color={BRAND.googleRed} />
              <Text style={newStyles.googleBtnText}>
                {loadingGoogle ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Sign Up Link ── */}
          <Animated.View entering={FadeInDown.delay(680).springify()} style={newStyles.signupRow}>
            <Text style={newStyles.signupText}>Don't have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { router.push("/signup"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            >
              <Text style={newStyles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const newStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.cream,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Floating delivery btn
  floatingDeliveryBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 50,
    right: 20,
    zIndex: 100,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BRAND.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },

  // Top nav
  topNav: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },

  // Headline
  headlineBlock: {
    marginTop: 8,
    marginBottom: 24,
  },
  headline: {
    fontSize: 30,
    fontWeight: '800',
    color: BRAND.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headlineSub: {
    fontSize: 14,
    color: BRAND.gray,
    lineHeight: 20,
    fontWeight: '400',
  },

  // Icon circle
  iconCircleWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F0EAE0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconCircleImage: {
    width: 64,
    height: 64,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EFEAE2',
    borderRadius: 14,
    padding: 4,
    height: 48,
    position: 'relative',
    marginBottom: 24,
  },
  tabIndicator: {
    position: 'absolute',
    height: '100%',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: BRAND.white,
    borderRadius: 10,
    zIndex: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.gray,
  },
  tabTextActive: {
    color: BRAND.brown,
    fontWeight: '700',
  },

  // Form block
  formBlock: {
    width: '100%',
  },

  // Field
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.text,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderRadius: 12,
    backgroundColor: BRAND.white,
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    borderColor: BRAND.brown,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: BRAND.text,
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 6,
  },

  // Phone
  phoneWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderRadius: 12,
    backgroundColor: BRAND.white,
    overflow: 'hidden',
  },
  countryCodeBox: {
    width: 90,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: BRAND.border,
    backgroundColor: BRAND.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    width: '100%',
    height: 52,
    color: BRAND.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    color: BRAND.text,
    height: '100%',
  },

  // Forgot
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.brown,
  },

  // Sign in button
  signInBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: BRAND.brown,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: BRAND.brown, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 5 },
    }),
  },
  signInBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.white,
    letterSpacing: 0.3,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BRAND.border,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.gray,
    letterSpacing: 1,
  },

  // Social
  socialRow: {
    marginBottom: 8,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND.text,
  },

  // Sign up link
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signupText: {
    fontSize: 14,
    color: BRAND.gray,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.brown,
  },
});

export default SignIn;
