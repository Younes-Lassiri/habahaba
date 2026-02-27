import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '@/constants/Colors';

type Theme = 'light' | 'dark' | 'auto';
type Language = 'English' | 'Arabic' | 'French' | 'Spanish';
type Currency = 'USD ($)' | 'MAD (MAD)' | 'EUR (€)';

interface SettingsState {
  notifications: {
    orderUpdates: boolean;
    promotions: boolean;
    newRestaurants: boolean;
    deliveryReminders: boolean;
  };
  privacy: {
    shareLocation: boolean;
    shareOrderHistory: boolean;
    analytics: boolean;
  };
  preferences: {
    language: Language;
    currency: Currency;
    theme: Theme;
  };
}

const DEFAULT_SETTINGS: SettingsState = {
  notifications: {
    orderUpdates: true,
    promotions: true,
    newRestaurants: false,
    deliveryReminders: true,
  },
  privacy: {
    shareLocation: true,
    shareOrderHistory: false,
    analytics: true,
  },
  preferences: {
    language: 'English',
    currency: 'MAD (MAD)',
    theme: 'light',
  },
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: SettingsState) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const updateNotification = (key: keyof SettingsState['notifications'], value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updatePrivacy = (key: keyof SettingsState['privacy'], value: boolean) => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updatePreference = <K extends keyof SettingsState['preferences']>(
    key: K,
    value: SettingsState['preferences'][K]
  ) => {
    const newSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const handleResetAppData = () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all your app data including preferences, cart, and cached data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setSettings(DEFAULT_SETTINGS);
              Alert.alert('Success', 'App data has been reset.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app data.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Handle account deletion
            Alert.alert('Account Deletion', 'Account deletion request has been submitted.');
          },
        },
      ]
    );
  };

  const languages: Language[] = ['English', 'Arabic', 'French', 'Spanish'];
  const currencies: Currency[] = ['USD ($)', 'MAD (MAD)', 'EUR (€)'];
  const themes: Theme[] = ['light', 'dark', 'auto'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Order Updates</Text>
              <Text style={styles.settingDescription}>
                Get notified about order status changes
              </Text>
            </View>
            <Switch
              value={settings.notifications.orderUpdates}
              onValueChange={(value) => updateNotification('orderUpdates', value)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Promotions & Offers</Text>
              <Text style={styles.settingDescription}>
                Receive special deals and discounts
              </Text>
            </View>
            <Switch
              value={settings.notifications.promotions}
              onValueChange={(value) => updateNotification('promotions', value)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>New Restaurants</Text>
              <Text style={styles.settingDescription}>
                Know when new restaurants join
              </Text>
            </View>
            <Switch
              value={settings.notifications.newRestaurants}
              onValueChange={(value) => updateNotification('newRestaurants', value)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Delivery Reminders</Text>
              <Text style={styles.settingDescription}>
                Reminders about upcoming deliveries
              </Text>
            </View>
            <Switch
              value={settings.notifications.deliveryReminders}
              onValueChange={(value) => updateNotification('deliveryReminders', value)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* App Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Language</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{settings.preferences.language}</Text>
              <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowCurrencyModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Currency</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{settings.preferences.currency}</Text>
              <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Theme</Text>
            </View>
            <View style={styles.themeButtons}>
              {themes.map((theme) => (
                <TouchableOpacity
                  key={theme}
                  style={[
                    styles.themeButton,
                    settings.preferences.theme === theme && styles.themeButtonActive,
                  ]}
                  onPress={() => updatePreference('theme', theme)}
                >
                  <Text
                    style={[
                      styles.themeButtonText,
                      settings.preferences.theme === theme && styles.themeButtonTextActive,
                    ]}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Share Location</Text>
              <Text style={styles.settingDescription}>
                Allow location sharing for better delivery
              </Text>
            </View>
            <Switch
              value={settings.privacy.shareLocation}
              onValueChange={(value) => updatePrivacy('shareLocation', value)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Share Order History</Text>
              <Text style={styles.settingDescription}>
                Help improve recommendations
              </Text>
            </View>
            <Switch
              value={settings.privacy.shareOrderHistory}
              onValueChange={(value) => updatePrivacy('shareOrderHistory', value)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Analytics</Text>
              <Text style={styles.settingDescription}>
                Help us improve the app experience
              </Text>
            </View>
            <Switch
              value={settings.privacy.analytics}
              onValueChange={(value) => updatePrivacy('analytics', value)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfoWithIcon}>
              <Ionicons name="download-outline" size={20} color={Colors.text.primary} />
              <Text style={styles.settingLabel}>Export Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfoWithIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.text.primary} />
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfoWithIcon}>
              <Ionicons name="document-text-outline" size={20} color={Colors.text.primary} />
              <Text style={styles.settingLabel}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleResetAppData}
          >
            <Ionicons name="refresh" size={20} color={Colors.error} />
            <Text style={styles.dangerButtonText}>Reset App Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language}
                  style={[
                    styles.modalOption,
                    settings.preferences.language === language && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    updatePreference('language', language);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      settings.preferences.language === language && styles.modalOptionTextActive,
                    ]}
                  >
                    {language}
                  </Text>
                  {settings.preferences.language === language && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.modalOption,
                    settings.preferences.currency === currency && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    updatePreference('currency', currency);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      settings.preferences.currency === currency && styles.modalOptionTextActive,
                    ]}
                  >
                    {currency}
                  </Text>
                  {settings.preferences.currency === currency && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backArrow: { fontSize: 24, color: '#000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.gray[50],
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  dangerTitle: {
    color: Colors.error,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingInfoWithIcon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValueText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  themeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  themeButtonTextActive: {
    color: '#FFFFFF',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalOptionActive: {
    backgroundColor: Colors.primaryLight,
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  modalOptionTextActive: {
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});



