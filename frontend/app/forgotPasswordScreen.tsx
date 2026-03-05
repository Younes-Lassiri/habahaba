import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import axios from 'axios';
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ─── Translation dictionary ─────────────────────────────────────────────────
const translations = {
  headlineTitle:   { en: 'Forgot Password?', ar: 'نسيت كلمة المرور؟', fr: 'Mot de passe oublié ?' },
  headlineSub:     { en: 'No worries — enter your email and we\'ll send you reset instructions', ar: 'لا تقلق — أدخل بريدك الإلكتروني وسنرسل لك تعليمات إعادة التعيين', fr: 'Pas de souci — entrez votre email et nous vous enverrons les instructions de réinitialisation' },
  emailLabel:      { en: 'Email Address', ar: 'البريد الإلكتروني', fr: 'Adresse e‑mail' },
  emailPlaceholder:{ en: 'your@email.com', ar: 'بريدك@example.com', fr: 'votre@email.com' },
  hint:            { en: 'We\'ll send a secure link to this address', ar: 'سنرسل رابطًا آمنًا إلى هذا العنوان', fr: 'Nous enverrons un lien sécurisé à cette adresse' },
  cta:             { en: 'Send Reset Link', ar: 'إرسال رابط إعادة التعيين', fr: 'Envoyer le lien de réinitialisation' },
  stepRequest:     { en: 'Request', ar: 'طلب', fr: 'Demande' },
  stepVerify:      { en: 'Verify', ar: 'تحقق', fr: 'Vérifier' },
  stepReset:       { en: 'Reset', ar: 'إعادة تعيين', fr: 'Réinitialiser' },
  infoTitle:       { en: 'Reset Already Sent', ar: 'تم إرسال إعادة التعيين مسبقًا', fr: 'Réinitialisation déjà envoyée' },
  infoText:        { en: 'Check your inbox for the reset code', ar: 'تحقق من صندوق الوارد الخاص بك للحصول على رمز إعادة التعيين', fr: 'Vérifiez votre boîte de réception pour le code de réinitialisation' },
  footerText:      { en: 'Remember your password? ', ar: 'تذكرت كلمة المرور؟ ', fr: 'Vous vous souvenez de votre mot de passe ? ' },
  footerLink:      { en: 'Sign In', ar: 'تسجيل الدخول', fr: 'Se connecter' },
  selectLanguage:  { en: 'Select Language', ar: 'اختر اللغة', fr: 'Choisir la langue' },
};

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [resetOnProcess, setResetOnProcess] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

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

  // ── Original logic — UNCHANGED ───────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
                  t({ en: 'Please enter your email', ar: 'الرجاء إدخال بريدك الإلكتروني', fr: 'Veuillez saisir votre email' }));
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
        Alert.alert(t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
                    response.data.message || t({ en: 'Something went wrong', ar: 'حدث خطأ ما', fr: 'Quelque chose s\'est mal passé' }));
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      Alert.alert(t({ en: 'Error', ar: 'خطأ', fr: 'Erreur' }),
                  t({ en: 'Failed to send reset email', ar: 'فشل إرسال بريد إعادة التعيين', fr: 'Échec de l\'envoi de l\'email de réinitialisation' }));
    }
  };

  const handleGoToCheckEmail = () => {
    router.push({ pathname: "/checkYourEmail", params: { email } });
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
            <Text style={[s.headlineTitle, isRTL && s.textRTL]}>{t(translations.headlineTitle)}</Text>
            <Text style={[s.headlineSub, isRTL && s.textRTL]}>{t(translations.headlineSub)}</Text>
          </Animated.View>

          {/* ── Lock Icon Circle ── */}
          <Animated.View entering={FadeInDown.delay(140).springify()} style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Ionicons name="lock-closed-outline" size={32} color={C.brand} />
            </View>
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View entering={FadeInDown.delay(190).springify()} style={s.form}>

            {/* Step indicator – order reversed in RTL */}
            <View style={[s.stepRow, isRTL && s.stepRowRTL]}>
              {isRTL ? (
                // RTL order: step 3, line, step 2, line, step 1
                <>
                  <View style={s.stepItem}>
                    <View style={[s.stepDot, resetOnProcess ? s.stepDotActive : null]}>
                      <Text style={resetOnProcess ? s.stepNumActive : s.stepNum}>3</Text>
                    </View>
                    <Text style={[s.stepLabel, resetOnProcess && s.stepLabelActive, isRTL && s.textRTL]}>
                      {t(translations.stepReset)}
                    </Text>
                  </View>
                  <View style={s.stepLine} />
                  <View style={s.stepItem}>
                    <View style={[s.stepDot, resetOnProcess ? s.stepDotActive : null]}>
                      <Text style={resetOnProcess ? s.stepNumActive : s.stepNum}>2</Text>
                    </View>
                    <Text style={[s.stepLabel, resetOnProcess && s.stepLabelActive, isRTL && s.textRTL]}>
                      {t(translations.stepVerify)}
                    </Text>
                  </View>
                  <View style={s.stepLine} />
                  <View style={s.stepItem}>
                    <View style={[s.stepDot, s.stepDotActive]}>
                      <Text style={s.stepNumActive}>1</Text>
                    </View>
                    <Text style={[s.stepLabel, s.stepLabelActive, isRTL && s.textRTL]}>
                      {t(translations.stepRequest)}
                    </Text>
                  </View>
                </>
              ) : (
                // LTR order: step 1, line, step 2, line, step 3
                <>
                  <View style={s.stepItem}>
                    <View style={[s.stepDot, s.stepDotActive]}>
                      <Text style={s.stepNumActive}>1</Text>
                    </View>
                    <Text style={[s.stepLabel, s.stepLabelActive]}>{t(translations.stepRequest)}</Text>
                  </View>
                  <View style={s.stepLine} />
                  <View style={s.stepItem}>
                    <View style={[s.stepDot, resetOnProcess ? s.stepDotActive : null]}>
                      <Text style={resetOnProcess ? s.stepNumActive : s.stepNum}>2</Text>
                    </View>
                    <Text style={[s.stepLabel, resetOnProcess && s.stepLabelActive]}>{t(translations.stepVerify)}</Text>
                  </View>
                  <View style={s.stepLine} />
                  <View style={s.stepItem}>
                    <View style={[s.stepDot, resetOnProcess ? s.stepDotActive : null]}>
                      <Text style={resetOnProcess ? s.stepNumActive : s.stepNum}>3</Text>
                    </View>
                    <Text style={[s.stepLabel, resetOnProcess && s.stepLabelActive]}>{t(translations.stepReset)}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Email field */}
            <View style={s.field}>
              <Text style={[s.label, isRTL && s.textRTL]}>{t(translations.emailLabel)}</Text>
              <View style={[s.inputBox, emailFocused && s.inputBoxFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={emailFocused ? C.brand : C.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={[s.input, isRTL && s.inputRTL]}
                  placeholder={t(translations.emailPlaceholder)}
                  placeholderTextColor={C.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  onFocus={() => { setEmailFocused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  onBlur={() => setEmailFocused(false)}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
              <Text style={[s.hint, isRTL && s.textRTL]}>{t(translations.hint)}</Text>
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
                : <Text style={s.ctaText}>{t(translations.cta)}</Text>
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
                  <Text style={[s.infoTitle, isRTL && s.textRTL]}>{t(translations.infoTitle)}</Text>
                  <Text style={[s.infoText, isRTL && s.textRTL]}>{t(translations.infoText)}</Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={C.brand} />
              </TouchableOpacity>
            )}

            {/* Footer – reversed in RTL */}
            <View style={[s.footer, isRTL && s.footerRTL]}>
              <Text style={[s.footerText, isRTL && s.textRTL]}>{t(translations.footerText)}</Text>
              <TouchableOpacity
                onPress={() => { router.push("/signin"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                activeOpacity={0.7}
              >
                <Text style={[s.footerLink, isRTL && s.textRTL]}>{t(translations.footerLink)}</Text>
              </TouchableOpacity>
            </View>

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

export default ForgotPasswordScreen;

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
  inputRTL: {
    textAlign: 'right',
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
  footerRTL: {
    flexDirection: 'row-reverse',
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