import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from 'react';
import { registerForPushNotificationsAsync } from "@/utils/notifications";
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
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
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoginHeader from '../assets/images/playStoreLogo.png';
import { useAuth } from "@/contexts/AuthContext";

const { width } = Dimensions.get('window');

const C = {
  brand:        '#93522B',
  bg:           '#FFFFFF',
  card:         '#F6F5F2',
  prefixBg:     '#F2F2F2',
  tabBg:        '#F0EDE8',
  white:        '#FFFFFF',
  text:         '#1A1A1A',
  textSub:      '#5E5E5E',
  textMuted:    '#9A9A9A',
  border:       '#E5E5E5',
  error:        '#FF3B30',
  googleRed:    '#DB4437',
};

// ─── Translation dictionary ─────────────────────────────────────────────────
const translations = {
  headlineTitle:   { en: 'Welcome Back', ar: 'مرحبًا بعودتك', fr: 'Bon retour' },
  headlineSub:     { en: 'Sign in to continue ordering your favorite Moroccan dishes', ar: 'سجل الدخول لمتابعة طلب أطباقك المغربية المفضلة', fr: 'Connectez‑vous pour continuer à commander vos plats marocains préférés' },
  emailLabel:      { en: 'Email Address', ar: 'البريد الإلكتروني', fr: 'Adresse e‑mail' },
  emailPlaceholder:{ en: 'your@email.com', ar: 'بريدك@ example.com', fr: 'votre@email.com' },
  passwordLabel:   { en: 'Password', ar: 'كلمة المرور', fr: 'Mot de passe' },
  passwordPlaceholder: { en: 'Enter your password', ar: 'أدخل كلمة المرور', fr: 'Entrez votre mot de passe' },
  phoneLabel:      { en: 'Phone Number', ar: 'رقم الهاتف', fr: 'Numéro de téléphone' },
  phonePlaceholder:{ en: '6XX XXX XXX', ar: '٦XX XXX XXX', fr: '6XX XXX XXX' },
  forgotPassword:  { en: 'Forgot Password?', ar: 'نسيت كلمة المرور؟', fr: 'Mot de passe oublié ?' },
  signIn:          { en: 'Sign In', ar: 'تسجيل الدخول', fr: 'Se connecter' },
  or:              { en: 'OR', ar: 'أو', fr: 'OU' },
  continueWithGoogle: { en: 'Continue with Google', ar: 'متابعة عبر جوجل', fr: 'Continuer avec Google' },
  noAccount:       { en: "Don't have an account? ", ar: 'ليس لديك حساب؟ ', fr: 'Pas de compte ? ' },
  signUp:          { en: 'Sign Up', ar: 'تسجيل حساب', fr: "S'inscrire" },
  selectLanguage:  { en: 'Select Language', ar: 'اختر اللغة', fr: 'Choisir la langue' },
  emailTab:        { en: 'Email', ar: 'البريد الإلكتروني', fr: 'E-mail' },
  phoneTab:        { en: 'Phone', ar: 'الهاتف', fr: 'Téléphone' },
};

// ─── Standalone sub-components with RTL support ─────────────────────────────
interface EmailFormProps {
  email: string; setEmail: (t: string) => void;
  password: string; setPassword: (t: string) => void;
  loading: boolean; handleSignIn: () => Promise<void>;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  emailFocused: boolean; setEmailFocused: (v: boolean) => void;
  passwordFocused: boolean; setPasswordFocused: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
  t: (key: { en: string; ar: string; fr: string }) => string;
  isRTL: boolean;
}

