import React, { useState, useEffect } from 'react'; // Added useEffect
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AdminNotificationsPanelProps {
  visible: boolean;
  onClose: () => void;
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  fetchAllNotifications: () => void; // Add this explicitly
  fetchUnreadCount: () => void;
  allNotifications: Array<{
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    type?: string;
  }>
}

const { width } = Dimensions.get('window');

export const AdminNotificationsPanel: React.FC<AdminNotificationsPanelProps> = ({
  visible,
  onClose,
  allNotifications = [],
  unreadCount,
  onMarkAsRead,
  fetchAllNotifications,
  fetchUnreadCount,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const [slideAnim] = useState(new Animated.Value(width));
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);
  const [localNotifications, setLocalNotifications] = useState(allNotifications);

  // Update local state when props change
  useEffect(() => {
  setLocalUnreadCount(unreadCount);
  setLocalNotifications(allNotifications);
  
  // Only fetch when panel becomes visible
  if (visible) {
    if (fetchAllNotifications && typeof fetchAllNotifications === 'function') {
      fetchAllNotifications();
      
    } else {
      console.log('❌ fetchAllNotifications is not a function or undefined');
    }
  }
}, [visible, unreadCount, fetchAllNotifications]);
  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            onClearAll();
            onClose();
          },
        },
      ]
    );
  };

  const handleMarkAllAsRead = () => {
    onMarkAllAsRead();
    setLocalUnreadCount(0);
    // Update all notifications to read status locally
    setLocalNotifications(prev => 
      prev.map(notif => ({ ...notif, is_read: true }))
    );
    Alert.alert('Success', 'All notifications marked as read');
  };

  const handleMarkAsRead = (notificationId: number) => {
    // Call the parent function
    onMarkAsRead(notificationId);
    
    // Update local state immediately for responsive UI
    setLocalUnreadCount(prev => Math.max(0, prev - 1));
    
    // Update the specific notification locally
    setLocalNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true }
          : notif
      )
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      
      // Format without date-fns
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // Convert 0 to 12
      
      return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <Animated.View 
          style={[
            styles.panel,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{localUnreadCount}</Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{localNotifications.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.actionButtons}>
              {localUnreadCount > 0 && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleMarkAllAsRead}
                >
                  <Ionicons name="checkmark-done" size={16} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              {localNotifications.length > 0 && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.clearButton]}
                  onPress={handleClearAll}
                >
                  <Ionicons name="trash-outline" size={16} color="#F44336" />
                  <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                    Clear all
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Notifications List */}
          <ScrollView style={styles.notificationsList}>
            {localNotifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No notifications yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  New orders and alerts will appear here
                </Text>
              </View>
            ) : (
              allNotifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.is_read && styles.unreadNotification,
                  ]}
                  onPress={() => handleMarkAsRead(notification.id)}
                >
                  <View style={styles.notificationIcon}>
                    <Ionicons
                      name={
                        notification.type === 'new_order' 
                          ? 'receipt-outline'
                          : notification.type === 'alert'
                          ? 'warning-outline'
                          : 'notifications-outline'
                      }
                      size={20}
                      color={
                        notification.type === 'new_order' 
                          ? '#4CAF50'
                          : notification.type === 'alert'
                          ? '#FF9800'
                          : '#2196F3'
                      }
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatDate(notification.created_at)}
                    </Text>
                  </View>
                  {!notification.is_read && (
                    <View style={styles.unreadIndicator} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: width * 0.85,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  statsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
    marginRight: 8,
  },
  actionButtonText: {
    marginLeft: 4,
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: '#ffebee',
  },
  clearButtonText: {
    color: '#F44336',
  },
  notificationsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: {
    backgroundColor: '#f8fdff',
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginLeft: 8,
    marginTop: 8,
  },
});