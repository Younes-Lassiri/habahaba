import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COLORS = {
  background: "#F9F6EF",
  surface: "#FFFFFF",
  heading: "#1F2937",
  body: "#4B5563",
  accent: '#93522B',
  border: "#E5E7EB",
  text: '#1A1A1A',
  textMuted: '#9A9A9A',
  brand: '#93522B',
};

const APP_NAME = "Haba Haba – Food Delivery";
const SUPPORT_EMAIL = "habahaba@gmail.com";

// URLs (unchanged)
const PRIVACY_POLICY_URL = "haba-haba-admin-panel.ubua.cloud/privacy-policy";
const TERMS_URL = "https://haba-haba-admin-panel.ubua.cloud/terms-services";

const openUrl = async (url: string) => {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) throw new Error("Cannot open URL");
    await Linking.openURL(url);
  } catch {
    Alert.alert("Unable to open link", "Please try again later.");
  }
};

const openMail = async (email: string) => {
  const url = `mailto:${email}`;
  await openUrl(url);
};

// ─── Translation dictionary ─────────────────────────────────────────────────
const translations = {
  // Header
  title: { en: 'Terms of Service', ar: 'شروط الخدمة', fr: "Conditions d'utilisation" },

  // Sections
  introduction: { en: 'Introduction', ar: 'مقدمة', fr: 'Introduction' },
  eligibility: { en: 'Eligibility & Account Responsibility', ar: 'الأهلية ومسؤولية الحساب', fr: 'Admissibilité et responsabilité du compte' },
  serviceDescription: { en: 'Service Description', ar: 'وصف الخدمة', fr: 'Description du service' },
  userResponsibilities: { en: 'User Responsibilities', ar: 'مسؤوليات المستخدم', fr: 'Responsabilités de l’utilisateur' },
  paymentsFees: { en: 'Payments & Fees', ar: 'المدفوعات والرسوم', fr: 'Paiements et frais' },
  cancellationsRefunds: { en: 'Cancellations & Refunds', ar: 'الإلغاءات واسترداد الأموال', fr: 'Annulations et remboursements' },
  restaurantQuality: { en: 'Restaurant Quality Disclaimer', ar: 'إخلاء مسؤولية جودة المطعم', fr: 'Clause de non-responsabilité sur la qualité du restaurant' },
  delivery: { en: 'Delivery', ar: 'التوصيل', fr: 'Livraison' },
  privacy: { en: 'Privacy', ar: 'الخصوصية', fr: 'Confidentialité' },
  accountSuspension: { en: 'Account Suspension or Termination', ar: 'تعليق الحساب أو إنهاؤه', fr: 'Suspension ou résiliation du compte' },
  limitationLiability: { en: 'Limitation of Liability', ar: 'تحديد المسؤولية', fr: 'Limitation de responsabilité' },
  governingLaw: { en: 'Governing Law', ar: 'القانون المنظم', fr: 'Droit applicable' },
  changesTerms: { en: 'Changes to These Terms', ar: 'التغييرات على هذه الشروط', fr: 'Modifications des présentes conditions' },
  contact: { en: 'Contact', ar: 'الاتصال', fr: 'Contact' },

  // Introduction body
  introBody: {
    en: `Welcome to ${APP_NAME}, the official delivery app for our Haba Haba restaurant in Laayoune. This app lets you browse our menu, place orders, and receive delivery handled directly by Haba Haba and its own delivery team. By creating an account or using the app, you agree to these Terms.`,
    ar: `مرحبًا بك في ${APP_NAME}، تطبيق التوصيل الرسمي لمطعم Haba Haba في العيون. يتيح لك هذا التطبيق تصفح قائمتنا، وتقديم الطلبات، واستلام التوصيل الذي يتم بواسطة Haba Haba وفريق التوصيل الخاص به. من خلال إنشاء حساب أو استخدام التطبيق، فإنك توافق على هذه الشروط.`,
    fr: `Bienvenue sur ${APP_NAME}, l'application de livraison officielle de notre restaurant Haba Haba à Laayoune. Cette application vous permet de parcourir notre menu, de passer des commandes et de recevoir une livraison gérée directement par Haba Haba et sa propre équipe de livraison. En créant un compte ou en utilisant l'application, vous acceptez ces conditions.`,
  },

  // Bullet points arrays per section
  eligibilityBullets: {
    en: [
      "You are at least 14 years old and able to enter into agreements.",
      "You will keep your account details accurate and secure.",
      "You are responsible for all activity under your account.",
      "The app uses secure tokens to keep you signed in; keep your device and login safe and do not share access.",
    ],
    ar: [
      "أنت على الأقل 14 عامًا وقادر على الدخول في اتفاقيات.",
      "ستحتفظ بتفاصيل حسابك دقيقة وآمنة.",
      "أنت مسؤول عن جميع الأنشطة التي تتم عبر حسابك.",
      "يستخدم التطبيق رموزًا آمنة لإبقائك مسجلاً؛ حافظ على جهازك وبيانات الدخول آمنة ولا تشارك الوصول.",
    ],
    fr: [
      "Vous avez au moins 14 ans et êtes capable de conclure des accords.",
      "Vous maintiendrez les informations de votre compte exactes et sécurisées.",
      "Vous êtes responsable de toute activité sur votre compte.",
      "L'application utilise des jetons sécurisés pour vous maintenir connecté ; protégez votre appareil et vos identifiants et ne partagez pas l'accès.",
    ],
  },
  serviceBullets: {
    en: [
      "You place orders for Haba Haba restaurant only, directly inside this app.",
      "Our kitchen prepares the food and is responsible for its quality, safety, and accuracy.",
      "Haba Haba’s own delivery team coordinates pickup and drop-off to your address in Laayoune.",
      "Estimated times are guidance; we work to keep them accurate and communicate delays when they occur.",
    ],
    ar: [
      "تقوم بتقديم طلبات لمطعم Haba Haba فقط، مباشرة داخل هذا التطبيق.",
      "يقوم مطبخنا بإعداد الطعام وهو مسؤول عن جودته وسلامته ودقته.",
      "يقوم فريق التوصيل الخاص بـ Haba Haba بتنسيق الاستلام والتسليم إلى عنوانك في العيون.",
      "الأوقات التقديرية هي إرشادية؛ نحن نعمل على الحفاظ على دقتها وإبلاغك بالتأخيرات عند حدوثها.",
    ],
    fr: [
      "Vous passez commande uniquement pour le restaurant Haba Haba, directement dans cette application.",
      "Notre cuisine prépare les plats et est responsable de leur qualité, sécurité et exactitude.",
      "La propre équipe de livraison de Haba Haba coordonne le retrait et la livraison à votre adresse à Laayoune.",
      "Les délais estimés sont indicatifs ; nous nous efforçons de les maintenir précis et vous informons en cas de retard.",
    ],
  },
  userResponsibilitiesBullets: {
    en: [
      "Provide correct delivery details and contact information.",
      "Be respectful to Haba Haba staff, delivery team, and support.",
      "Use the service lawfully and do not misuse promotions or payments.",
    ],
    ar: [
      "قدم تفاصيل التوصيل ومعلومات الاتصال الصحيحة.",
      "كن محترمًا تجاه موظفي Haba Haba وفريق التوصيل والدعم.",
      "استخدم الخدمة بشكل قانوني ولا تسيء استخدام العروض أو المدفوعات.",
    ],
    fr: [
      "Fournissez des informations de livraison et de contact correctes.",
      "Soyez respectueux envers le personnel de Haba Haba, l'équipe de livraison et le support.",
      "Utilisez le service légalement et n'abusez pas des promotions ou des paiements.",
    ],
  },
  paymentsBullets: {
    en: [
      "Prices and delivery fees are shown before you confirm an order.",
      "Your chosen payment method will be charged (or confirmed) when you place an order.",
      "If something goes wrong, we review refunds fairly and case by case.",
    ],
    ar: [
      "يتم عرض الأسعار ورسوم التوصيل قبل تأكيد الطلب.",
      "سيتم خصم طريقة الدفع التي اخترتها (أو تأكيدها) عند تقديم الطلب.",
      "إذا حدث خطأ ما، نقوم بمراجعة استرداد الأموال بشكل عادل وحالة بحالة.",
    ],
    fr: [
      "Les prix et frais de livraison sont affichés avant la confirmation de la commande.",
      "Votre mode de paiement choisi sera débité (ou confirmé) lors de la commande.",
      "En cas de problème, nous examinons les remboursements équitablement et au cas par cas.",
    ],
  },
  cancellationsBullets: {
    en: [
      "You may request a cancellation before an order is prepared; once preparation starts, cancellation may not be possible.",
      "If an order is incorrect, missing items, or has quality issues, contact support and we will review the case fairly.",
      "Refunds (when approved) are processed to the original payment method when applicable, or via another agreed solution.",
    ],
    ar: [
      "يمكنك طلب الإلغاء قبل تجهيز الطلب؛ بمجرد بدء التجهيز، قد لا يكون الإلغاء ممكنًا.",
      "إذا كان الطلب غير صحيح، أو به عناصر مفقودة، أو مشكلات في الجودة، اتصل بالدعم وسنراجع الحالة بشكل عادل.",
      "يتم معالجة استرداد الأموال (عند الموافقة) إلى طريقة الدفع الأصلية عند الإمكان، أو عبر حل آخر متفق عليه.",
    ],
    fr: [
      "Vous pouvez demander une annulation avant la préparation de la commande ; une fois la préparation commencée, l'annulation peut ne pas être possible.",
      "Si une commande est incorrecte, incomplète ou présente des problèmes de qualité, contactez le support et nous examinerons le cas équitablement.",
      "Les remboursements (lorsqu'ils sont approuvés) sont traités via le mode de paiement d'origine si possible, ou via une autre solution convenue.",
    ],
  },
  restaurantQualityBody: {
    en: "Haba Haba is responsible for preparing and packaging your order in line with local hygiene standards. While we handle cooking and delivery, circumstances like traffic or weather can affect arrival times; we work to minimize impact and keep you informed.",
    ar: "Haba Haba مسؤول عن إعداد وتغليف طلبك وفقًا لمعايير النظافة المحلية. بينما نتولى الطهي والتوصيل، قد تؤثر ظروف مثل حركة المرور أو الطقس على أوقات الوصول؛ نحن نعمل على تقليل التأثير وإبقائك على اطلاع.",
    fr: "Haba Haba est responsable de la préparation et de l'emballage de votre commande conformément aux normes d'hygiène locales. Bien que nous gérions la cuisine et la livraison, des circonstances telles que le trafic ou la météo peuvent affecter les délais ; nous nous efforçons de minimiser l'impact et de vous tenir informé.",
  },
  deliveryBullets: {
    en: [
      "Our Haba Haba delivery team handles pickup and drop-off.",
      "Please be available at the delivery location and keep your phone reachable.",
      "If we cannot complete delivery due to wrong details or no response, fees may still apply.",
    ],
    ar: [
      "يتولى فريق التوصيل الخاص بـ Haba Haba الاستلام والتسليم.",
      "يرجى التواجد في موقع التوصيل وإبقاء هاتفك متاحًا.",
      "إذا لم نتمكن من إكمال التوصيل بسبب تفاصيل خاطئة أو عدم وجود رد، قد تظل الرسوم مستحقة.",
    ],
    fr: [
      "Notre équipe de livraison Haba Haba gère le retrait et la livraison.",
      "Veuillez être disponible à l'adresse de livraison et garder votre téléphone joignable.",
      "Si nous ne pouvons pas effectuer la livraison en raison de coordonnées incorrectes ou d'absence de réponse, des frais peuvent toujours s'appliquer.",
    ],
  },
  privacyBody: {
    en: "Your use of the app is also subject to our Privacy Policy, which explains how we collect and use data (such as location for delivery, account info, and order updates).",
    ar: "استخدامك للتطبيق يخضع أيضًا لسياسة الخصوصية الخاصة بنا، التي تشرح كيف نجمع ونستخدم البيانات (مثل الموقع للتوصيل، معلومات الحساب، وتحديثات الطلب).",
    fr: "Votre utilisation de l'application est également soumise à notre politique de confidentialité, qui explique comment nous collectons et utilisons les données (telles que la localisation pour la livraison, les informations du compte et les mises à jour des commandes).",
  },
  accountSuspensionBullets: {
    en: [
      "Fraud, abuse, harassment, or illegal activity.",
      "Repeated order issues caused by misuse of the service.",
      "Any violation of these Terms.",
    ],
    ar: [
      "الاحتيال أو الإساءة أو المضايقة أو النشاط غير القانوني.",
      "مشكلات الطلب المتكررة الناتجة عن سوء استخدام الخدمة.",
      "أي انتهاك لهذه الشروط.",
    ],
    fr: [
      "Fraude, abus, harcèlement ou activité illégale.",
      "Problèmes de commande répétés dus à une mauvaise utilisation du service.",
      "Toute violation des présentes conditions.",
    ],
  },
  accountSuspensionFooter: {
    en: "We may suspend or close accounts in these cases to protect our community.",
    ar: "قد نعلق أو نغلق الحسابات في هذه الحالات لحماية مجتمعنا.",
    fr: "Nous pouvons suspendre ou fermer les comptes dans ces cas pour protéger notre communauté.",
  },
  limitationBody: {
    en: "We work hard to provide a reliable service, but sometimes things happen outside our control. To the fullest extent allowed by law, Haba Haba is not liable for indirect or incidental losses. Nothing in these Terms limits any rights you have that cannot be limited by law.",
    ar: "نحن نعمل بجد لتقديم خدمة موثوقة، ولكن في بعض الأحيان تحدث أمور خارجة عن إرادتنا. إلى أقصى حد يسمح به القانون، لا تتحمل Haba Haba المسؤولية عن الخسائر غير المباشرة أو العرضية. لا شيء في هذه الشروط يحد من أي حقوق لديك لا يمكن تقييدها بموجب القانون.",
    fr: "Nous travaillons dur pour fournir un service fiable, mais parfois des événements indépendants de notre volonté surviennent. Dans toute la mesure permise par la loi, Haba Haba n'est pas responsable des pertes indirectes ou accessoires. Aucune disposition des présentes conditions ne limite les droits que vous pourriez avoir et qui ne peuvent être limités par la loi.",
  },
  governingLawBody: {
    en: "These Terms are governed by the laws of Morocco. Any disputes will be handled by the competent courts in Laayoune, Morocco.",
    ar: "تخضع هذه الشروط لقوانين المغرب. سيتم التعامل مع أي نزاعات من قبل المحاكم المختصة في العيون، المغرب.",
    fr: "Les présentes conditions sont régies par les lois du Maroc. Tout litige sera traité par les tribunaux compétents de Laayoune, Maroc.",
  },
  changesTermsBody: {
    en: "We may update these Terms to reflect improvements or new requirements. If changes are significant, we will let you know in the app or by email. Continued use of the app after notice means you accept the updated Terms.",
    ar: "قد نقوم بتحديث هذه الشروط لتعكس التحسينات أو المتطلبات الجديدة. إذا كانت التغييرات كبيرة، سنخطرك في التطبيق أو عبر البريد الإلكتروني. استمرار استخدام التطبيق بعد الإشعار يعني قبولك للشروط المحدثة.",
    fr: "Nous pouvons mettre à jour ces conditions pour refléter des améliorations ou de nouvelles exigences. Si les modifications sont importantes, nous vous en informerons dans l'application ou par e-mail. L'utilisation continue de l'application après notification signifie que vous acceptez les conditions mises à jour.",
  },
  contactBody: {
    en: `Questions or concerns? Contact us at ${SUPPORT_EMAIL} or through the app via WhatsApp. We are here to help our guests and delivery team in Laayoune.`,
    ar: `أسئلة أو استفسارات؟ اتصل بنا على ${SUPPORT_EMAIL} أو عبر التطبيق عبر واتساب. نحن هنا لمساعدة ضيوفنا وفريق التوصيل في العيون.`,
    fr: `Des questions ou des préoccupations ? Contactez-nous à ${SUPPORT_EMAIL} ou via l'application par WhatsApp. Nous sommes là pour aider nos clients et notre équipe de livraison à Laayoune.`,
  },
  privacyLinkLabel: { en: 'View Privacy Policy', ar: 'عرض سياسة الخصوصية', fr: 'Voir la politique de confidentialité' },
  termsLinkLabel: { en: 'Open Terms page', ar: 'افتح صفحة الشروط', fr: 'Ouvrir la page des conditions' },
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

const LinkText: React.FC<{ label: string; onPress: () => void; isRTL?: boolean }> = ({
  label,
  onPress,
  isRTL,
}) => (
  <Text style={[styles.body, isRTL && styles.textRTL]}>
    <Text onPress={onPress} style={styles.link}>
      {label}
    </Text>
  </Text>
);

const TermsOfService: React.FC = () => {
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
    <SafeAreaView style={styles.safeArea}>
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

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.heading} />
        </TouchableOpacity>

        <Text style={[styles.title, isRTL && styles.textRTL]}>{t(translations.title)}</Text>

        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Introduction */}
          <Section title={t(translations.introduction)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.introBody)}
            </Text>
          </Section>

          {/* Eligibility */}
          <Section title={t(translations.eligibility)} isRTL={isRTL}>
            {getBullets('eligibilityBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* Service Description */}
          <Section title={t(translations.serviceDescription)} isRTL={isRTL}>
            {getBullets('serviceBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* User Responsibilities */}
          <Section title={t(translations.userResponsibilities)} isRTL={isRTL}>
            {getBullets('userResponsibilitiesBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* Payments & Fees */}
          <Section title={t(translations.paymentsFees)} isRTL={isRTL}>
            {getBullets('paymentsBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* Cancellations & Refunds */}
          <Section title={t(translations.cancellationsRefunds)} isRTL={isRTL}>
            {getBullets('cancellationsBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* Restaurant Quality Disclaimer */}
          <Section title={t(translations.restaurantQuality)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.restaurantQualityBody)}
            </Text>
          </Section>

          {/* Delivery */}
          <Section title={t(translations.delivery)} isRTL={isRTL}>
            {getBullets('deliveryBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
          </Section>

          {/* Privacy */}
          <Section title={t(translations.privacy)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.privacyBody)}
            </Text>
            <View style={{ marginTop: 8 }}>
              <LinkText
                label={t(translations.privacyLinkLabel)}
                onPress={() => openUrl(PRIVACY_POLICY_URL)}
                isRTL={isRTL}
              />
            </View>
          </Section>

          {/* Account Suspension */}
          <Section title={t(translations.accountSuspension)} isRTL={isRTL}>
            {getBullets('accountSuspensionBullets').map((text, idx) => (
              <Bullet key={idx} text={text} isRTL={isRTL} />
            ))}
            <Text style={[styles.body, { marginTop: 6 }, isRTL && styles.textRTL]}>
              {t(translations.accountSuspensionFooter)}
            </Text>
          </Section>

          {/* Limitation of Liability */}
          <Section title={t(translations.limitationLiability)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.limitationBody)}
            </Text>
          </Section>

          {/* Governing Law */}
          <Section title={t(translations.governingLaw)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.governingLawBody)}
            </Text>
          </Section>

          {/* Changes to Terms */}
          <Section title={t(translations.changesTerms)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.changesTermsBody)}
            </Text>
          </Section>

          {/* Contact */}
          <Section title={t(translations.contact)} isRTL={isRTL}>
            <Text style={[styles.body, isRTL && styles.textRTL]}>
              {t(translations.contactBody).split(SUPPORT_EMAIL).map((part, idx) => (
                <Text key={idx}>
                  {part}
                  {idx === 0 && (
                    <Text style={styles.link} onPress={() => openMail(SUPPORT_EMAIL)}>
                      {SUPPORT_EMAIL}
                    </Text>
                  )}
                </Text>
              ))}
            </Text>
            <View style={{ marginTop: 8 }}>
              <LinkText
                label={t(translations.termsLinkLabel)}
                onPress={() => openUrl(TERMS_URL)}
                isRTL={isRTL}
              />
            </View>
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

export default TermsOfService;