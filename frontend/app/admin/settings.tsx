import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Switch,
    Modal,
    TextInput,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage, Language  } from './contexts/LanguageContext'; // adjust path if needed

const API_URL = 'https://haba-haba-api.ubua.cloud/api/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RestaurantSettings {
    restaurant_name: string;
    phone: string;
    restaurant_email: string;
    is_open: boolean;
    delivery_fee: number;
    min_order_amount: number;
}

interface OperatingHour {
    id: number;
    day_of_week: number;
    day_name: string;
    is_closed: boolean;
    open_time: string;
    close_time: string;
}

interface OpenStatus {
    is_open: boolean;
    current_time: string;
    current_day: string;
    today_schedule: {
        day_name: string;
        is_closed: boolean;
        open_time: string;
        close_time: string;
    } | null;
    next_open: {
        day_name: string;
        time: string;
    } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSettings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // ── existing state ──────────────────────────────────────────────────────
    const [token, setToken] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<RestaurantSettings | null>(null);
    const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
    const [openStatus, setOpenStatus] = useState<OpenStatus | null>(null);
    const [showHoursModal, setShowHoursModal] = useState(false);
    const [editingDay, setEditingDay] = useState<OperatingHour | null>(null);
    const [editOpenTime, setEditOpenTime] = useState('');
    const [editCloseTime, setEditCloseTime] = useState('');
    const [editIsClosed, setEditIsClosed] = useState(false);
    const [savingHours, setSavingHours] = useState(false);

    // ── language (from context) ─────────────────────────────────────────────
    const { language, t, isRTL, setLanguage: setContextLanguage } = useLanguage();
    const T = t.settings;
    const TC = t.common;
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [savingLanguage, setSavingLanguage] = useState(false);

    // Arabic day name map
    const arabicDayNames: Record<string, string> = {
        Monday: 'الاثنين',
        Tuesday: 'الثلاثاء',
        Wednesday: 'الأربعاء',
        Thursday: 'الخميس',
        Friday: 'الجمعة',
        Saturday: 'السبت',
        Sunday: 'الأحد',
    };
    const getDayName = (name: string) => isRTL ? (arabicDayNames[name] ?? name) : name;

    // ── RTL helper — returns row direction style ────────────────────────────
    const rtlRow = isRTL ? { flexDirection: 'row-reverse' as const } : {};
    // Swaps marginLeft for marginRight in RTL
    const rtlMargin = (ltrMarginLeft: number) =>
        isRTL
            ? { marginRight: ltrMarginLeft, marginLeft: 0 }
            : { marginLeft: ltrMarginLeft };

    useEffect(() => {
        loadAdminData();
    }, []);

    useEffect(() => {
        if (token) {
            fetchSettings();
            fetchOperatingHours();
            fetchOpenStatus();
        }
    }, [token]);

