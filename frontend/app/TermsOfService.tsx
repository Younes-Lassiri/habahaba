import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  background: "#F9F6EF",
  surface: "#FFFFFF",
  heading: "#1F2937",
  body: "#4B5563",
  accent: '#93522B',
  border: "#E5E7EB",
};

const APP_NAME = "Haba Haba – Food Delivery";
const SUPPORT_EMAIL = "habahaba@gmail.com";

// ✅ Replace these with your real URLs when ready
const PRIVACY_POLICY_URL = "haba-haba-admin-panel.ubua.cloud/privacy-policy";
const TERMS_URL = "https://haba-haba-admin-panel.ubua.cloud/terms-services"; // optional
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

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Bullet: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.bulletRow}>
    <View style={styles.bulletDot} />
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const LinkText: React.FC<{ label: string; onPress: () => void }> = ({
  label,
  onPress,
}) => (
  <Text style={styles.body}>
    <Text onPress={onPress} style={styles.link}>
      {label}
    </Text>
  </Text>
);

const TermsOfService: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
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

        <Text style={styles.title}>Terms of Service</Text>

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
          <Section title="Introduction">
            <Text style={styles.body}>
              Welcome to {APP_NAME}, the official delivery app for our Haba Haba
              restaurant in Laayoune. This app lets you browse our menu, place
              orders, and receive delivery handled directly by Haba Haba and its
              own delivery team. By creating an account or using the app, you
              agree to these Terms.
            </Text>
          </Section>

          <Section title="Eligibility & Account Responsibility">
            <Bullet text="You are at least 14 years old and able to enter into agreements." />
            <Bullet text="You will keep your account details accurate and secure." />
            <Bullet text="You are responsible for all activity under your account." />
            <Bullet text="The app uses secure tokens to keep you signed in; keep your device and login safe and do not share access." />
          </Section>

          <Section title="Service Description">
            <Bullet text="You place orders for Haba Haba restaurant only, directly inside this app." />
            <Bullet text="Our kitchen prepares the food and is responsible for its quality, safety, and accuracy." />
            <Bullet text="Haba Haba’s own delivery team coordinates pickup and drop-off to your address in Laayoune." />
            <Bullet text="Estimated times are guidance; we work to keep them accurate and communicate delays when they occur." />
          </Section>

          <Section title="User Responsibilities">
            <Bullet text="Provide correct delivery details and contact information." />
            <Bullet text="Be respectful to Haba Haba staff, delivery team, and support." />
            <Bullet text="Use the service lawfully and do not misuse promotions or payments." />
          </Section>

          <Section title="Payments & Fees">
            <Bullet text="Prices and delivery fees are shown before you confirm an order." />
            <Bullet text="Your chosen payment method will be charged (or confirmed) when you place an order." />
            <Bullet text="If something goes wrong, we review refunds fairly and case by case." />
          </Section>

          <Section title="Cancellations & Refunds">
            <Bullet text="You may request a cancellation before an order is prepared; once preparation starts, cancellation may not be possible." />
            <Bullet text="If an order is incorrect, missing items, or has quality issues, contact support and we will review the case fairly." />
            <Bullet text="Refunds (when approved) are processed to the original payment method when applicable, or via another agreed solution." />
          </Section>

          <Section title="Restaurant Quality Disclaimer">
            <Text style={styles.body}>
              Haba Haba is responsible for preparing and packaging your order in
              line with local hygiene standards. While we handle cooking and
              delivery, circumstances like traffic or weather can affect arrival
              times; we work to minimize impact and keep you informed.
            </Text>
          </Section>

          <Section title="Delivery">
            <Bullet text="Our Haba Haba delivery team handles pickup and drop-off." />
            <Bullet text="Please be available at the delivery location and keep your phone reachable." />
            <Bullet text="If we cannot complete delivery due to wrong details or no response, fees may still apply." />
          </Section>

          <Section title="Privacy">
            <Text style={styles.body}>
              Your use of the app is also subject to our Privacy Policy, which
              explains how we collect and use data (such as location for
              delivery, account info, and order updates).
            </Text>

            <View style={{ marginTop: 8 }}>
              <LinkText
                label="View Privacy Policy"
                onPress={() => openUrl(PRIVACY_POLICY_URL)}
              />
            </View>
          </Section>

          <Section title="Account Suspension or Termination">
            <Bullet text="Fraud, abuse, harassment, or illegal activity." />
            <Bullet text="Repeated order issues caused by misuse of the service." />
            <Bullet text="Any violation of these Terms." />
            <Text style={[styles.body, { marginTop: 6 }]}>
              We may suspend or close accounts in these cases to protect our
              community.
            </Text>
          </Section>

          <Section title="Limitation of Liability">
            <Text style={styles.body}>
              We work hard to provide a reliable service, but sometimes things
              happen outside our control. To the fullest extent allowed by law,
              Haba Haba is not liable for indirect or incidental losses.
              Nothing in these Terms limits any rights you have that cannot be
              limited by law.
            </Text>
          </Section>

          <Section title="Governing Law">
            <Text style={styles.body}>
              These Terms are governed by the laws of Morocco. Any disputes will
              be handled by the competent courts in Laayoune, Morocco.
            </Text>
          </Section>

          <Section title="Changes to These Terms">
            <Text style={styles.body}>
              We may update these Terms to reflect improvements or new
              requirements. If changes are significant, we will let you know in
              the app or by email. Continued use of the app after notice means
              you accept the updated Terms.
            </Text>
          </Section>

          <Section title="Contact">
            <Text style={styles.body}>
              Questions or concerns? Contact us at{" "}
              <Text style={styles.link} onPress={() => openMail(SUPPORT_EMAIL)}>
                {SUPPORT_EMAIL}
              </Text>{" "}
              or through the app via WhatsApp. We are here to help our guests
              and delivery team in Laayoune.
            </Text>

            {/* Optional: if you want a public terms link too */}
            <View style={{ marginTop: 8 }}>
              <LinkText
                label="Open Terms page"
                onPress={() => openUrl(TERMS_URL)}
              />
            </View>
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 7,
    marginRight: 10,
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
});

export default TermsOfService;