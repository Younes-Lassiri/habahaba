import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { registerForPushNotificationsAsync } from "@/utils/notifications";

const COLORS = {
  primaryGold: '#C5A065',
  primaryGoldDark: '#9C7C3A',
  lightGold: '#F9F5EB',
  white: '#FFFFFF',
  darkText: '#1F2937',
  mediumText: '#6B7280',
  lightText: '#9CA3AF',
  inputBorder: '#E5E7EB',
  inputFocus: '#C5A065',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  gradientStart: '#E5C585',
  gradientEnd: '#C5A065',
  gradientLightStart: '#F9F5EB',
  gradientLightEnd: '#F2EBD9',
};

const EmailVerificationPage = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeFocused, setCodeFocused] = useState(false);

  useEffect(() => {
    const loadPassword = async () => {
      const storedPassword = await AsyncStorage.getItem("tempPassword");
      if (storedPassword) setPassword(storedPassword);
    };
    loadPassword();
  }, []);

  const handleVerify = async () => {
    if (!code) {
      setError("Please enter the verification code");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // 1️⃣ Verify email code
      const response = await fetch("https://haba-haba-api.ubua.cloud/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Verification failed");
        return;
      }

      // 2️⃣ Automatic login after successful verification
      const loginResponse = await fetch("https://haba-haba-api.ubua.cloud/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginText = await loginResponse.text();
      let loginData;
      try {
        loginData = JSON.parse(loginText);
      } catch {
        throw new Error("Invalid server response during login");
      }

      if (!loginResponse.ok) {
        Alert.alert("Login failed", loginData.message || "Could not login automatically");
        router.push("/signin");
        return;
      }

      await AsyncStorage.setItem("token", loginData.token);
      await AsyncStorage.setItem("client", JSON.stringify(loginData.client));
      await AsyncStorage.removeItem("tempPassword");

      // Use whichever ID field exists
      const clientId = loginData.client.id;
      if (clientId) {
        await registerForPushNotificationsAsync("client", clientId);
      } else {
        console.error('No client ID found in response!');
      }


      Alert.alert("Success", "Email verified and logged in successfully");
      router.push("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[COLORS.gradientLightStart, COLORS.gradientLightEnd]}
        style={styles.gradientBackground}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.iconGradient}
                >
                  <MaterialIcons name="verified-user" size={40} color={COLORS.white} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                Enter the verification code we sent to{'\n'}
                <Text style={styles.emailText}>{email}</Text>
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              {/* Code Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <MaterialIcons name="mail-outline" size={16} color={COLORS.mediumText} /> Verification Code
                </Text>
                <View style={[
                  styles.inputContainer,
                  codeFocused && styles.inputContainerFocused,
                  error && styles.inputContainerError,
                ]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={COLORS.lightText}
                    keyboardType="numeric"
                    maxLength={6}
                    value={code}
                    onChangeText={(text) => {
                      setCode(text);
                      if (error) setError("");
                    }}
                    onFocus={() => setCodeFocused(true)}
                    onBlur={() => setCodeFocused(false)}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify Email</Text>
                      <MaterialIcons name="arrow-forward" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={COLORS.primaryGold} />
                <Text style={styles.infoText}>
                  Check your email for the verification code
                </Text>
              </View>
            </View>

            {/* Back to Sign In */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/signin")}
              activeOpacity={0.6}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.primaryGold} />
              <Text style={styles.backText}>Back to Sign In</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 40 : 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryGold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: COLORS.darkText,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.mediumText,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: "700",
    color: COLORS.primaryGold,
  },
  formContainer: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 8,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 56,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputContainerFocused: {
    borderColor: COLORS.inputFocus,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.inputFocus,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  inputContainerError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.darkText,
    padding: 0,
  },
  errorContainer: {
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    padding: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  button: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGold,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryGold,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.mediumText,
    marginLeft: 10,
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  backText: {
    color: COLORS.primaryGold,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default EmailVerificationPage;