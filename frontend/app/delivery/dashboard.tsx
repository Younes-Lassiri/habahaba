import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Package, CheckCircle2, XCircle, TrendingUp, DollarSign } from "lucide-react-native";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleQuickAction = (action: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (action === 'orders') {
      router.push('/orders');
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const StatCard = ({
    icon,
    title,
    count,
    color,
    delay,
  }: {
    icon: React.ReactNode;
    title: string;
    count: number;
    color: string;
    delay: number;
  }) => {
    const cardAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
      }).start();
    }, [cardAnim, delay]);

    return (
      <Animated.View
        style={[
          styles.statCard,
          {
            transform: [
              {
                scale: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
            opacity: cardAnim,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
          {icon}
        </View>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statCount}>{count}</Text>
      </Animated.View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 24,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.driverName}>Driver Name</Text>
          </View>
          <TouchableOpacity style={styles.avatar}>
            <Text style={styles.avatarText}>D</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.dateContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.date}>{today}</Text>
        </Animated.View>

        <View style={styles.statsContainer}>
          <StatCard
            icon={<Package size={28} color="#007AFF" />}
            title="Active Orders"
            count={0}
            color="#007AFF"
            delay={0}
          />
          <StatCard
            icon={<CheckCircle2 size={28} color="#34C759" />}
            title="Delivered"
            count={0}
            color="#34C759"
            delay={100}
          />
          <StatCard
            icon={<XCircle size={28} color="gray" />}
            title="Canceled"
            count={0}
            color="gray"
            delay={200}
          />
        </View>

        <Animated.View
          style={[
            styles.earningsCard,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.earningsHeader}>
            <View style={styles.earningsIconContainer}>
              <DollarSign size={24} color="#34C759" />
            </View>
            <View style={styles.earningsContent}>
              <Text style={styles.earningsLabel}>Today&apos;s Earnings</Text>
              <Text style={styles.earningsValue}>0.00 MAD</Text>
            </View>
            <View style={styles.earningsBadge}>
              <TrendingUp size={16} color="#34C759" />
            </View>
          </View>
          <View style={styles.earningsFooter}>
            <Text style={styles.earningsSubtext}>Commission from 0 deliveries</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.quickActions,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/delivery/orders')}
            >
              <Package size={20} color="white" />
              <Text style={styles.actionButtonText}>View Active Orders</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    backgroundColor: "white",
  },
  greeting: {
    fontSize: 16,
    color: "gray",
  },
  driverName: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "black",
    marginTop: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "white",
  },
  dateContainer: {
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  date: {
    fontSize: 14,
    color: "gray",
  },
  statsContainer: {
    padding: 24,
    gap: 16,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  statTitle: {
    fontSize: 14,
    color: "gray",
    flex: 1,
  },
  statCount: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "black",
  },
  earningsCard: {
    backgroundColor: "white",
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  earningsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  earningsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  earningsContent: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 13,
    color: "gray",
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "black",
  },
  earningsBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  earningsFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  earningsSubtext: {
    fontSize: 12,
    color: "gray",
  },
  quickActions: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "black",
    marginBottom: 16,
  },
  actionGrid: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600" as const,
  },
});