    // ── language selector handler ───────────────────────────────────────────
    const handleSelectLanguage = async (lang: Language) => {
        setSavingLanguage(true);
        try {
            await setContextLanguage(lang);

            if (token) {
                axios
                    .post(
                        `${API_URL}/set-language`,
                        { language: lang },
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                    .catch((err) =>
                        console.warn('Backend language sync failed:', err?.message)
                    );
            }

            setShowLanguageModal(false);
        } catch (error) {
            console.error('Error saving language:', error);
        } finally {
            setSavingLanguage(false);
        }
    };

    // ── existing handlers ───────────────────────────────────────────────────

    const loadAdminData = async () => {
        try {
            const token = await AsyncStorage.getItem('adminToken');
            const adminDataString = await AsyncStorage.getItem('adminData');

            if (token) {
                setToken(token);

                if (adminDataString) {
                    try {
                        const adminData = JSON.parse(adminDataString);
                        setUserEmail(adminData.email || 'admin@restaurant.com');
                    } catch (parseError) {
                        console.error('Error parsing admin data:', parseError);
                        setUserEmail('admin@restaurant.com');
                    }
                } else {
                    setUserEmail('admin@restaurant.com');
                }
            }
        } catch (error) {
            console.error('❌ Error loading admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${API_URL}/restaurant-settings`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSettings(response.data.settings || response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchOperatingHours = async () => {
        try {
            const response = await axios.get(`${API_URL}/operating-hours`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.data.success) {
                setOperatingHours(response.data.operatingHours);
            }
        } catch (error: any) {
            console.error('❌ Error fetching operating hours:', error?.response?.data || error.message);
            Alert.alert(TC.error, T.loadFailed);
        }
    };

    const fetchOpenStatus = async () => {
        try {
            const response = await axios.get(`${API_URL}/open-status`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.data.success) {
                setOpenStatus(response.data);
            }
        } catch (error: any) {
            console.error('❌ Error fetching open status:', error?.response?.data || error.message);
        }
    };

    const openEditModal = (hour: OperatingHour) => {
        setEditingDay(hour);
        setEditOpenTime(hour.open_time);
        setEditCloseTime(hour.close_time);
        setEditIsClosed(hour.is_closed);
        setShowHoursModal(true);
    };

    const incrementTime = (timeType: 'open' | 'close') => {
        const currentTime = timeType === 'open' ? editOpenTime : editCloseTime;
        const [hours, minutes] = currentTime.split(':').map(Number);
        let newHours = hours;
        let newMinutes = minutes + 30;
        if (newMinutes >= 60) { newMinutes -= 60; newHours += 1; }
        if (newHours >= 24) { newHours = 0; }
        const newTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        if (timeType === 'open') setEditOpenTime(newTime);
        else setEditCloseTime(newTime);
    };

    const decrementTime = (timeType: 'open' | 'close') => {
        const currentTime = timeType === 'open' ? editOpenTime : editCloseTime;
        const [hours, minutes] = currentTime.split(':').map(Number);
        let newHours = hours;
        let newMinutes = minutes - 30;
        if (newMinutes < 0) { newMinutes += 60; newHours -= 1; }
        if (newHours < 0) { newHours = 23; }
        const newTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        if (timeType === 'open') setEditOpenTime(newTime);
        else setEditCloseTime(newTime);
    };

    const saveOperatingHours = async () => {
        if (!editingDay) return;
        setSavingHours(true);
        try {
            await axios.put(
                `${API_URL}/operating-hours`,
                {
                    day_of_week: editingDay.day_of_week,
                    is_closed: editIsClosed,
                    open_time: editOpenTime,
                    close_time: editCloseTime,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert(TC.success, `${editingDay.day_name} ${T.saveSuccess}`);
            setShowHoursModal(false);
            fetchOperatingHours();
            fetchOpenStatus();
            fetchSettings();
        } catch (error) {
            console.error('Error saving operating hours:', error);
            Alert.alert(TC.error, T.saveFailed);
        } finally {
            setSavingHours(false);
        }
    };

    const formatTime = (time: string) => {
        if (!time) return '--:--';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const toggleRestaurantStatus = async () => {
        if (!settings || !token) {
            Alert.alert(TC.error, T.settingsLoadError);
            return;
        }
        try {
            const newStatus = !settings.is_open;
            await axios.put(
                `${API_URL}/restaurant-settings`,
                { is_open: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSettings((prev: RestaurantSettings | null) =>
                prev ? { ...prev, is_open: newStatus } : null
            );
            Alert.alert(TC.success, T.restaurantNowOpen(newStatus));
        } catch (error: any) {
            console.error('Error toggling restaurant status:', error);
            if (error.response?.status === 401) {
                Alert.alert(TC.sessionExpired, TC.sessionExpiredMessage);
                await AsyncStorage.removeItem('adminToken');
            } else {
                Alert.alert(TC.error, error.response?.data?.message || 'Failed to update restaurant status');
            }
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            T.logoutTitle,
            T.logoutMessage,
            [
                { text: TC.cancel, style: 'cancel' },
                {
                    text: TC.logout,
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem('adminToken');
                            await AsyncStorage.removeItem('adminData');
                            setToken(null);
                            router.replace('/signin');
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    },
                },
            ]
        );
    };

    // ── loading screen ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>{T.loading}</Text>
                </View>
            </View>
        );
    }

    // ── render ──────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>
            {/* ── Header ── */}
            <View style={[styles.header, rtlRow]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>{T.title}</Text>
                    <Text style={[styles.headerSubtitle, isRTL && styles.rtlText]}>{T.subtitle}</Text>
                </View>
            </View>

            <ScrollView style={styles.content}>

                {/* ── Restaurant Status ── */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{T.restaurantStatus}</Text>
                    <View style={styles.card}>
                        <View style={[styles.settingRow, rtlRow]}>
                            <View style={[styles.settingLeft, rtlRow]}>
                                <Ionicons
                                    name={settings?.is_open ? 'checkmark-circle' : 'close-circle'}
                                    size={24}
                                    color={settings?.is_open ? '#4CAF50' : '#F44336'}
                                />
                                <View style={[styles.settingText, rtlMargin(12)]}>
                                    <Text style={[styles.settingTitle, isRTL && styles.rtlText]}>
                                        {settings
                                            ? (settings.is_open ? T.openForBusiness : T.closedStatus)
                                            : TC.loading}
                                    </Text>
                                    <Text style={[styles.settingDescription, isRTL && styles.rtlText]}>
                                        {settings
                                            ? (settings.is_open ? T.customersCanOrder : T.customersCannotOrder)
                                            : T.loadingStatus}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={settings?.is_open || false}
                                onValueChange={toggleRestaurantStatus}
                                trackColor={{ false: '#E0E0E0', true: '#81C784' }}
                                thumbColor="#FFFFFF"
                                disabled={!settings}
                            />
                        </View>
                    </View>
                </View>

                {/* ── Operating Hours ── */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{T.operatingHours}</Text>

                    {openStatus && (
                        <View style={[styles.card, { marginBottom: 12 }]}>
                            <View style={[styles.currentStatusRow, rtlRow]}>
                                <View style={[
                                    styles.statusIndicator,
                                    { backgroundColor: openStatus.is_open ? '#4CAF50' : '#F44336' },
                                    isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12 },
                                ]} />
                                <View style={styles.statusTextContainer}>
                                    <Text style={[styles.currentStatusText, isRTL && styles.rtlText]}>
                                        {openStatus.is_open ? T.currentlyOpen : T.currentlyClosed}
                                    </Text>
                                    <Text style={[styles.currentTimeText, isRTL && styles.rtlText]}>
                                        {openStatus.current_day} • {openStatus.current_time}
                                    </Text>
                                    {!openStatus.is_open && openStatus.next_open && (
                                        <Text style={[styles.nextOpenText, isRTL && styles.rtlText]}>
                                            {T.opens} {openStatus.next_open.day_name} {T.at} {formatTime(openStatus.next_open.time)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={styles.card}>
                        {operatingHours.length === 0 ? (
                            <View style={styles.loadingHoursContainer}>
                                <ActivityIndicator size="small" color="#2196F3" />
                                <Text style={styles.loadingHoursText}>{T.loadingHours}</Text>
                            </View>
                        ) : (
                            operatingHours.map((hour, index) => (
                                <TouchableOpacity
                                    key={hour.day_of_week}
                                    style={[
                                        styles.hourRow,
                                        index < operatingHours.length - 1 && styles.hourRowBorder,
                                        rtlRow,
                                    ]}
                                    onPress={() => openEditModal(hour)}
                                >
                                    {/* Day name + today badge */}
                                    <View style={[styles.dayInfo, rtlRow]}>
                                        <Text style={[styles.dayName, hour.is_closed && styles.closedDay]}>
                                            {getDayName(hour.day_name)}
                                        </Text>
                                        {openStatus?.current_day === hour.day_name && (
                                            <View style={styles.todayBadge}>
                                                <Text style={styles.todayBadgeText}>{T.days.today}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Hours + chevron — chevron mirrors in RTL */}
                                    <View style={[styles.hoursInfo, rtlRow]}>
                                        {hour.is_closed ? (
                                            <Text style={styles.closedText}>{T.days.closed}</Text>
                                        ) : (
                                            <Text style={styles.hoursText}>
                                                {formatTime(hour.open_time)} - {formatTime(hour.close_time)}
                                            </Text>
                                        )}
                                        <Ionicons
                                            name={isRTL ? 'chevron-back' : 'chevron-forward'}
                                            size={20}
                                            color="#999"
                                        />
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                    <Text style={[styles.hoursNote, isRTL && styles.rtlText]}>{T.hoursNote}</Text>
                </View>

                {/* ── Restaurant Info ── */}
                {settings && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{T.restaurantInfo}</Text>
                        <View style={styles.card}>
                            {/* Name */}
                            <View style={[styles.infoRow, rtlRow]}>
                                <Ionicons name="restaurant-outline" size={20} color="#666" />
                                <View style={[styles.infoText, rtlMargin(12)]}>
                                    <Text style={[styles.infoLabel, isRTL && styles.rtlText]}>{T.name}</Text>
                                    <Text style={[styles.infoValue, isRTL && styles.rtlText]}>{settings.restaurant_name}</Text>
                                </View>
                            </View>
                            {/* Phone */}
                            <View style={[styles.infoRow, rtlRow]}>
                                <Ionicons name="call-outline" size={20} color="#666" />
                                <View style={[styles.infoText, rtlMargin(12)]}>
                                    <Text style={[styles.infoLabel, isRTL && styles.rtlText]}>{T.phone}</Text>
                                    <Text style={[styles.infoValue, isRTL && styles.rtlText]}>{settings.phone}</Text>
                                </View>
                            </View>
                            {/* Email */}
                            <View style={[styles.infoRow, rtlRow]}>
                                <Ionicons name="mail-outline" size={20} color="#666" />
                                <View style={[styles.infoText, rtlMargin(12)]}>
                                    <Text style={[styles.infoLabel, isRTL && styles.rtlText]}>{T.email}</Text>
                                    <Text style={[styles.infoValue, isRTL && styles.rtlText]}>{settings.restaurant_email}</Text>
                                </View>
                            </View>
                            {/* Delivery fee */}
                            {settings.delivery_fee !== undefined && (
                                <View style={[styles.infoRow, rtlRow]}>
                                    <Ionicons name="bicycle-outline" size={20} color="#666" />
                                    <View style={[styles.infoText, rtlMargin(12)]}>
                                        <Text style={[styles.infoLabel, isRTL && styles.rtlText]}>{T.deliveryFee}</Text>
                                        <Text style={[styles.infoValue, isRTL && styles.rtlText]}>
                                            {settings.delivery_fee.toFixed(2)} MAD
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* ── Account ── */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{T.account}</Text>
                    <View style={styles.card}>
                        <View style={[styles.infoRow, rtlRow]}>
                            <Ionicons name="person-outline" size={20} color="#666" />
                            <View style={[styles.infoText, rtlMargin(12)]}>
                                <Text style={[styles.infoLabel, isRTL && styles.rtlText]}>{T.adminEmail}</Text>
                                <Text style={[styles.infoValue, isRTL && styles.rtlText]}>{userEmail || 'N/A'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── Language Selector ── */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                        {language === 'ar' ? 'اللغة' : 'Language'}
                    </Text>
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => setShowLanguageModal(true)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.settingRow, rtlRow]}>
                            <View style={[styles.settingLeft, rtlRow]}>
                                <Ionicons name="language-outline" size={24} color="#2196F3" />
                                <View style={[styles.settingText, rtlMargin(12)]}>
                                    <Text style={[styles.settingTitle, isRTL && styles.rtlText]}>
                                        {language === 'ar' ? 'العربية 🇲🇦' : 'English 🇬🇧'}
                                    </Text>
                                    <Text style={[styles.settingDescription, isRTL && styles.rtlText]}>
                                        {language === 'ar' ? 'اضغط لتغيير اللغة' : 'Tap to change language'}
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#999" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* ── Logout ── */}
                <View style={styles.section}>
                    <TouchableOpacity style={[styles.logoutButton, rtlRow]} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="white" />
                        <Text style={styles.logoutButtonText}>{T.logoutButton}</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>{T.footerVersion}</Text>
                    <Text style={styles.footerSubtext}>{T.footerSubtext}</Text>
                </View>

            </ScrollView>

            {/* ════════════════════════════════════════════════════════════════
                Edit Operating Hours Modal
            ════════════════════════════════════════════════════════════════ */}
            <Modal
                visible={showHoursModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowHoursModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
                        {/* Modal header */}
                        <View style={[styles.modalHeader, rtlRow]}>
                            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                                {T.editHoursTitle} — {editingDay ? getDayName(editingDay.day_name) : ''}
                            </Text>
                            <TouchableOpacity onPress={() => setShowHoursModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            {/* Closed toggle */}
                            <View style={[styles.closedToggleRow, rtlRow]}>
                                <Text style={[styles.closedToggleLabel, isRTL && styles.rtlText]}>{T.closedThisDay}</Text>
                                <Switch
                                    value={editIsClosed}
                                    onValueChange={setEditIsClosed}
                                    trackColor={{ false: '#E0E0E0', true: '#FFCDD2' }}
                                    thumbColor={editIsClosed ? '#F44336' : '#FFFFFF'}
                                />
                            </View>

                            {!editIsClosed && (
                                <>
                                    {/* Opening time */}
                                    <View style={styles.timeInputGroup}>
                                        <Text style={[styles.timeLabel, isRTL && styles.rtlText]}>{T.openingTime}</Text>
                                        <View style={[styles.timeControlRow, rtlRow]}>
                                            <TouchableOpacity style={styles.timeButton} onPress={() => decrementTime('open')}>
                                                <Ionicons name="remove" size={20} color="#2196F3" />
                                            </TouchableOpacity>
                                            <View style={styles.timeDisplay}>
                                                <Text style={styles.timeDisplayText}>{editOpenTime || '09:00'}</Text>
                                            </View>
                                            <TouchableOpacity style={styles.timeButton} onPress={() => incrementTime('open')}>
                                                <Ionicons name="add" size={20} color="#2196F3" />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={[styles.timeHint, isRTL && styles.rtlText]}>{T.timeHint}</Text>
                                    </View>

                                    {/* Closing time */}
                                    <View style={styles.timeInputGroup}>
                                        <Text style={[styles.timeLabel, isRTL && styles.rtlText]}>{T.closingTime}</Text>
                                        <View style={[styles.timeControlRow, rtlRow]}>
                                            <TouchableOpacity style={styles.timeButton} onPress={() => decrementTime('close')}>
                                                <Ionicons name="remove" size={20} color="#2196F3" />
                                            </TouchableOpacity>
                                            <View style={styles.timeDisplay}>
                                                <Text style={styles.timeDisplayText}>{editCloseTime || '22:00'}</Text>
                                            </View>
                                            <TouchableOpacity style={styles.timeButton} onPress={() => incrementTime('close')}>
                                                <Ionicons name="add" size={20} color="#2196F3" />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={[styles.timeHint, isRTL && styles.rtlText]}>{T.timeHint}</Text>
                                    </View>

                                    {/* Quick presets */}
                                    <View style={styles.presetsSection}>
                                        <Text style={[styles.presetsLabel, isRTL && styles.rtlText]}>{T.quickPresets}</Text>
                                        <View style={[styles.presetsRow, rtlRow]}>
                                            <TouchableOpacity
                                                style={styles.presetButton}
                                                onPress={() => { setEditOpenTime('09:00'); setEditCloseTime('22:00'); }}
                                            >
                                                <Text style={styles.presetButtonText}>9AM - 10PM</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.presetButton}
                                                onPress={() => { setEditOpenTime('08:00'); setEditCloseTime('23:00'); }}
                                            >
                                                <Text style={styles.presetButtonText}>8AM - 11PM</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.presetButton}
                                                onPress={() => { setEditOpenTime('10:00'); setEditCloseTime('21:00'); }}
                                            >
                                                <Text style={styles.presetButtonText}>10AM - 9PM</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Modal footer — Cancel left / Save right in LTR, reversed in RTL */}
                        <View style={[styles.modalFooter, rtlRow]}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowHoursModal(false)}>
                                <Text style={styles.cancelButtonText}>{TC.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, savingHours && styles.saveButtonDisabled]}
                                onPress={saveOperatingHours}
                                disabled={savingHours}
                            >
                                {savingHours ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.saveButtonText}>{TC.save}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Language Selector Modal ── */}
            <Modal
                visible={showLanguageModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
                        <View style={[styles.modalHeader, rtlRow]}>
                            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                                {language === 'ar' ? 'اختر اللغة' : 'Select Language'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.modalBody, { gap: 10 }]}>
                            <TouchableOpacity
                                style={[styles.langBtn, language === 'en' && styles.langBtnActive, rtlRow]}
                                onPress={() => handleSelectLanguage('en')}
                                disabled={savingLanguage}
                            >
                                <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>
                                    🇬🇧  English
                                </Text>
                                {language === 'en' && <Ionicons name="checkmark" size={18} color="#2196F3" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.langBtn, language === 'ar' && styles.langBtnActive, rtlRow]}
                                onPress={() => handleSelectLanguage('ar')}
                                disabled={savingLanguage}
                            >
                                <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>
                                    🇲🇦  العربية
                                </Text>
                                {language === 'ar' && <Ionicons name="checkmark" size={18} color="#2196F3" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    header: {
        backgroundColor: 'white',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    content: {
        flex: 1,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        marginLeft: 12,
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    settingDescription: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoText: {
        marginLeft: 12,
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#F44336',
        padding: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    logoutButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        alignItems: 'center',
        padding: 24,
    },
    footerText: {
        fontSize: 14,
        color: '#999',
    },
    footerSubtext: {
        fontSize: 12,
        color: '#bbb',
        marginTop: 4,
    },
    currentStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    statusTextContainer: {
        flex: 1,
    },
    currentStatusText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    currentTimeText: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    nextOpenText: {
        fontSize: 13,
        color: '#4CAF50',
        marginTop: 4,
        fontWeight: '500',
    },
    hourRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
    },
    hourRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dayInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dayName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    closedDay: {
        color: '#999',
    },
    todayBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    todayBadgeText: {
        fontSize: 11,
        color: '#2196F3',
        fontWeight: '600',
    },
    hoursInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    hoursText: {
        fontSize: 14,
        color: '#666',
    },
    closedText: {
        fontSize: 14,
        color: '#F44336',
        fontWeight: '500',
    },
    hoursNote: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    loadingHoursContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 10,
    },
    loadingHoursText: {
        fontSize: 14,
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalBody: {
        padding: 20,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    closedToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    closedToggleLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#E65100',
    },
    timeInputGroup: {
        marginBottom: 20,
    },
    timeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    timeControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    timeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2196F3',
    },
    timeDisplay: {
        flex: 1,
        alignItems: 'center',
    },
    timeDisplayText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'monospace',
    },
    timeHint: {
        fontSize: 12,
        color: '#999',
    },
    presetsSection: {
        marginTop: 8,
    },
    presetsLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
    },
    presetsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    presetButton: {
        flex: 1,
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    presetButtonText: {
        fontSize: 12,
        color: '#2196F3',
        fontWeight: '600',
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    saveButton: {
        flex: 2,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#A5D6A7',
    },
    saveButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
    },

    // ── RTL text alignment ─────────────────────────────────────────────────
    rtlText: {
        textAlign: 'right',
    },

    langBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
    },
    langBtnActive: {
        borderColor: '#2196F3',
        backgroundColor: '#E3F2FD',
    },
    langBtnText: {
        fontSize: 15,
        color: '#555',
        fontWeight: '500',
    },
    langBtnTextActive: {
        color: '#2196F3',
        fontWeight: '700',
    },
});