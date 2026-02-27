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

const API_URL = 'https://haba-haba-api.ubua.cloud/api/admin';

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

export default function AdminSettings() {
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
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

    const loadAdminData = async () => {
        try {
            // Get token and admin data separately (as you're storing them)
            const token = await AsyncStorage.getItem('adminToken');
            const adminDataString = await AsyncStorage.getItem('adminData');

            if (token) {
                setToken(token);

                if (adminDataString) {
                    try {
                        const adminData = JSON.parse(adminDataString);
                        // Get email from the correct location
                        setUserEmail(adminData.email || 'admin@restaurant.com');
                    } catch (parseError) {
                        console.error('Error parsing admin data:', parseError);
                        setUserEmail('admin@restaurant.com');
                    }
                } else {
                    console.log('⚠️ No admin data found');
                    setUserEmail('admin@restaurant.com');
                }
            } else {
                console.log('❌ No admin token found');
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
            console.log('✅ Fetched restaurant settings', response.data.settings);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchOperatingHours = async () => {
        try {
            console.log('📅 Fetching operating hours...');
            const response = await axios.get(`${API_URL}/operating-hours`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('📅 Operating hours response:', response.data);
            if (response.data.success) {
                setOperatingHours(response.data.operatingHours);
                console.log('✅ Fetched operating hours', response.data.operatingHours);
            }
        } catch (error: any) {
            console.error('❌ Error fetching operating hours:', error?.response?.data || error.message);
            Alert.alert('Error', 'Failed to load operating hours. Please restart the backend server.');
        }
    };

    const fetchOpenStatus = async () => {
        try {
            console.log('🕐 Fetching open status...');
            const response = await axios.get(`${API_URL}/open-status`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('🕐 Open status response:', response.data);
            if (response.data.success) {
                setOpenStatus(response.data);
                console.log('✅ Fetched open status', response.data);
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
        let newMinutes = minutes;
        
        // Increment by 30 minutes
        newMinutes += 30;
        if (newMinutes >= 60) {
            newMinutes -= 60;
            newHours += 1;
        }
        
        // Handle day overflow
        if (newHours >= 24) {
            newHours = 0;
        }
        
        const newTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        if (timeType === 'open') {
            setEditOpenTime(newTime);
        } else {
            setEditCloseTime(newTime);
        }
    };
    
    const decrementTime = (timeType: 'open' | 'close') => {
        const currentTime = timeType === 'open' ? editOpenTime : editCloseTime;
        const [hours, minutes] = currentTime.split(':').map(Number);
        
        let newHours = hours;
        let newMinutes = minutes;
        
        // Decrement by 30 minutes
        newMinutes -= 30;
        if (newMinutes < 0) {
            newMinutes += 60;
            newHours -= 1;
        }
        
        // Handle day underflow
        if (newHours < 0) {
            newHours = 23;
        }
        
        const newTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        if (timeType === 'open') {
            setEditOpenTime(newTime);
        } else {
            setEditCloseTime(newTime);
        }
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

            Alert.alert('Success', `${editingDay.day_name} hours updated successfully`);
            setShowHoursModal(false);
            fetchOperatingHours();
            fetchOpenStatus();
            fetchSettings(); // Refresh is_open status
        } catch (error) {
            console.error('Error saving operating hours:', error);
            Alert.alert('Error', 'Failed to save operating hours');
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
            Alert.alert('Error', 'Please wait for settings to load');
            return;
        }

        try {
            const newStatus = !settings.is_open;
            const response = await axios.put(
                `${API_URL}/restaurant-settings`,
                { is_open: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state with response data
            setSettings((prev: RestaurantSettings | null) => prev ? { ...prev, is_open: newStatus } : null);

            Alert.alert(
                'Success',
                `Restaurant is now ${newStatus ? 'OPEN' : 'CLOSED'} for business`
            );
        } catch (error: any) {
            console.error('Error toggling restaurant status:', error);

            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again');
                await AsyncStorage.removeItem('adminToken');
            } else {
                Alert.alert('Error', error.response?.data?.message || 'Failed to update restaurant status');
            }
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Remove both storage items
                            await AsyncStorage.removeItem('adminToken');
                            await AsyncStorage.removeItem('adminData');
                            setToken(null);
                            // Navigate to signin
                            router.replace('/signin');
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading settings...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
                <Text style={styles.headerSubtitle}>Restaurant configuration</Text>
            </View>

            <ScrollView style={styles.content}>
                {/* Restaurant Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Restaurant Status</Text>
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Ionicons
                                    name={settings?.is_open ? 'checkmark-circle' : 'close-circle'}
                                    size={24}
                                    color={settings?.is_open ? '#4CAF50' : '#F44336'}
                                />
                                <View style={styles.settingText}>
                                    <Text style={styles.settingTitle}>
                                        {settings ? (settings.is_open ? 'Open for Business' : 'Closed') : 'Loading...'}
                                    </Text>
                                    <Text style={styles.settingDescription}>
                                        {settings ?
                                            (settings.is_open ? 'Customers can place orders' : 'Customers cannot place orders')
                                            : 'Loading restaurant status...'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={settings?.is_open || false}
                                onValueChange={toggleRestaurantStatus}
                                trackColor={{ false: '#E0E0E0', true: '#81C784' }}
                                thumbColor="#FFFFFF"
                                disabled={!settings} // Disable until settings load
                            />
                        </View>
                    </View>
                </View>

                {/* Operating Hours */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Operating Hours</Text>
                    {openStatus && (
                        <View style={[styles.card, { marginBottom: 12 }]}>
                            <View style={styles.currentStatusRow}>
                                <View style={[styles.statusIndicator, { backgroundColor: openStatus.is_open ? '#4CAF50' : '#F44336' }]} />
                                <View style={styles.statusTextContainer}>
                                    <Text style={styles.currentStatusText}>
                                        Currently {openStatus.is_open ? 'OPEN' : 'CLOSED'}
                                    </Text>
                                    <Text style={styles.currentTimeText}>
                                        {openStatus.current_day} • {openStatus.current_time}
                                    </Text>
                                    {!openStatus.is_open && openStatus.next_open && (
                                        <Text style={styles.nextOpenText}>
                                            Opens {openStatus.next_open.day_name} at {formatTime(openStatus.next_open.time)}
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
                                <Text style={styles.loadingHoursText}>Loading operating hours...</Text>
                            </View>
                        ) : (
                            operatingHours.map((hour, index) => (
                                <TouchableOpacity
                                    key={hour.day_of_week}
                                    style={[
                                        styles.hourRow,
                                        index < operatingHours.length - 1 && styles.hourRowBorder
                                    ]}
                                    onPress={() => openEditModal(hour)}
                                >
                                    <View style={styles.dayInfo}>
                                        <Text style={[styles.dayName, hour.is_closed && styles.closedDay]}>
                                            {hour.day_name}
                                        </Text>
                                        {openStatus?.current_day === hour.day_name && (
                                            <View style={styles.todayBadge}>
                                                <Text style={styles.todayBadgeText}>Today</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.hoursInfo}>
                                        {hour.is_closed ? (
                                            <Text style={styles.closedText}>Closed</Text>
                                        ) : (
                                            <Text style={styles.hoursText}>
                                                {formatTime(hour.open_time)} - {formatTime(hour.close_time)}
                                            </Text>
                                        )}
                                        <Ionicons name="chevron-forward" size={20} color="#999" />
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                    <Text style={styles.hoursNote}>
                        Restaurant status updates automatically based on these hours
                    </Text>
                </View>

                {/* Restaurant Info */}
                {settings && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Restaurant Information</Text>
                        <View style={styles.card}>
                            <View style={styles.infoRow}>
                                <Ionicons name="restaurant-outline" size={20} color="#666" />
                                <View style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Name</Text>
                                    <Text style={styles.infoValue}>{settings.restaurant_name}</Text>
                                </View>
                            </View>

                            <View style={styles.infoRow}>
                                <Ionicons name="call-outline" size={20} color="#666" />
                                <View style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Phone</Text>
                                    <Text style={styles.infoValue}>{settings.phone}</Text>
                                </View>
                            </View>

                            <View style={styles.infoRow}>
                                <Ionicons name="mail-outline" size={20} color="#666" />
                                <View style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Email</Text>
                                    <Text style={styles.infoValue}>{settings.restaurant_email}</Text>
                                </View>
                            </View>

                            {settings.delivery_fee !== undefined && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="bicycle-outline" size={20} color="#666" />
                                    <View style={styles.infoText}>
                                        <Text style={styles.infoLabel}>Delivery Fee</Text>
                                        <Text style={styles.infoValue}>
                                            {settings.delivery_fee.toFixed(2)} MAD
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Account Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Ionicons name="person-outline" size={20} color="#666" />
                            <View style={styles.infoText}>
                                <Text style={styles.infoLabel}>Admin Email</Text>
                                <Text style={styles.infoValue}>{userEmail || 'N/A'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="white" />
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Admin Dashboard v1.0</Text>
                    <Text style={styles.footerSubtext}>Restaurant Management System</Text>
                </View>
            </ScrollView>

            {/* Edit Operating Hours Modal */}
            <Modal
                visible={showHoursModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowHoursModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Edit {editingDay?.day_name} Hours
                            </Text>
                            <TouchableOpacity onPress={() => setShowHoursModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            {/* Closed Toggle */}
                            <View style={styles.closedToggleRow}>
                                <Text style={styles.closedToggleLabel}>Closed this day</Text>
                                <Switch
                                    value={editIsClosed}
                                    onValueChange={setEditIsClosed}
                                    trackColor={{ false: '#E0E0E0', true: '#FFCDD2' }}
                                    thumbColor={editIsClosed ? '#F44336' : '#FFFFFF'}
                                />
                            </View>

                            {!editIsClosed && (
                                <>
                                    {/* Open Time */}
                                    <View style={styles.timeInputGroup}>
                                        <Text style={styles.timeLabel}>Opening Time</Text>
                                        <View style={styles.timeControlRow}>
                                            <TouchableOpacity
                                                style={styles.timeButton}
                                                onPress={() => decrementTime('open')}
                                            >
                                                <Ionicons name="remove" size={20} color="#2196F3" />
                                            </TouchableOpacity>
                                            <View style={styles.timeDisplay}>
                                                <Text style={styles.timeDisplayText}>{editOpenTime || '09:00'}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.timeButton}
                                                onPress={() => incrementTime('open')}
                                            >
                                                <Ionicons name="add" size={20} color="#2196F3" />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.timeHint}>Tap + or - to adjust by 30 minutes</Text>
                                    </View>

                                    {/* Close Time */}
                                    <View style={styles.timeInputGroup}>
                                        <Text style={styles.timeLabel}>Closing Time</Text>
                                        <View style={styles.timeControlRow}>
                                            <TouchableOpacity
                                                style={styles.timeButton}
                                                onPress={() => decrementTime('close')}
                                            >
                                                <Ionicons name="remove" size={20} color="#2196F3" />
                                            </TouchableOpacity>
                                            <View style={styles.timeDisplay}>
                                                <Text style={styles.timeDisplayText}>{editCloseTime || '22:00'}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.timeButton}
                                                onPress={() => incrementTime('close')}
                                            >
                                                <Ionicons name="add" size={20} color="#2196F3" />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.timeHint}>Tap + or - to adjust by 30 minutes</Text>
                                    </View>

                                    {/* Quick Time Presets */}
                                    <View style={styles.presetsSection}>
                                        <Text style={styles.presetsLabel}>Quick Presets:</Text>
                                        <View style={styles.presetsRow}>
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

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowHoursModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, savingHours && styles.saveButtonDisabled]}
                                onPress={saveOperatingHours}
                                disabled={savingHours}
                            >
                                {savingHours ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

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
    // Operating Hours Styles
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
    // Modal Styles
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
});
