import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/Colors";

const COLORS = {
  background: "#F9F6EF",
  surface: "#FFFFFF",
  heading: "#1F2937",
  body: "#4B5563",
  accent: Colors.primary,
  border: "#E5E7EB",
  text: '#1A1A1A',
  textMuted: '#9A9A9A',
  brand: Colors.primary,
};

const SUPPORT_EMAIL = "support@HabaHaba.com";

// ─── Translation dictionary ─────────────────────────────────────────────────
const translations = {
  // Header
  title: { en: 'Privacy Policy', ar: 'سياسة الخصوصية', fr: 'Politique de confidentialité' },

  // Section titles
  introduction: { en: 'Introduction', ar: 'مقدمة', fr: 'Introduction' },
  informationWeCollect: { en: 'Information We Collect', ar: 'المعلومات التي نجمعها', fr: 'Informations que nous collectons' },
  howWeUseInfo: { en: 'How We Use Your Information', ar: 'كيف نستخدم معلوماتك', fr: 'Comment nous utilisons vos informations' },
  dataSharing: { en: 'Data Sharing', ar: 'مشاركة البيانات', fr: 'Partage des données' },
  locationData: { en: 'Location Data', ar: 'بيانات الموقع', fr: 'Données de localisation' },
  authenticationTokens: { en: 'Authentication Tokens', ar: 'رموز المصادقة', fr: 'Jetons d\'authentification' },
  dataSecurity: { en: 'Data Security', ar: 'أمان البيانات', fr: 'Sécurité des données' },
  yourChoicesRights: { en: 'Your Choices & Rights', ar: 'خياراتك وحقوقك', fr: 'Vos choix et droits' },
  cookiesTechnologies: { en: 'Cookies & Similar Technologies', ar: 'ملفات تعريف الارتباط والتقنيات المشابهة', fr: 'Cookies et technologies similaires' },
  children: { en: 'Children', ar: 'الأطفال', fr: 'Enfants' },
  changesToPolicy: { en: 'Changes to This Policy', ar: 'التغييرات على هذه السياسة', fr: 'Modifications de cette politique' },
  contact: { en: 'Contact', ar: 'الاتصال', fr: 'Contact' },

  // Introduction body
  introBody: {
    en: "HabaHaba respects your data and your time. This Privacy Policy explains what we collect, how we use it, and how we protect your information while serving guests of our HabaHaba restaurant in Laayoune. This is a single-restaurant app, not a marketplace.",
    ar: "HabaHaba تحترم بياناتك ووقتك. توضح سياسة الخصوصية هذه ما نجمعه، وكيف نستخدمه، وكيف نحمي معلوماتك أثناء خدمة ضيوف مطعم HabaHaba في العيون. هذا تطبيق لمطعم واحد، وليس سوقًا.",
    fr: "HabaHaba respecte vos données et votre temps. Cette politique de confidentialité explique ce que nous collectons, comment nous l'utilisons et comment nous protégeons vos informations tout en servant les clients de notre restaurant HabaHaba à Laayoune. Il s'agit d'une application mono-restaurant, pas d'une place de marché.",
  },

  // Bullet arrays
  infoCollectBullets: {
    en: [
      "Name and contact details (phone number, email) to set up and manage your account.",
      "Delivery address and instructions to deliver HabaHaba orders accurately.",
      "Order history for HabaHaba only, to fulfill orders and improve our menu and service.",
      "Payment details handled securely by our payment partners; we do not store full card numbers.",
      "Device and app usage data (like app version, crash logs) to keep the app reliable.",
    ],
    ar: [
      "الاسم وتفاصيل الاتصال (رقم الهاتف، البريد الإلكتروني) لإعداد وإدارة حسابك.",
      "عنوان التوصيل والتعليمات لتوصيل طلبات HabaHaba بدقة.",
      "سجل الطلبات لـ HabaHaba فقط، لتنفيذ الطلبات وتحسين قائمتنا وخدمتنا.",
      "تفاصيل الدفع تتم معالجتها بشكل آمن من قبل شركائنا في الدفع؛ لا نخزن أرقام البطاقات كاملة.",
      "بيانات استخدام الجهاز والتطبيق (مثل إصدار التطبيق، سجلات الأعطال) للحفاظ على موثوقية التطبيق.",
    ],
    fr: [
      "Nom et coordonnées (numéro de téléphone, e-mail) pour configurer et gérer votre compte.",
      "Adresse de livraison et instructions pour livrer les commandes HabaHaba avec précision.",
      "Historique des commandes uniquement pour HabaHaba, pour exécuter les commandes et améliorer notre menu et service.",
      "Les détails de paiement sont traités en toute sécurité par nos partenaires de paiement ; nous ne stockons pas les numéros de carte complets.",
      "Données d'utilisation de l'appareil et de l'application (version de l'application, journaux de plantage) pour maintenir la fiabilité de l'application.",
    ],
  },
  howWeUseBullets: {
    en: [
      "Process and deliver your HabaHaba orders with our in-house team.",
      "Provide customer support and resolve issues fairly.",
      "Improve app performance, reliability, and features that make ordering smoother.",
      "Send important updates about your orders, account, new offers and promo codes, or changes to our policies.",
      "Maintain secure sessions using authentication tokens so you stay connected safely.",
    ],
    ar: [
      "معالجة وتسليم طلبات HabaHaba الخاصة بك مع فريقنا الداخلي.",
      "تقديم دعم العملاء وحل المشكلات بشكل عادل.",
      "تحسين أداء التطبيق وموثوقيته وميزاته التي تجعل الطلب أكثر سلاسة.",
      "إرسال تحديثات مهمة حول طلباتك وحسابك والعروض الجديدة ورموز الترويج أو التغييرات على سياساتنا.",
      "الحفاظ على جلسات آمنة باستخدام رموز المصادقة حتى تظل متصلاً بأمان.",
    ],
    fr: [
      "Traiter et livrer vos commandes HabaHaba avec notre équipe interne.",
      "Fournir un support client et résoudre les problèmes équitablement.",
      "Améliorer les performances, la fiabilité et les fonctionnalités de l'application pour rendre la commande plus fluide.",
      "Envoyer des mises à jour importantes concernant vos commandes, votre compte, les nouvelles offres et codes promo, ou les modifications de nos politiques.",
      "Maintenir des sessions sécurisées à l'aide de jetons d'authentification pour rester connecté en toute sécurité.",
    ],
  },
  dataSharingBullets: {
    en: [
      "Our HabaHaba kitchen receives your order details to prepare your food.",
      "Our HabaHaba delivery team receives pickup/drop-off details and your contact number for coordination.",
      "Payment processors handle transactions securely; we do not sell your personal data.",
    ],
    ar: [
      "مطبخ HabaHaba يستلم تفاصيل طلبك لتحضير طعامك.",
      "فريق التوصيل الخاص بـ HabaHaba يستلم تفاصيل الاستلام/التسليم ورقم الاتصال الخاص بك للتنسيق.",
      "معالجو الدفع يتعاملون مع المعاملات بشكل آمن؛ لا نبيع بياناتك الشخصية.",
    ],
    fr: [
      "Notre cuisine HabaHaba reçoit les détails de votre commande pour préparer vos plats.",
      "Notre équipe de livraison HabaHaba reçoit les détails de retrait/livraison et votre numéro de contact pour la coordination.",
      "Les processeurs de paiement traitent les transactions en toute sécurité ; nous ne vendons pas vos données personnelles.",
    ],
  },
  locationDataBody: {
    en: "We use your location to find nearby restaurants, calculate delivery times, and guide our delivery team. You can control location permissions in your device settings, but some features may not work without location access.",
    ar: "نستخدم موقعك للعثور على المطاعم القريبة، وحساب أوقات التوصيل، وتوجيه فريق التوصيل لدينا. يمكنك التحكم في أذونات الموقع في إعدادات جهازك، لكن بعض الميزات قد لا تعمل دون الوصول إلى الموقع.",
    fr: "Nous utilisons votre localisation pour trouver les restaurants à proximité, calculer les délais de livraison et guider notre équipe de livraison. Vous pouvez contrôler les autorisations de localisation dans les paramètres de votre appareil, mais certaines fonctionnalités peuvent ne pas fonctionner sans accès à la localisation.",
  },
  authTokensBody: {
    en: "The app uses secure tokens to keep you signed in. Tokens are stored on your device to maintain your session. Do not share your device or login; you can log out anytime from the account section if you want to clear the session.",
    ar: "يستخدم التطبيق رموزًا آمنة لإبقائك مسجلاً. يتم تخزين الرموز على جهازك للحفاظ على جلستك. لا تشارك جهازك أو بيانات الدخول؛ يمكنك تسجيل الخروج في أي وقت من قسم الحساب إذا كنت ترغب في إنهاء الجلسة.",
    fr: "L'application utilise des jetons sécurisés pour vous maintenir connecté. Les jetons sont stockés sur votre appareil pour maintenir votre session. Ne partagez pas votre appareil ou vos identifiants ; vous pouvez vous déconnecter à tout moment depuis la section compte si vous souhaitez effacer la session.",
  },
  dataSecurityBody: {
    en: "We use reasonable technical and organizational measures to protect your information. While no system is perfect, we continuously work to keep data safe and limit access to those who need it to operate the service.",
    ar: "نستخدم تدابير تقنية وتنظيمية معقولة لحماية معلوماتك. بينما لا يوجد نظام مثالي، نعمل باستمرار للحفاظ على أمان البيانات وتقييد الوصول لمن يحتاجونها لتشغيل الخدمة.",
    fr: "Nous utilisons des mesures techniques et organisationnelles raisonnables pour protéger vos informations. Bien qu'aucun système ne soit parfait, nous travaillons continuellement à sécuriser les données et à limiter l'accès à ceux qui en ont besoin pour faire fonctionner le service.",
  },
  yourChoicesBullets: {
    en: [
      "You can access and update your account details in the app.",
      "You can request deletion of your account; we will remove data we are not required to keep for legal or operational reasons.",
      "You can manage location permissions in your device settings.",
    ],
    ar: [
      "يمكنك الوصول إلى تفاصيل حسابك وتحديثها في التطبيق.",
      "يمكنك طلب حذف حسابك؛ سنقوم بإزالة البيانات التي لا يلزمنا الاحتفاظ بها لأسباب قانونية أو تشغيلية.",
      "يمكنك إدارة أذونات الموقع في إعدادات جهازك.",
    ],
    fr: [
      "Vous pouvez accéder et mettre à jour les détails de votre compte dans l'application.",
      "Vous pouvez demander la suppression de votre compte ; nous supprimerons les données que nous ne sommes pas tenus de conserver pour des raisons légales ou opérationnelles.",
      "Vous pouvez gérer les autorisations de localisation dans les paramètres de votre appareil.",
    ],
  },
  cookiesBody: {
    en: "If we use cookies or similar tools, it is to keep you signed in, remember preferences, and improve performance. You can adjust your browser or device settings to limit these, but some app functions may be affected.",
    ar: "إذا استخدمنا ملفات تعريف الارتباط أو أدوات مماثلة، فذلك لإبقائك مسجلاً، وتذكر التفضيلات، وتحسين الأداء. يمكنك ضبط إعدادات المتصفح أو الجهاز لتقييد هذه، ولكن قد تتأثر بعض وظائف التطبيق.",
    fr: "Si nous utilisons des cookies ou des outils similaires, c'est pour vous maintenir connecté, mémoriser vos préférences et améliorer les performances. Vous pouvez ajuster les paramètres de votre navigateur ou de votre appareil pour les limiter, mais certaines fonctions de l'application peuvent être affectées.",
  },
  childrenBody: {
    en: "Our service is intended for adults (18+). We do not knowingly collect personal data from children.",
    ar: "خدمتنا مخصصة للبالغين (18 سنة فأكثر). لا نجمع عن علم بيانات شخصية من الأطفال.",
    fr: "Notre service est destiné aux adultes (18 ans et plus). Nous ne collectons pas sciemment de données personnelles d'enfants.",
  },
  changesBody: {
    en: "If we update this Policy, we will notify by email when the changes are important. Continued use of the app means you accept the updated Policy.",
    ar: "إذا قمنا بتحديث هذه السياسة، سنخطرك عبر البريد الإلكتروني عندما تكون التغييرات مهمة. استمرار استخدام التطبيق يعني قبولك للسياسة المحدثة.",
    fr: "Si nous mettons à jour cette politique, nous vous en informerons par e-mail lorsque les modifications sont importantes. L'utilisation continue de l'application signifie que vous acceptez la politique mise à jour.",
  },
  contactBody: {
    en: "Have a privacy question? Contact us at support@HabaHaba.com or through the in-app support page. We respect your data and the trust of our guests and team in Laayoune.",
    ar: "هل لديك سؤال حول الخصوصية؟ اتصل بنا على support@HabaHaba.com أو من خلال صفحة الدعم داخل التطبيق. نحن نحترم بياناتك وثقة ضيوفنا وفريقنا في العيون.",
    fr: "Une question sur la confidentialité ? Contactez-nous à support@HabaHaba.com ou via la page d'assistance dans l'application. Nous respectons vos données et la confiance de nos clients et de notre équipe à Laayoune.",
  },
  selectLanguage: { en: 'Select Language', ar: 'اختر اللغة', fr: 'Choisir la langue' },
};

