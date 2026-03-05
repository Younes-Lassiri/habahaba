import React, { useState, useEffect } from "react";
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
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerForPushNotificationsAsync } from "@/utils/notifications";

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
  requireBg:     '#FDF6EF',
  requireBorder: '#F0DCC8',
};

// ─── Translation dictionary ─────────────────────────────────────────────────
const translations = {
  headlineTitle:   { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور', fr: 'Réinitialiser le mot de passe' },
  headlineSub:     { en: 'Enter the code sent to {{email}} and choose a new password', ar: 'أدخل الرمز المرسل إلى {{email}} واختر كلمة مرور جديدة', fr: 'Entrez le code envoyé à {{email}} et choisissez un nouveau mot de passe' },
  codeLabel:       { en: 'Verification Code', ar: 'رمز التحقق', fr: 'Code de vérification' },
  codePlaceholder: { en: 'Enter 6-digit code', ar: 'أدخل الرمز المكون من 6 أرقام', fr: 'Entrez le code à 6 chiffres' },
  passwordLabel:   { en: 'New Password', ar: 'كلمة المرور الجديدة', fr: 'Nouveau mot de passe' },
  passwordPlaceholder: { en: 'Enter new password', ar: 'أدخل كلمة المرور الجديدة', fr: 'Entrez le nouveau mot de passe' },
  confirmLabel:    { en: 'Confirm Password', ar: 'تأكيد كلمة المرور', fr: 'Confirmez le mot de passe' },
  confirmPlaceholder: { en: 'Re-enter new password', ar: 'أعد إدخال كلمة المرور الجديدة', fr: 'Répétez le nouveau mot de passe' },
  cta:             { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور', fr: 'Réinitialiser' },
  stepRequest:     { en: 'Request', ar: 'طلب', fr: 'Demande' },
  stepVerify:      { en: 'Verify', ar: 'تحقق', fr: 'Vérifier' },
  stepReset:       { en: 'Reset', ar: 'إعادة تعيين', fr: 'Réinitialiser' },
  selectLanguage:  { en: 'Select Language', ar: 'اختر اللغة', fr: 'Choisir la langue' },
  errorCodeRequired: { en: 'Verification code is required', ar: 'رمز التحقق مطلوب', fr: 'Le code de vérification est requis' },
  errorPasswordRequired: { en: 'Password is required', ar: 'كلمة المرور مطلوبة', fr: 'Le mot de passe est requis' },
  errorConfirmRequired: { en: 'Confirm password is required', ar: 'تأكيد كلمة المرور مطلوب', fr: 'La confirmation du mot de passe est requise' },
  errorPasswordMismatch: { en: 'Passwords do not match', ar: 'كلمات المرور غير متطابقة', fr: 'Les mots de passe ne correspondent pas' },
  errorTitle:      { en: 'Error', ar: 'خطأ', fr: 'Erreur' },
  errorGeneric:    { en: 'Something went wrong', ar: 'حدث خطأ ما', fr: 'Quelque chose s\'est mal passé' },
};

const EnterCodeResetPassword = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams();

  const [errors, setErrors] = useState<{
    code?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [code, setCode]                           = useState("");
  const [password, setPassword]                   = useState("");
  const [confirmPassword, setConfirmPassword]     = useState("");
  const [loading, setLoading]                     = useState(false);
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeFocused, setCodeFocused]             = useState(false);
  const [passwordFocused, setPasswordFocused]     = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

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

  // Helper to interpolate email into headlineSub
  const getHeadlineSub = () => {
    const template = t(translations.headlineSub);
    return template.replace('{{email}}', email as string);
  };

  // ── Original logic — UNCHANGED, but with translated error messages ───────
  const handleResetPassword = async () => {
    const newErrors: { code?: string; password?: string; confirmPassword?: string } = {};

    if (!code) newErrors.code = t(translations.errorCodeRequired);
    if (!password.trim()) newErrors.password = t(translations.errorPasswordRequired);
    if (!confirmPassword.trim()) newErrors.confirmPassword = t(translations.errorConfirmRequired);

    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = t(translations.errorPasswordMismatch);
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await axios.post(
        "https://haba-haba-api.ubua.cloud/api/auth/reset-password",
        { email, code, password: password.trim() }
      );

      setLoading(false);

      if (response.data.success) {
        await AsyncStorage.setItem("token", response.data.token);
        await AsyncStorage.setItem("client", JSON.stringify(response.data.client));

        const clientId = response.data.client.id || response.data.client._id;
        if (clientId) {
          await registerForPushNotificationsAsync("client", clientId);
        } else {
          console.error('No client ID found in response!');
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push("/");
      } else {
        Alert.alert(t(translations.errorTitle), response.data.message || t(translations.errorGeneric));
      }
    } catch (error: any) {
      setLoading(false);
      console.log(error);
      if (error.response?.data?.message) {
        Alert.alert(t(translations.errorTitle), error.response.data.message);
      } else {
        Alert.alert(t(translations.errorTitle), t(translations.errorGeneric));
      }
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Top right language icon */}
      <View style={[s.topRightButtons, { top: Platform.OS === 'ios' ? 54 : 50 }]}>
        <TouchableOpacity
          style={s.iconButton}
          onPress={() => setShowLanguageModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="language-outline" size={22} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* ── Back arrow — pinned at top, never hidden by status bar ── */}
      <Animated.View
        entering={FadeInDown.delay(40).springify()}
        style={[s.topNav, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
      </Animated.View>

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

          {/* ── Lock Icon Circle ── */}
          <Animated.View entering={FadeInDown.delay(90).springify()} style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Ionicons name="lock-open-outline" size={32} color={C.brand} />
            </View>
          </Animated.View>

          {/* ── Headline ── */}
          <Animated.View entering={FadeInDown.delay(130).springify()} style={s.headline}>
            <Text style={[s.headlineTitle, isRTL && s.textRTL]}>{t(translations.headlineTitle)}</Text>
            <Text style={[s.headlineSub, isRTL && s.textRTL]}>
              {getHeadlineSub().split(email as string).map((part, index) => (
                <Text key={index}>
                  {part}
                  {index === 0 && <Text style={s.emailHighlight}>{email}</Text>}
                </Text>
              ))}
            </Text>
          </Animated.View>

          {/* ── Step Indicator — reversed in RTL ── */}
          <Animated.View entering={FadeInDown.delay(170).springify()} style={[s.stepRow, isRTL && s.stepRowRTL]}>
            {isRTL ? (
              // RTL order: Reset (3), Verify (2), Request (1)
              <>
                <View style={s.stepItem}>
                  <View style={[s.stepDot]}>
                    <Text style={s.stepNum}>3</Text>
                  </View>
                  <Text style={[s.stepLabel, isRTL && s.textRTL]}>{t(translations.stepReset)}</Text>
                </View>
                <View style={s.stepLine} />
                <View style={s.stepItem}>
                  <View style={[s.stepDot, s.stepDotActive]}>
                    <Text style={s.stepNumActive}>2</Text>
                  </View>
                  <Text style={[s.stepLabel, s.stepLabelActive, isRTL && s.textRTL]}>{t(translations.stepVerify)}</Text>
                </View>
                <View style={[s.stepLine, s.stepLineDone]} />
                <View style={s.stepItem}>
                  <View style={[s.stepDot, s.stepDotDone]}>
                    <Ionicons name="checkmark" size={14} color={C.white} />
                  </View>
                  <Text style={[s.stepLabel, s.stepLabelDone, isRTL && s.textRTL]}>{t(translations.stepRequest)}</Text>
                </View>
              </>
            ) : (
              // LTR order: Request (1), Verify (2), Reset (3)
              <>
                <View style={s.stepItem}>
                  <View style={[s.stepDot, s.stepDotDone]}>
                    <Ionicons name="checkmark" size={14} color={C.white} />
                  </View>
                  <Text style={[s.stepLabel, s.stepLabelDone]}>{t(translations.stepRequest)}</Text>
                </View>
                <View style={[s.stepLine, s.stepLineDone]} />
                <View style={s.stepItem}>
                  <View style={[s.stepDot, s.stepDotActive]}>
                    <Text style={s.stepNumActive}>2</Text>
                  </View>
                  <Text style={[s.stepLabel, s.stepLabelActive]}>{t(translations.stepVerify)}</Text>
                </View>
                <View style={s.stepLine} />
                <View style={s.stepItem}>
                  <View style={s.stepDot}>
                    <Text style={s.stepNum}>3</Text>
                  </View>
                  <Text style={s.stepLabel}>{t(translations.stepReset)}</Text>
                </View>
              </>
            )}
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View entering={FadeInDown.delay(210).springify()} style={s.form}>

            {/* Verification Code */}
            <View style={s.field}>
              <Text style={[s.label, isRTL && s.textRTL]}>{t(translations.codeLabel)}</Text>
              <View style={[s.inputBox, codeFocused && s.inputBoxFocused, !!errors.code && s.inputBoxError]}>
                <Ionicons
                  name="key-outline"
                  size={17}
                  color={codeFocused ? C.brand : C.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={[s.input, isRTL && s.inputRTL]}
                  placeholder={t(translations.codePlaceholder)}
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                  value={code}
                  onChangeText={(t) => { setCode(t); if (errors.code) setErrors({ ...errors, code: undefined }); }}
                  onFocus={() => { setCodeFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  onBlur={() => setCodeFocused(false)}
                  editable={!loading}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
              {errors.code && <ErrorMsg message={errors.code} />}
            </View>

            {/* New Password */}
            <View style={s.field}>
              <Text style={[s.label, isRTL && s.textRTL]}>{t(translations.passwordLabel)}</Text>
              <View style={[s.inputBox, passwordFocused && s.inputBoxFocused, !!errors.password && s.inputBoxError]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={passwordFocused ? C.brand : C.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={[s.input, isRTL && s.inputRTL, { flex: 1 }]}
                  placeholder={t(translations.passwordPlaceholder)}
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: undefined }); }}
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
              {errors.password && <ErrorMsg message={errors.password} />}
            </View>

            {/* Confirm Password */}
            <View style={s.field}>
              <Text style={[s.label, isRTL && s.textRTL]}>{t(translations.confirmLabel)}</Text>
              <View style={[s.inputBox, confirmPasswordFocused && s.inputBoxFocused, !!errors.confirmPassword && s.inputBoxError]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={confirmPasswordFocused ? C.brand : C.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={[s.input, isRTL && s.inputRTL, { flex: 1 }]}
                  placeholder={t(translations.confirmPlaceholder)}
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); }}
                  onFocus={() => { setConfirmPasswordFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  editable={!loading}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <TouchableOpacity
                  onPress={() => { setShowConfirmPassword(!showConfirmPassword); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={s.eyeBtn} activeOpacity={0.7}
                >
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={19} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <ErrorMsg message={errors.confirmPassword} />}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[s.ctaBtn, loading && s.ctaBtnDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={s.ctaText}>{t(translations.cta)}</Text>
              }
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Selection Modal – header reversed in RTL */}
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

// ── Standalone error component ─────────────────────────────────────────────
const ErrorMsg = ({ message }: { message: string }) => (
  <View style={s.errorRow}>
    <Ionicons name="alert-circle-outline" size={12} color="#FF3B30" />
    <Text style={s.errorText}>{message}</Text>
  </View>
);

export default EnterCodeResetPassword;

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Top right language icon
  topRightButtons: {
    position: 'absolute',
    right: 20,
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

  // ── Back arrow — pinned at top ─────────────────────────────────────────────
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

  // ── Scroll — remaining space centered ─────────────────────────────────────
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
    justifyContent: 'center',
  },

  // ── Icon Circle ───────────────────────────────────────────────────────────
  iconWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE8E0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Headline ──────────────────────────────────────────────────────────────
  headline: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headlineTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  headlineSub: {
    fontSize: 14,
    color: '#5E5E5E',
    lineHeight: 20,
    textAlign: 'center',
  },
  emailHighlight: {
    fontWeight: '700',
    color: '#93522B',
  },

  // ── Step Indicator ────────────────────────────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  stepRowRTL: {
    flexDirection: 'row-reverse',
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
  stepDotDone: {
    backgroundColor: '#93522B',
    borderColor: '#93522B',
    opacity: 0.5,
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
  stepLabelDone: {
    color: '#93522B',
    opacity: 0.5,
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 8,
    marginBottom: 18,
  },
  stepLineDone: {
    backgroundColor: '#93522B',
    opacity: 0.4,
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  form: {
    gap: 16,
  },
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
  inputBoxError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
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
  inputRTL: {
    textAlign: 'right',
  },
  eyeBtn: {
    paddingLeft: 10,
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
    color: '#FF3B30',
    fontWeight: '500',
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

  // ── RTL text alignment helper ─────────────────────────────────────────────
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // ── Modal styles ──────────────────────────────────────────────────────────
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