// @ts-ignore
import { useAuth } from "@/contexts/AuthContext";
import { registerForPushNotificationsAsync } from "@/utils/notifications";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SignupHeader from '../assets/images/playstorelogo.png';

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

const SCREEN_H_PAD = 24;

interface RestaurantSettings {
  is_open: boolean;
  restaurant_logo: string;
  restaurant_home_screen_icon: string;
  restaurant_name: string;
}

const translations = {
  createAccount:        { en: 'Create Account', ar: 'إنشاء حساب', fr: 'Créer un compte' },
  joinUs:               { en: 'Join us today and enjoy authentic Moroccan flavors', ar: 'انضم إلينا اليوم واستمتع بالنكهات المغربية الأصيلة', fr: "Rejoignez-nous aujourd'hui et savourez les saveurs marocaines authentiques" },
  fullNameLabel:        { en: 'Full Name', ar: 'الاسم الكامل', fr: 'Nom complet' },
  fullNamePlaceholder:  { en: 'Ahmed Hassan', ar: 'أحمد حسن', fr: 'Ahmed Hassan' },
  phoneLabel:           { en: 'Phone Number', ar: 'رقم الهاتف', fr: 'Numéro de téléphone' },
  phonePlaceholder:     { en: '6XX XXX XXX', ar: '٦XX XXX XXX', fr: '6XX XXX XXX' },
  passwordLabel:        { en: 'Password', ar: 'كلمة المرور', fr: 'Mot de passe' },
  passwordPlaceholder:  { en: 'At least 6 characters', ar: '6 أحرف على الأقل', fr: '6 caractères minimum' },
  termsText:            { en: 'I agree to the ', ar: 'أوافق على ', fr: "J'accepte les " },
  termsOfService:       { en: 'Terms of Service', ar: 'شروط الخدمة', fr: "Conditions d'utilisation" },
  and:                  { en: ' and ', ar: ' و ', fr: ' et ' },
  privacyPolicy:        { en: 'Privacy Policy', ar: 'سياسة الخصوصية', fr: 'Politique de confidentialité' },
  createAccountBtn:     { en: 'Create Account', ar: 'إنشاء حساب', fr: 'Créer un compte' },
  alreadyAccount:       { en: 'Already have an account? ', ar: 'هل لديك حساب بالفعل؟ ', fr: 'Vous avez déjà un compte ? ' },
  signInLink:           { en: 'Sign In', ar: 'تسجيل الدخول', fr: 'Se connecter' },
  selectLanguage:       { en: 'Select Language', ar: 'اختر اللغة', fr: 'Choisir la langue' },
};

const ErrorMsg = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <View style={s.errorRow}>
      <Ionicons name="alert-circle-outline" size={12} color={C.error} />
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
};

const Field = ({
  label, focused, error, children, isRTL,
}: {
  label: string; focused: boolean; error?: string; children: React.ReactNode; isRTL?: boolean;
}) => (
  <View style={s.field}>
    <Text style={[s.label, isRTL && s.textRTL]}>{label}</Text>
    <View style={[s.inputBox, focused && s.inputBoxFocused, !!error && s.inputBoxError]}>
      {children}
    </View>
    <ErrorMsg message={error} />
  </View>
);

const SignupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const [fullName, setFullName]     = useState("");
  const [phone, setPhone]           = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [isChecked, setChecked]     = useState(false);
  const [countryCode]               = useState("+212");
  const [showPassword, setShowPassword] = useState(false);

  const [fullNameFocused,  setFullNameFocused]  = useState(false);
  const [phoneFocused,     setPhoneFocused]     = useState(false);
  const [passwordFocused,  setPasswordFocused]  = useState(false);

  const fullNameRef  = useRef<TextInput>(null);
  const phoneRef     = useRef<TextInput>(null);
  const passwordRef  = useRef<TextInput>(null);

  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    is_open: true, restaurant_logo: '', restaurant_home_screen_icon: '', restaurant_name: '',
  });

  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'arabic' | 'french'>('english');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const languages = ['English', 'Arabic', 'French'];
  const isRTL = currentLanguage === 'arabic';

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('userLanguage');
      if (storedLang && (storedLang === 'english' || storedLang === 'arabic' || storedLang === 'french')) {
        setCurrentLanguage(storedLang as 'english' | 'arabic' | 'french');
      }
    };
    loadLanguage();
  }, []);

  const t = (key: { en: string; ar: string; fr: string }): string => {
    if (currentLanguage === 'arabic') return key.ar;
    if (currentLanguage === 'french') return key.fr;
    return key.en;
  };

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
    fullName?: string;
    phone?: string; password?: string; terms?: string;
  }>({});

  const handleSignup = async () => {
    const newErrors: typeof errors = {};
    const trimmedPhone = phone.trim();

    if (!fullName.trim()) newErrors.fullName = t({ en: "Full name is required", ar: "الاسم الكامل مطلوب", fr: "Le nom complet est requis" });
    if (!trimmedPhone)    newErrors.phone    = t({ en: "Phone number is required", ar: "رقم الهاتف مطلوب", fr: "Le numéro de téléphone est requis" });
    if (!password)        newErrors.password = t({ en: "Password is required", ar: "كلمة المرور مطلوبة", fr: "Le mot de passe est requis" });
    if (!isChecked)       newErrors.terms    = t({ en: "You must agree to the terms", ar: "يجب الموافقة على الشروط", fr: "Vous devez accepter les conditions" });

    if (!newErrors.phone && (trimmedPhone.startsWith("0") || trimmedPhone.startsWith("+212"))) {
      newErrors.phone = t({ en: "Enter number without 0 or +212", ar: "أدخل الرقم بدون 0 أو +212", fr: "Entrez le numéro sans 0 ou +212" });
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
          name: fullName.trim(),
          email: null,
          password: password.trim(),
          phone: fullPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiErrors: typeof errors = {};
        if (response.status === 409) {
          apiErrors.phone = t({ en: "This phone number is already in use", ar: "رقم الهاتف هذا مستخدم بالفعل", fr: "Ce numéro de téléphone est déjà utilisé" });
        } else {
          apiErrors.phone = data.message || t({ en: "Signup failed", ar: "فشل إنشاء الحساب", fr: "Échec de l'inscription" });
        }
        setErrors(apiErrors);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("client", JSON.stringify(data.client));
      await login();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const clientId = data.client.id || data.client._id;
      if (clientId) await registerForPushNotificationsAsync("client", clientId);
      else console.error('No client ID found!');
      router.replace("/(tabs)");

    } catch (error) {
      console.error("Signup Error:", error);
      setErrors({ phone: t({ en: "Connection error. Please try again.", ar: "خطأ في الاتصال. حاول مرة أخرى.", fr: "Erreur de connexion. Veuillez réessayer." }) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header Row — back button + language icon on the same line */}
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.iconButton}
          onPress={() => setShowLanguageModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="language-outline" size={22} color={C.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[s.scroll]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Headline */}
          <Animated.View entering={FadeInDown.delay(90).springify()} style={s.headline}>
            <Text style={[s.headlineTitle, isRTL && s.textRTL]}>{t(translations.createAccount)}</Text>
            <Text style={[s.headlineSub, isRTL && s.textRTL]}>{t(translations.joinUs)}</Text>
          </Animated.View>

          {/* Logo Circle */}
          <Animated.View entering={FadeInDown.delay(140).springify()} style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Image source={SignupHeader} style={s.iconImg} contentFit="contain" />
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(190).springify()} style={s.form}>

            {/* Full Name */}
            <Field label={t(translations.fullNameLabel)} focused={fullNameFocused} error={errors.fullName} isRTL={isRTL}>
              <TextInput
                ref={fullNameRef}
                placeholder={t(translations.fullNamePlaceholder)}
                placeholderTextColor={C.textMuted}
                style={[s.input, isRTL && s.inputRTL]}
                value={fullName}
                onChangeText={(v) => { setFullName(v); if (errors.fullName) setErrors({ ...errors, fullName: undefined }); }}
                onFocus={() => { setFullNameFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                onBlur={() => setFullNameFocused(false)}
                editable={!loading}
                textAlign={isRTL ? 'right' : 'left'}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Field>

            {/* Phone */}
            <View style={s.field}>
              <Text style={[s.label, isRTL && s.textRTL]}>{t(translations.phoneLabel)}</Text>
              <View style={[s.phoneBox, phoneFocused && s.inputBoxFocused, !!errors.phone && s.inputBoxError]}>
                <View style={s.prefix}>
                  <Text style={s.prefixText}>+212</Text>
                </View>
                <View style={s.phoneDivider} />
                <TextInput
                  ref={phoneRef}
                  placeholder={t(translations.phonePlaceholder)}
                  placeholderTextColor={C.textMuted}
                  style={[s.phoneInput, isRTL && s.inputRTL]}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(v) => { setPhone(v); if (errors.phone) setErrors({ ...errors, phone: undefined }); }}
                  onFocus={() => { setPhoneFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  onBlur={() => setPhoneFocused(false)}
                  editable={!loading}
                  textAlign={'left'}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              <ErrorMsg message={errors.phone} />
            </View>

            {/* Password */}
            <Field label={t(translations.passwordLabel)} focused={passwordFocused} error={errors.password} isRTL={isRTL}>
              <TextInput
                ref={passwordRef}
                placeholder={t(translations.passwordPlaceholder)}
                placeholderTextColor={C.textMuted}
                style={[s.input, isRTL && s.inputRTL, { flex: 1 }]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                onFocus={() => { setPasswordFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                onBlur={() => setPasswordFocused(false)}
                editable={!loading}
                textAlign={isRTL ? 'right' : 'left'}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
              <TouchableOpacity
                onPress={() => { setShowPassword(!showPassword); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={s.eyeBtn}
                activeOpacity={0.7}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
              </TouchableOpacity>
            </Field>

            {/* Terms */}
            <View style={[s.termsRow, isRTL && s.termsRowRTL]}>
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
              <Text style={[s.termsText, isRTL && s.textRTL]}>
                {t(translations.termsText)}
                <Text style={s.termsLink} onPress={() => { router.push("/TermsOfService"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  {t(translations.termsOfService)}
                </Text>
                {t(translations.and)}
                <Text style={s.termsLink} onPress={() => { router.push("/PrivacyPolicy"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  {t(translations.privacyPolicy)}
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
                : <Text style={s.ctaText}>{t(translations.createAccountBtn)}</Text>
              }
            </TouchableOpacity>

            {/* Footer */}
            <View style={[s.footerRow, isRTL && s.footerRowRTL]}>
              <Text style={[s.footerText, isRTL && s.textRTL]}>{t(translations.alreadyAccount)}</Text>
              <TouchableOpacity
                onPress={() => { router.push("/signin"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                activeOpacity={0.7}
              >
                <Text style={[s.signInLink, isRTL && s.textRTL]}>{t(translations.signInLink)}</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: insets.bottom + 20 }]}>
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
            <ScrollView showsVerticalScrollIndicator={false}>
              {languages.map((language) => {
                const langCode = language === 'English' ? 'english' : language === 'Arabic' ? 'arabic' : 'french';
                return (
                  <TouchableOpacity
                    key={language}
                    style={[s.modalOption, currentLanguage === langCode && s.modalOptionActive]}
                    onPress={async () => {
                      setCurrentLanguage(langCode as 'english' | 'arabic' | 'french');
                      await AsyncStorage.setItem('userLanguage', langCode);
                      setShowLanguageModal(false);
                    }}
                  >
                    <Text style={[s.modalOptionText, currentLanguage === langCode && s.modalOptionTextActive, isRTL && s.textRTL]}>
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
    </View>
  );
};

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_H_PAD,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 8,
    backgroundColor: C.bg,
    zIndex: 10,
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  form: {
    gap: 16,
  },
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
  inputRTL: {
    textAlign: 'right',
  },
  eyeBtn: {
    paddingLeft: 10,
  },
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  termsRowRTL: {
    flexDirection: 'row-reverse',
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  footerRowRTL: {
    flexDirection: 'row-reverse',
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
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
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

export default SignupScreen;