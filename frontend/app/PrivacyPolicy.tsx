import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";

const COLORS = {
  background: "#F9F6EF",
  surface: "#FFFFFF",
  heading: "#1F2937",
  body: "#4B5563",
  accent: Colors.primary,
  border: "#E5E7EB",
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

const PrivacyPolicy: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.heading} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Section title="Introduction">
            <Text style={styles.body}>
              HabaHaba respects your data and your time. This Privacy Policy
              explains what we collect, how we use it, and how we protect your
              information while serving guests of our HabaHaba restaurant in
              Laayoune. This is a single-restaurant app, not a marketplace.
            </Text>
          </Section>

          <Section title="Information We Collect">
            <Bullet text="Name and contact details (phone number, email) to set up and manage your account." />
            <Bullet text="Delivery address and instructions to deliver HabaHaba orders accurately." />
            <Bullet text="Order history for HabaHaba only, to fulfill orders and improve our menu and service." />
            <Bullet text="Payment details handled securely by our payment partners; we do not store full card numbers." />
            <Bullet text="Device and app usage data (like app version, crash logs) to keep the app reliable." />
          </Section>

          <Section title="How We Use Your Information">
            <Bullet text="Process and deliver your HabaHaba orders with our in-house team." />
            <Bullet text="Provide customer support and resolve issues fairly." />
            <Bullet text="Improve app performance, reliability, and features that make ordering smoother." />
            <Bullet text="Send important updates about your orders, account, new offers and promo codes,or changes to our policies." />
            <Bullet text="Maintain secure sessions using authentication tokens so you stay connected safely." />
          </Section>

          <Section title="Data Sharing">
            <Bullet text="Our HabaHaba kitchen receives your order details to prepare your food." />
            <Bullet text="Our HabaHaba delivery team receives pickup/drop-off details and your contact number for coordination." />
            <Bullet text="Payment processors handle transactions securely; we do not sell your personal data." />
          </Section>

          <Section title="Location Data">
            <Text style={styles.body}>
              We use your location to find nearby restaurants, calculate delivery
              times, and guide our delivery team. You can control location
              permissions in your device settings, but some features may not
              work without location access.
            </Text>
          </Section>

          <Section title="Authentication Tokens">
            <Text style={styles.body}>
              The app uses secure tokens to keep you signed in. Tokens are stored
              on your device to maintain your session. Do not share your device
              or login; you can log out anytime from the account section if you
              want to clear the session.
            </Text>
          </Section>

          <Section title="Data Security">
            <Text style={styles.body}>
              We use reasonable technical and organizational measures to protect
              your information. While no system is perfect, we continuously work
              to keep data safe and limit access to those who need it to operate
              the service.
            </Text>
          </Section>

          <Section title="Your Choices & Rights">
            <Bullet text="You can access and update your account details in the app." />
            <Bullet text="You can request deletion of your account; we will remove data we are not required to keep for legal or operational reasons." />
            <Bullet text="You can manage and location permissions in your device settings." />
          </Section>

          <Section title="Cookies & Similar Technologies">
            <Text style={styles.body}>
              If we use cookies or similar tools, it is to keep you signed in,
              remember preferences, and improve performance. You can adjust your
              browser or device settings to limit these, but some app functions
              may be affected.
            </Text>
          </Section>

          <Section title="Children">
            <Text style={styles.body}>
              Our service is intended for adults (18+). We do not knowingly
              collect personal data from children.
            </Text>
          </Section>

          <Section title="Changes to This Policy">
            <Text style={styles.body}>
              If we update this Policy, we will notify by
              email when the changes are important. Continued use of the app
              means you accept the updated Policy.
            </Text>
          </Section>

          <Section title="Contact">
            <Text style={styles.body}>
              Have a privacy question? Contact us at{" "}
              <Text style={styles.link}>support@HabaHaba.com</Text> or through
              the in-app support page. We respect your data and the trust of our
              guests and team in Laayoune.
            </Text>
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

export default PrivacyPolicy;