const Section: React.FC<{ title: string; children: React.ReactNode; isRTL?: boolean }> = ({
  title,
  children,
  isRTL,
}) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{title}</Text>
    {children}
  </View>
);

const Bullet: React.FC<{ text: string; isRTL?: boolean }> = ({ text, isRTL }) => (
  <View style={[styles.bulletRow, isRTL && styles.bulletRowRTL]}>
    <View style={styles.bulletDot} />
    <Text style={[styles.bulletText, isRTL && styles.textRTL]}>{text}</Text>
  </View>
);

const PrivacyPolicy: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  // Helper for bullet arrays
  const getBullets = (key: keyof typeof translations) => {
    const data = translations[key] as { en: string[]; ar: string[]; fr: string[] };
    if (currentLanguage === 'arabic') return data.ar;
    if (currentLanguage === 'french') return data.fr;
    return data.en;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* Top right language icon */}
      <View style={[styles.topRightButtons, { top: Platform.OS === 'ios' ? 54 : 50 }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowLanguageModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="language-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.heading} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t(translations.title)}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Introduction */}
          <Section title={t(translations.introduction)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.introBody)}
            </Text>
          </Section>

          {/* Information We Collect */}
          <Section title={t(translations.informationWeCollect)} isRTL={isRTL}>
            {getBullets('infoCollectBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* How We Use Your Information */}
          <Section title={t(translations.howWeUseInfo)} isRTL={isRTL}>
            {getBullets('howWeUseBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* Data Sharing */}
          <Section title={t(translations.dataSharing)} isRTL={isRTL}>
            {getBullets('dataSharingBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* Location Data */}
          <Section title={t(translations.locationData)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.locationDataBody)}
            </Text>
          </Section>

          {/* Authentication Tokens */}
          <Section title={t(translations.authenticationTokens)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.authTokensBody)}
            </Text>
          </Section>

          {/* Data Security */}
          <Section title={t(translations.dataSecurity)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.dataSecurityBody)}
            </Text>
          </Section>

          {/* Your Choices & Rights */}
          <Section title={t(translations.yourChoicesRights)} isRTL={isRTL}>
            {getBullets('yourChoicesBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* Cookies & Similar Technologies */}
          <Section title={t(translations.cookiesTechnologies)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.cookiesBody)}
            </Text>
          </Section>

          {/* Children */}
          <Section title={t(translations.children)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.childrenBody)}
            </Text>
          </Section>

          {/* Changes to This Policy */}
          <Section title={t(translations.changesToPolicy)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.changesBody)}
            </Text>
          </Section>

          {/* Contact */}
          <Section title={t(translations.contact)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.contactBody).split(SUPPORT_EMAIL).map((part, idx) => (
                <Text key={idx}>
                  {part}
                  {idx === 0 && (
                    <Text style={styles.link} onPress={() => {}}>
                      {SUPPORT_EMAIL}
                    </Text>
                  )}
                </Text>
              ))}
            </Text>
          </Section>
        </View>
      </ScrollView>

      {/* Language Selection Modal – header reversed in RTL */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
              {isRTL ? (
                <>
                  <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, styles.textRTL]}>{t(translations.selectLanguage)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>{t(translations.selectLanguage)}</Text>
                  <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
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
                      styles.modalOption,
                      currentLanguage === langCode && styles.modalOptionActive,
                    ]}
                    onPress={async () => {
                      setCurrentLanguage(langCode);
                      await AsyncStorage.setItem('userLanguage', langCode);
                      setShowLanguageModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        currentLanguage === langCode && styles.modalOptionTextActive,
                        isRTL && styles.textRTL,
                      ]}
                    >
                      {language}
                    </Text>
                    {currentLanguage === langCode && (
                      <Ionicons name="checkmark" size={20} color={COLORS.brand} />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5 },
      android: { elevation: 3 },
    }),
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.heading,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 8,
  },
  body: {
    fontSize: 14.5,
    lineHeight: 22,
    color: COLORS.body,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bulletRowRTL: {
    flexDirection: "row-reverse",
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 7,
    marginRight: 10,
    marginLeft: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 22,
    color: COLORS.body,
  },
  link: {
    color: COLORS.accent,
    fontWeight: "700",
  },

  // RTL text alignment
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
    color: COLORS.text,
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
    color: COLORS.text,
  },
  modalOptionTextActive: {
    color: COLORS.brand,
    fontWeight: '500',
  },
});

export default PrivacyPolicy;