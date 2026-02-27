import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert,
  StatusBar 
} from 'react-native';
import { useRouter, Slot } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAdminWebSocket } from '../../hooks/useAdminWebSocket';
import { AdminNotificationsPanel } from './AdminNotificationsPanel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('orders');
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Use the admin WebSocket hook
  const {
    unreadCount,
    allNotifications, // Use allNotifications instead of liveNotifications
    isConnected,
    isSoundEnabled,
    fetchAllNotifications,
    fetchUnreadCount,
    soundPlaying,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    toggleSound,
    stopSound,
    pendingOrderIds,
    clearAllNotifications, // Updated function name
  } = useAdminWebSocket();


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
              // Clear WebSocket connection
              stopSound();
              
              // Remove storage items
              await AsyncStorage.removeItem('adminToken');
              await AsyncStorage.removeItem('adminData');
              
              router.replace('/signin');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
    router.push(`/admin/${tab}` as any);
  };

  const handleNotificationPress = (notificationId: number) => {
    markNotificationAsRead(notificationId);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
            ]} />
            <Text style={styles.connectionText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {/* Sound Toggle */}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={toggleSound}
          >
            <Ionicons 
              name={isSoundEnabled ? "volume-high" : "volume-mute"} 
              size={24} 
              color={isSoundEnabled ? "#2196F3" : "#666"} 
            />
            {pendingOrderIds.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  {pendingOrderIds.length}
                </Text>
              </View>
            )}
            {soundPlaying && (
              <View style={styles.soundPlayingIndicator} />
            )}
          </TouchableOpacity>
          
          {/* Notifications Bell */}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setNotificationsVisible(true)}
          >
            <Ionicons 
              name="notifications-outline" 
              size={24} 
              color="#333" 
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Slot />
      </View>
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'orders' && styles.navItemActive]}
          onPress={() => navigateToTab('orders')}
        >
          <Ionicons
            name="receipt-outline"
            size={24}
            color={activeTab === 'orders' ? '#2196F3' : '#666'}
          />
          <Text style={[styles.navText, activeTab === 'orders' && styles.navTextActive]}>
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'products' && styles.navItemActive]}
          onPress={() => navigateToTab('products')}
        >
          <Ionicons
            name="fast-food-outline"
            size={24}
            color={activeTab === 'products' ? '#2196F3' : '#666'}
          />
          <Text style={[styles.navText, activeTab === 'products' && styles.navTextActive]}>
            Products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'settings' && styles.navItemActive]}
          onPress={() => navigateToTab('settings')}
        >
          <Ionicons
            name="settings-outline"
            size={24}
            color={activeTab === 'settings' ? '#2196F3' : '#666'}
          />
          <Text style={[styles.navText, activeTab === 'settings' && styles.navTextActive]}>
            Settings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
          <Text style={[styles.navText, { color: '#F44336' }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Panel */}
      <AdminNotificationsPanel
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        unreadCount={unreadCount}
        onMarkAsRead={handleNotificationPress}
        fetchUnreadCount={fetchUnreadCount}
        fetchAllNotifications={fetchAllNotifications} // This was missing!
        onMarkAllAsRead={markAllNotificationsAsRead}
        onClearAll={clearAllNotifications}
        allNotifications={allNotifications}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
    padding: 8,
    position: 'relative',
  },
  soundPlayingIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingBottom: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  navTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  pendingBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  pendingBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
});