const EmailForm: React.FC<EmailFormProps> = React.memo(({
  email, setEmail, password, setPassword,
  loading, handleSignIn,
  showPassword, setShowPassword,
  emailFocused, setEmailFocused,
  passwordFocused, setPasswordFocused,
  router, t, isRTL
}) => (
  <>
    {/* Email */}
    <Animated.View entering={FadeInDown.delay(200).springify()} style={s.fieldGroup}>
      <Text style={[s.label, isRTL && s.textRTL]}>{t(translations.emailLabel)}</Text>
      <View style={[s.inputBox, emailFocused && s.inputBoxFocused]}>
        <Ionicons
          name="mail-outline" size={17}
          color={emailFocused ? C.brand : C.textMuted}
          style={s.inputIcon}
        />
        <TextInput
          style={[s.input, isRTL && s.inputRTL]}
          placeholder={t(translations.emailPlaceholder)}
          placeholderTextColor={C.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          onFocus={() => { setEmailFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          onBlur={() => setEmailFocused(false)}
          editable={!loading}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>
    </Animated.View>

    {/* Password */}
    <Animated.View entering={FadeInDown.delay(300).springify()} style={s.fieldGroup}>
      <Text style={[s.label, isRTL && s.textRTL]}>{t(translations.passwordLabel)}</Text>
      <View style={[s.inputBox, passwordFocused && s.inputBoxFocused]}>
        <Ionicons
          name="lock-closed-outline" size={17}
          color={passwordFocused ? C.brand : C.textMuted}
          style={s.inputIcon}
        />
        <TextInput
          style={[s.input, isRTL && s.inputRTL, { flex: 1 }]}
          placeholder={t(translations.passwordPlaceholder)}
          placeholderTextColor={C.textMuted}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          onFocus={() => { setPasswordFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          onBlur={() => setPasswordFocused(false)}
          editable={!loading}
          textAlign={isRTL ? 'right' : 'left'}
        />
        <TouchableOpacity
          onPress={() => { setShowPassword(!showPassword); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={s.eyeBtn} activeOpacity={0.7}
        >
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>

    {/* Forgot */}
    <Animated.View entering={FadeInDown.delay(360).springify()} style={[s.forgotRow, isRTL && s.forgotRowRTL]}>
      <TouchableOpacity
        onPress={() => { router.push("/forgotPasswordScreen"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        activeOpacity={0.7}
      >
        <Text style={[s.forgotText, isRTL && s.textRTL]}>{t(translations.forgotPassword)}</Text>
      </TouchableOpacity>
    </Animated.View>

    {/* CTA */}
    <Animated.View entering={FadeInDown.delay(420).springify()}>
      <TouchableOpacity
        style={[s.ctaBtn, loading && s.ctaBtnDisabled]}
        onPress={handleSignIn}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color={C.white} />
          : <Text style={s.ctaText}>{t(translations.signIn)}</Text>
        }
      </TouchableOpacity>
    </Animated.View>
  </>
));

interface PhoneFormProps {
  phone: string; setPhone: (t: string) => void;
  password: string; setPassword: (t: string) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  phoneFocused: boolean; setPhoneFocused: (v: boolean) => void;
  passwordFocused: boolean; setPasswordFocused: (v: boolean) => void;
  loading: boolean; handlePhoneSignIn: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
  t: (key: { en: string; ar: string; fr: string }) => string;
  isRTL: boolean;
}

const PhoneForm: React.FC<PhoneFormProps> = React.memo(({
  phone, setPhone, password, setPassword,
  showPassword, setShowPassword,
  phoneFocused, setPhoneFocused,
  passwordFocused, setPasswordFocused,
  loading, handlePhoneSignIn, router, t, isRTL
}) => (
  <>
    {/* Phone */}
    <Animated.View entering={FadeInDown.delay(200).springify()} style={s.fieldGroup}>
      <Text style={[s.label, isRTL && s.textRTL]}>{t(translations.phoneLabel)}</Text>
      <View style={[s.phoneBox, phoneFocused && s.inputBoxFocused]}>
        <View style={s.prefix}>
          <Text style={s.prefixText}>+212</Text>
        </View>
        <View style={s.phoneDivider} />
        <TextInput
          style={[s.phoneInput, isRTL && s.inputRTL]}
          placeholder={t(translations.phonePlaceholder)}
          placeholderTextColor={C.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          onFocus={() => { setPhoneFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          onBlur={() => setPhoneFocused(false)}
          editable={!loading}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>
    </Animated.View>

    {/* Password */}
    <Animated.View entering={FadeInDown.delay(300).springify()} style={s.fieldGroup}>
      <Text style={[s.label, isRTL && s.textRTL]}>{t(translations.passwordLabel)}</Text>
      <View style={[s.inputBox, passwordFocused && s.inputBoxFocused]}>
        <Ionicons
          name="lock-closed-outline" size={17}
          color={passwordFocused ? C.brand : C.textMuted}
          style={s.inputIcon}
        />
        <TextInput
          style={[s.input, isRTL && s.inputRTL, { flex: 1 }]}
          placeholder={t(translations.passwordPlaceholder)}
          placeholderTextColor={C.textMuted}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          onFocus={() => { setPasswordFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          onBlur={() => setPasswordFocused(false)}
          editable={!loading}
          textAlign={isRTL ? 'right' : 'left'}
        />
        <TouchableOpacity
          onPress={() => { setShowPassword(!showPassword); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={s.eyeBtn} activeOpacity={0.7}
        >
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>

    {/* Forgot */}
    <Animated.View entering={FadeInDown.delay(360).springify()} style={[s.forgotRow, isRTL && s.forgotRowRTL]}>
      <TouchableOpacity
        onPress={() => { router.push("/forgotPasswordScreen"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        activeOpacity={0.7}
      >
        <Text style={[s.forgotText, isRTL && s.textRTL]}>{t(translations.forgotPassword)}</Text>
      </TouchableOpacity>
    </Animated.View>

    {/* CTA */}
    <Animated.View entering={FadeInDown.delay(420).springify()}>
      <TouchableOpacity
        style={[s.ctaBtn, loading && s.ctaBtnDisabled]}
        onPress={handlePhoneSignIn}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color={C.white} />
          : <Text style={s.ctaText}>{t(translations.signIn)}</Text>
        }
      </TouchableOpacity>
    </Animated.View>
  </>
));

// ─── Tab bar constants ──────────────────────────────────────────────────────
const TAB_BAR_INNER_PAD = 4;
const SCREEN_H_PAD = 24;
const TAB_WIDTH = (width - SCREEN_H_PAD * 2 - TAB_BAR_INNER_PAD * 2) / 2;

// ─── Main Component ─────────────────────────────────────────────────────────
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [countryCode, setCountryCode] = useState('+212');
  const { login } = useAuth();

  // ── Language state ───────────────────────────────────────────────────────
  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'arabic' | 'french'>('english');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const languages = ['English', 'Arabic', 'French'];
  const isRTL = currentLanguage === 'arabic';

  // Load saved language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('userLanguage');
      if (storedLang && (storedLang === 'english' || storedLang === 'arabic' || storedLang === 'french')) {
        setCurrentLanguage(storedLang);
      }
    };
    loadLanguage();
  }, []);

  // Translation helper
  const t = (key: { en: string; ar: string; fr: string }): string => {
    if (currentLanguage === 'arabic') return key.ar;
    if (currentLanguage === 'french') return key.fr;
    return key.en;
  };

  // ── Auth handlers (with translated alerts) ───────────────────────────────
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

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(t({ en: "Missing fields", ar: "حقول مفقودة", fr: "Champs manquants" }),
                  t({ en: "Please enter both email and password.", ar: "الرجاء إدخال البريد الإلكتروني وكلمة المرور.", fr: "Veuillez saisir l'email et le mot de passe." }));
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
        Alert.alert(t({ en: "Login failed", ar: "فشل تسجيل الدخول", fr: "Échec de la connexion" }),
                    data.message || t({ en: "Invalid credentials.", ar: "بيانات اعتماد غير صالحة.", fr: "Identifiants invalides." }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (data.admin) {
        await AsyncStorage.setItem("adminToken", data.token);
        await AsyncStorage.setItem("adminData", JSON.stringify(data.admin));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const adminId = data.admin.id;
        if (adminId) await registerForPushNotificationsAsync("admin", adminId);
        else console.error('No admin ID found!');
        router.push("/admin/orders");
        return;
      }
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("client", JSON.stringify(data.client));
      await login();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const clientId = data.client.id || data.client._id;
      if (clientId) await registerForPushNotificationsAsync("client", clientId);
      else console.error('No client ID found!');
      router.push("/");
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert(t({ en: "Error", ar: "خطأ", fr: "Erreur" }),
                  error.message || t({ en: "Something went wrong.", ar: "حدث خطأ ما.", fr: "Quelque chose s'est mal passé." }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phoneNumber: any) => {
    if (!phoneNumber) return '';
    let p = phoneNumber.trim().replace(/\s/g, '');
    if (p.startsWith('+2120')) p = '+212' + p.substring(5);
    else if (p.startsWith('+212')) { /* correct */ }
    else if (p.startsWith('002120')) p = '+212' + p.substring(6);
    else if (p.startsWith('00212')) p = '+212' + p.substring(5);
    else if (p.startsWith('00')) p = '+' + p.substring(2);
    else if (p.startsWith('0')) p = '+212' + p.substring(1);
    else if (/^\d+$/.test(p) && !p.startsWith('+')) p = '+212' + p;
    p = p.replace(/[^\d+]/g, '');
    if (p.length === 13 && p.startsWith('+212')) return p;
    else { console.warn('Phone number format may be invalid:', phoneNumber, '->', p); return p; }
  };

  const handlePhoneSignIn = async () => {
    if (!phone || !password) {
      Alert.alert(t({ en: "Missing fields", ar: "حقول مفقودة", fr: "Champs manquants" }),
                  t({ en: "Please enter both phone number and password.", ar: "الرجاء إدخال رقم الهاتف وكلمة المرور.", fr: "Veuillez saisir le numéro de téléphone et le mot de passe." }));
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
        Alert.alert(t({ en: "Login failed", ar: "فشل تسجيل الدخول", fr: "Échec de la connexion" }),
                    data.message || t({ en: "Invalid credentials.", ar: "بيانات اعتماد غير صالحة.", fr: "Identifiants invalides." }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("client", JSON.stringify(data.client));
      await login();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const clientId = data.client.id || data.client._id;
      if (clientId) await registerForPushNotificationsAsync("client", clientId);
      else console.error('No client ID found!');
      router.push("/");
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert(t({ en: "Error", ar: "خطأ", fr: "Erreur" }),
                  error.message || t({ en: "Something went wrong.", ar: "حدث خطأ ما.", fr: "Quelque chose s'est mal passé." }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ── Tab indicator animation with RTL support ─────────────────────────────
  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: withSpring(
        isRTL
          ? (activeTab === 'Email' ? TAB_WIDTH : 0)
          : (activeTab === 'Email' ? 0 : TAB_WIDTH),
        { damping: 20, stiffness: 180, mass: 0.6 }
      ),
    }],
  }));

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Top right buttons: Language + Delivery */}
      <View style={[s.topRightButtons, { top: Platform.OS === 'ios' ? 54 : 50 }]}>
        <TouchableOpacity
          style={s.iconButton}
          onPress={() => setShowLanguageModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="language-outline" size={22} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.iconButton}
          onPress={() => { router.push("/delivery/login"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          activeOpacity={0.7}
        >
          <Ionicons name="bicycle-outline" size={22} color={C.brand} />
        </TouchableOpacity>
      </View>

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
          {/* Back button - always arrow-back (no flip) */}
          <Animated.View entering={FadeInDown.delay(40).springify()} style={s.topNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
          </Animated.View>

          {/* Headline with RTL text alignment */}
          <Animated.View entering={FadeInDown.delay(90).springify()} style={s.headline}>
            <Text style={[s.headlineTitle, isRTL && s.textRTL]}>{t(translations.headlineTitle)}</Text>
            <Text style={[s.headlineSub, isRTL && s.textRTL]}>{t(translations.headlineSub)}</Text>
          </Animated.View>

          {/* Icon */}
          <Animated.View entering={FadeInDown.delay(140).springify()} style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Image source={LoginHeader} style={s.iconImg} resizeMode="contain"/>
            </View>
          </Animated.View>

          {/* Tab Switcher – order reversed in RTL, labels translated */}
          <Animated.View entering={FadeInDown.delay(190).springify()} style={s.tabBar}>
            <Animated.View style={[s.tabIndicator, { width: TAB_WIDTH }, tabIndicatorStyle]} />
            {isRTL ? (
              // RTL order: Phone first, Email second
              <>
                <TouchableOpacity
                  style={[s.tabBtn, { width: TAB_WIDTH }]}
                  onPress={() => { setActiveTab('Phone'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabText, activeTab === 'Phone' && s.tabTextActive]}>
                    {t(translations.phoneTab)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.tabBtn, { width: TAB_WIDTH }]}
                  onPress={() => { setActiveTab('Email'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabText, activeTab === 'Email' && s.tabTextActive]}>
                    {t(translations.emailTab)}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // LTR order: Email first, Phone second
              <>
                <TouchableOpacity
                  style={[s.tabBtn, { width: TAB_WIDTH }]}
                  onPress={() => { setActiveTab('Email'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabText, activeTab === 'Email' && s.tabTextActive]}>
                    {t(translations.emailTab)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.tabBtn, { width: TAB_WIDTH }]}
                  onPress={() => { setActiveTab('Phone'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabText, activeTab === 'Phone' && s.tabTextActive]}>
                    {t(translations.phoneTab)}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* Form */}
          <View style={s.form}>
            {activeTab === 'Email' ? (
              <EmailForm
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                loading={loading} handleSignIn={handleSignIn}
                showPassword={showPassword} setShowPassword={setShowPassword}
                emailFocused={emailFocused} setEmailFocused={setEmailFocused}
                passwordFocused={passwordFocused} setPasswordFocused={setPasswordFocused}
                router={router}
                t={t}
                isRTL={isRTL}
              />
            ) : (
              <PhoneForm
                phone={phone} setPhone={setPhone}
                password={password} setPassword={setPassword}
                showPassword={showPassword} setShowPassword={setShowPassword}
                phoneFocused={phoneFocused} setPhoneFocused={setPhoneFocused}
                passwordFocused={passwordFocused} setPasswordFocused={setPasswordFocused}
                loading={loading} handlePhoneSignIn={handlePhoneSignIn}
                router={router}
                t={t}
                isRTL={isRTL}
              />
            )}
          </View>

          {/* OR divider */}
          <Animated.View entering={FadeInDown.delay(500).springify()} style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={[s.dividerText, isRTL && s.textRTL]}>{t(translations.or)}</Text>
            <View style={s.dividerLine} />
          </Animated.View>

          {/* Google button */}
          <Animated.View entering={FadeInDown.delay(560).springify()}>
            <TouchableOpacity
              style={s.googleBtn}
              activeOpacity={0.7}
              disabled={loading}
              // onPress={handleGoogleSignIn}
            >
              <FontAwesome name="google" size={17} color={C.googleRed} />
              <Text style={[s.googleText, isRTL && s.textRTL]}>
                {loadingGoogle ? t({ en: 'Signing in...', ar: 'جاري تسجيل الدخول...', fr: 'Connexion en cours...' }) : t(translations.continueWithGoogle)}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Sign up row – RTL order: text on right, link on left */}
          <Animated.View entering={FadeInDown.delay(620).springify()}>
            {isRTL ? (
              <View style={s.signupRowRTL}>
                <Text style={[s.signupText, s.textRTL]}>{t(translations.noAccount)}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => { router.push("/signup"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                >
                  <Text style={[s.signupLink, s.textRTL]}>{t(translations.signUp)}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.signupRow}>
                <Text style={s.signupText}>{t(translations.noAccount)}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => { router.push("/signup"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                >
                  <Text style={s.signupLink}>{t(translations.signUp)}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Selection Modal – RTL header: title right, close left */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={[s.modalHeader, isRTL && s.modalHeaderRTL]}>
              {isRTL ? (
                <>
                  <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                    <Ionicons name="close" size={24} color={C.text} />
                  </TouchableOpacity>
                  <Text style={[s.modalTitle, s.textRTL]}>{t(translations.selectLanguage)}</Text>
                </>
              ) : (
                <>
                  <Text style={s.modalTitle}>{t(translations.selectLanguage)}</Text>
                  <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                    <Ionicons name="close" size={24} color={C.text} />
                  </TouchableOpacity>
                </>
              )}
            </View>
            <ScrollView>
              {languages.map((language) => {
                const langCode = language === 'English' ? 'english' : language === 'Arabic' ? 'arabic' : 'french';
                return (
                  <TouchableOpacity
                    key={language}
                    style={[
                      s.modalOption,
                      currentLanguage === langCode && s.modalOptionActive,
                    ]}
                    onPress={async () => {
                      setCurrentLanguage(langCode);
                      await AsyncStorage.setItem('userLanguage', langCode);
                      setShowLanguageModal(false);
                    }}
                  >
                    <Text
                      style={[
                        s.modalOptionText,
                        currentLanguage === langCode && s.modalOptionTextActive,
                        isRTL && s.textRTL,
                      ]}
                    >
                      {language}
                    </Text>
                    {currentLanguage === langCode && (
                      <Ionicons name="checkmark" size={20} color={C.brand} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_H_PAD,
    paddingBottom: 48,
    justifyContent: 'center',
  },

  // Top right buttons
  topRightButtons: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 100,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5 },
      android: { elevation: 3 },
    }),
  },

  // Nav
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
    color: C.textSub,
    lineHeight: 20,
  },

  // Icon
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

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EDEBE6',
    borderRadius: 13,
    padding: TAB_BAR_INNER_PAD,
    height: 48,
    marginBottom: 24,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: TAB_BAR_INNER_PAD,
    left: TAB_BAR_INNER_PAD,
    bottom: TAB_BAR_INNER_PAD,
    backgroundColor: C.white,
    borderRadius: 9,
    zIndex: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  tabBtn: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textMuted,
  },
  tabTextActive: {
    color: C.brand,
    fontWeight: '700',
  },

  // Form
  form: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 7,
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
  inputIcon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    padding: 0,
  },
  inputRTL: {
    textAlign: 'right',
  },
  eyeBtn: {
    paddingLeft: 10,
  },

  // Phone
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
    height: '100%',
    minWidth: 68,
    paddingHorizontal: 14,
    backgroundColor: C.prefixBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
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

  // Forgot
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotRowRTL: {
    alignItems: 'flex-start',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.brand,
  },

  // CTA
  ctaBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: C.brand, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  ctaBtnDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.3,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 1,
  },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.white,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },

  // Sign up (LTR)
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  // Sign up (RTL) – text on right, link on left
  signupRowRTL: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  signupText: {
    fontSize: 14,
    color: C.textSub,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: C.brand,
  },

  // RTL text alignment helper
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.text,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  modalOptionActive: {
    backgroundColor: '#FFEDD5',
  },
  modalOptionText: {
    fontSize: 16,
    color: C.text,
  },
  modalOptionTextActive: {
    color: C.brand,
    fontWeight: '500',
  },
});

export default SignIn;