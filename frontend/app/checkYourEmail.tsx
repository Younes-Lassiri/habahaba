import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";
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
  gradientStart: '#E5C585',
  gradientEnd: '#C5A065',
  gradientLightStart: '#F9F5EB',
  gradientLightEnd: '#F2EBD9',
};

const EnterCodeResetPassword = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const [errors, setErrors] = useState<{
    code?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const handleResetPassword = async () => {
    const newErrors: { code?: string; password?: string; confirmPassword?: string } = {};

    if (!code) newErrors.code = "Verification code is required";
    if (!password.trim()) newErrors.password = "Password is required";
    if (!confirmPassword.trim()) newErrors.confirmPassword = "Confirm password is required";


    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // ✅ Only change: save errors and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);   // <-- write it HERE
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "https://haba-haba-api.ubua.cloud/api/auth/reset-password",
        {
          email,
          code,
          password: password.trim()
        }
      );

      setLoading(false);

      if (response.data.success) {
        await AsyncStorage.setItem("token", response.data.token);
        await AsyncStorage.setItem("client", JSON.stringify(response.data.client));

        // Use whichever ID field exists
        const clientId = response.data.client.id || response.data.client._id;
        if (clientId) {
          await registerForPushNotificationsAsync("client", clientId);
        } else {
          console.error('No client ID found in response!');
        }

        router.push("/");
      } else {
        Alert.alert("Error", response.data.message || "Failed to reset password");
      }
    } catch (error: any) {
      setLoading(false);
      console.log(error);

      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert("Error", error.response.data.message);
      } else {
        Alert.alert("Error", "Something went wrong");
      }
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
                  <MaterialIcons name="lock-reset" size={40} color={COLORS.white} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter the verification code sent to{'\n'}
                <Text style={styles.emailText}>{email}</Text>
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              {/* Verification Code Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <MaterialIcons name="verified-user" size={16} color={COLORS.mediumText} /> Verification Code
                </Text>
                <View style={[
                  styles.inputContainer,
                  codeFocused && styles.inputContainerFocused,
                  errors.code && styles.inputContainerError
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
                      if (errors.code) setErrors({ ...errors, code: undefined });
                    }}
                    onFocus={() => setCodeFocused(true)}
                    onBlur={() => setCodeFocused(false)}
                    editable={!loading}
                  />
                </View>
                {errors.code && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{errors.code}</Text>
                  </View>
                )}
              </View>

              {/* New Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <MaterialIcons name="lock" size={16} color={COLORS.mediumText} /> New Password
                </Text>
                <View style={[
                  styles.inputContainer,
                  passwordFocused && styles.inputContainerFocused,
                  errors.password && styles.inputContainerError
                ]}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Enter new password"
                    placeholderTextColor={COLORS.lightText}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={COLORS.mediumText}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{errors.password}</Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <MaterialIcons name="lock" size={16} color={COLORS.mediumText} /> Confirm Password
                </Text>
                <View style={[
                  styles.inputContainer,
                  confirmPasswordFocused && styles.inputContainerFocused,
                  errors.confirmPassword && styles.inputContainerError
                ]}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Re-enter new password"
                    placeholderTextColor={COLORS.lightText}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                    }}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={20}
                      color={COLORS.mediumText}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  </View>
                )}
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password must contain:</Text>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={password.length >= 8 ? COLORS.primaryGold : COLORS.lightText}
                  />
                  <Text style={[styles.requirementText, password.length >= 8 && styles.requirementMet]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={/[A-Z]/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={/[A-Z]/.test(password) ? COLORS.primaryGold : COLORS.lightText}
                  />
                  <Text style={[styles.requirementText, /[A-Z]/.test(password) && styles.requirementMet]}>
                    One uppercase letter
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={/\d/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={/\d/.test(password) ? COLORS.primaryGold : COLORS.lightText}
                  />
                  <Text style={[styles.requirementText, /\d/.test(password) && styles.requirementMet]}>
                    One number
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={/[!@#$%^&*()_+{}\[\]:;<>,.?~\-=/\\]/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={/[!@#$%^&*()_+{}\[\]:;<>,.?~\-=/\\]/.test(password) ? COLORS.primaryGold : COLORS.lightText}
                  />
                  <Text style={[styles.requirementText, /[!@#$%^&*()_+{}\[\]:;<>,.?~\-=/\\]/.test(password) && styles.requirementMet]}>
                    One special character
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
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
                      <Text style={styles.buttonText}>Reset Password</Text>
                      <MaterialIcons name="arrow-forward" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default EnterCodeResetPassword;

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
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginLeft: 4,
    flex: 1,
  },
  requirementsContainer: {
    backgroundColor: COLORS.lightGold,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 10,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
    color: COLORS.mediumText,
    marginLeft: 8,
  },
  requirementMet: {
    color: COLORS.primaryGold,
    fontWeight: '500',
  },
  button: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
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
});