import { useEffect, useState, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  Audio,
  InterruptionModeAndroid, // Import directly
  InterruptionModeIOS      // Import directly
} from 'expo-av';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

// --- Types ---
interface AdminWebSocketNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: {
    order_id?: number;
    order_number?: string;
    order_status?: string;
    notification_type?: string;
    sound_required?: boolean;
    repeat_until_status?: string;
    [key: string]: any;
  };
  type?: 'new_order' | 'general' | 'alert';
}

interface AdminOrderNotification {
  id: number;
  order_number: string;
  status: string;
  customer_name?: string;
  total_amount?: number;
  delivery_address?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  created_at: string;
}

// --- Constants ---
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const API_BASE_URL = 'https://haba-haba-api.ubua.cloud';
const WS_URL = 'wss://haba-haba-api.ubua.cloud';

// Sound configuration
const NEW_ORDER_SOUND = require('../assets/sounds/newOrderAlert.mp3');
const SOUND_CHECK_INTERVAL = 30000; // Check every 30 seconds if sound should still play

type SoundObjectRef = React.MutableRefObject<Audio.Sound | null>;

export const useAdminWebSocket = () => {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [allNotifications, setAllNotifications] = useState<AdminWebSocketNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [pendingOrderIds, setPendingOrderIds] = useState<number[]>([]);
  const soundObjectRef: SoundObjectRef = useRef<Audio.Sound | null>(null);

  // --- Refs for state and connection management ---
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const isConnectingRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusCheckIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOrdersRef = useRef<Set<number>>(new Set());

  /**
   * Calculates the exponential backoff delay time.
   */
  const getReconnectDelay = useCallback((attempt: number): number => {
    return Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(2, attempt),
      MAX_RECONNECT_DELAY_MS
    );
  }, []);

  useEffect(() => {
    let sound: Audio.Sound | null = null;

    const loadSound = async () => {
      try {
        // ⭐ CORRECTED AUDIO MODE SETUP ⭐
        await Audio.setAudioModeAsync({
          // Using the correct, direct property names
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix, // FIX IS HERE
          shouldDuckAndroid: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,       // FIX IS HERE
        });

        // Create and load the sound object
        const { sound: newSound } = await Audio.Sound.createAsync(
          // Use the correct constant if you have one, or the path directly
          require('../assets/sounds/newOrderAlert.mp3'),
          { shouldPlay: false, isLooping: true }
        );

        sound = newSound;
        soundObjectRef.current = newSound;

        console.log('🔊 Audio file loaded and set to loop.');

      } catch (e) {
        console.error('Failed to load sound:', e);
      }
    };

    loadSound();

    // 3. Clean up function
    return () => {
      if (soundObjectRef.current) {
        console.log('🔇 Unloading audio object on cleanup.');
        soundObjectRef.current.unloadAsync();
        soundObjectRef.current = null;
      }
    };
  }, []); // Run only once on mount
  /**
   * Load and play the new order sound
   */
  // in useAdminWebSocket.ts
  const playNewOrderSound = useCallback(async () => {
    const sound = soundObjectRef.current;

    if (!isSoundEnabled || !sound || pendingOrdersRef.current.size === 0) {
      return;
    }

    try {
      const status = await sound.getStatusAsync();

      if (status.isLoaded) {
        // If sound is already playing, the listener will handle the loop. Just ensure state is set.
        if (status.isPlaying) {
          setSoundPlaying(true);
          return;
        }

        // Start the sound from the beginning to initiate the loop cycle
        await sound.replayAsync();
        console.log('🔊 Sound manually started.');

        setSoundPlaying(true);
      }

    } catch (e) {
      console.error('Error starting sound for manual loop:', e);
    }
  }, [isSoundEnabled]); // Dependency is minimal

  /**
   * Stop the currently playing sound (stops the manual loop)
   */
  // in useAdminWebSocket.ts

  const stopSound = useCallback(async () => {
    const sound = soundObjectRef.current;

    // Check if the JS state indicates sound is active AND the sound object exists
    if (soundPlaying && sound) {
      try {
        const status = await sound.getStatusAsync();

        // Type Guard: Check if status is a success object AND is loaded
        if (status.isLoaded) {
          // Now we can safely access isPlaying
          if (status.isPlaying) {
            await sound.stopAsync();
            await sound.setStatusAsync({ positionMillis: 0 });
            console.log('🔇 Sound successfully stopped and reset.');
          }
        } else {
          // Handle case where status is not loaded (e.g., AVPlaybackStatusError)
          console.warn('Sound object is not loaded or in an error state. Skipping stop/reset.');
        }

      } catch (e) {
        // Catch errors if the sound object is already invalid/unloaded by the OS
        console.warn('Error interacting with sound object (may be already invalid):', e);
      }
    }

    // Always ensure the JS state is updated to false if it was true
    if (soundPlaying) {
      setSoundPlaying(false);
    }
  }, [soundPlaying]);

  /**
   * Check order statuses and manage sound
   */
  const checkOrderStatuses = useCallback(async () => {
    const hasPendingOrders = pendingOrdersRef.current.size > 0;

    // 1. Exit if nothing to check, and stop sound if it was erroneously left playing
    if (!hasPendingOrders) {
      if (soundPlaying) {
        stopSound();
      }
      return;
    }

    try {
      // --- API CALL LOGIC (Remains the same) ---
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) return;

      const orderIds = Array.from(pendingOrdersRef.current);

      const response = await fetch(`${API_BASE_URL}/api/admin/orders/status-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_ids: orderIds })
      });

      if (response.ok) {
        const data = await response.json();
        const nowResolved = new Set<number>();

        data.orders?.forEach((order: any) => {
          if (pendingOrdersRef.current.has(order.id)) {
            const status = order.status.toLowerCase();
            // If the status is NOT pending, it means the admin/system has processed it
            if (status !== 'pending' && status !== 'new') {
              nowResolved.add(order.id);
            }
          }
        });

        // 2. Remove resolved orders from the pending (ringing) set
        nowResolved.forEach(id => pendingOrdersRef.current.delete(id));

        // 3. Update local state
        const remainingOrders = Array.from(pendingOrdersRef.current);
        setPendingOrderIds(remainingOrders);

        // 4. Evaluate Sound Status based on remaining orders
        if (remainingOrders.length === 0) {
          // All orders resolved: Stop the sound
          stopSound();
          console.log('✅ All monitored orders processed. Sound stopped.');
          return;
        }

        // --- CRITICAL RESTART LOGIC ---
        const sound = soundObjectRef.current;
        if (sound && isSoundEnabled) {
          try {
            const status = await sound.getStatusAsync();

            // Type Guard: Check if status is a success object AND is loaded
            if (status.isLoaded) {
              // If the sound is loaded, but is NOT playing, we force a restart.
              if (!status.isPlaying) {
                console.log('🔄 Pending orders remain, but sound is NOT playing. Re-triggering sound loop.');
                playNewOrderSound(); // This will call sound.replayAsync()
              } else {
                // If it is playing, just ensure the JS state reflects it.
                setSoundPlaying(true);
              }
            } else {
              // Status is not loaded (e.g., error). Try to restart the sound just in case.
              console.warn('Sound status is not loaded, attempting to restart sound anyway.');
              playNewOrderSound();
            }
          } catch (e) {
            console.error('Error getting sound status during check:', e);
          }
        }

      } else {
        console.error('API failed to check order statuses:', response.status);
      }
    } catch (error) {
      console.error('Error checking order statuses:', error);
    }
  }, [soundPlaying, isSoundEnabled, playNewOrderSound, stopSound]);

  /**
   * Toggle sound on/off
   */
  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
    if (!isSoundEnabled) {
      stopSound();
    } else if (pendingOrdersRef.current.size > 0) {
      // If enabling sound and there are pending orders, play sound
      playNewOrderSound();
    }
  }, [isSoundEnabled, pendingOrdersRef.current.size, stopSound, playNewOrderSound]);

  /**
   * Fetch ALL notifications (not just unread)
   */
  const fetchAllNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        console.log('❌ No admin token found');
        return;
      }

      // Get admin data to extract the ID
      const adminDataString = await AsyncStorage.getItem('adminData');
      if (!adminDataString) {
        console.log('❌ No admin data found');
        return;
      }

      const adminData = JSON.parse(adminDataString);
      const adminId = adminData.id;

      if (!adminId) {
        console.log('❌ No admin ID found in admin data');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/notifications/admin/recent`, {
        method: 'POST', // or 'GET' depending on your API
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminId: adminId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.notifications) {
          // Calculate unread count
          const unread = data.notifications.filter((n: AdminWebSocketNotification) => !n.is_read).length;
          setUnreadCount(unread);
          // Set all notifications
          setAllNotifications(data.notifications);

        }
      } else {
        console.error('❌ Failed to fetch all notifications:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching all notifications:', error);
    }
  }, []);

  /**
   * Fetch unread notification count (for real-time updates)
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        console.log('❌ No admin token found');
        return;
      }

      // Get admin data to extract the ID
      const adminDataString = await AsyncStorage.getItem('adminData');
      if (!adminDataString) {
        console.log('❌ No admin data found');
        return;
      }

      const adminData = JSON.parse(adminDataString);
      const adminId = adminData.id;

      if (!adminId) {
        console.log('❌ No admin ID found in admin data');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/notifications/admin/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }, body: JSON.stringify({ adminId: adminId })
      });

      if (response.ok) {
        const data = await response.json();
        const newUnreadCount = data.count || 0;
        setUnreadCount(newUnreadCount);
        console.log('📊 Updated unread count:', newUnreadCount);
      } else {
        console.error('❌ Failed to fetch admin unread count:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching admin unread count:', error);
    }
  }, []);

  /**
   * Initiate WebSocket connection
   */
  const connectWebSocket = useCallback(async () => {
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
      console.log('⚠️ Connection already open or in progress');
      return;
    }

    isConnectingRef.current = true;

    try {
      const token = await AsyncStorage.getItem('adminToken');
      const adminData = await AsyncStorage.getItem('adminData');

      if (!token || !adminData) {
        console.log('❌ No admin token or data found');
        isConnectingRef.current = false;
        return;
      }

      const admin = JSON.parse(adminData);
      const userId = admin.id.toString();
      const userType = 'admin';

      // Cleanup old connection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        // Use clean close (1000) to ensure the previous onclose handler 
        // does NOT trigger another backoff loop.
        wsRef.current.close(1000, 'Client initiating fresh connection');
        wsRef.current = null;
      }

      console.log(`🔌 Admin connecting to WebSocket as ${userType} ${userId}...`);

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Admin WebSocket connected');
        setIsConnected(true);
        retryCountRef.current = 0;
        isConnectingRef.current = false;

        // Send subscription message
        ws.send(JSON.stringify({
          type: 'subscribe',
          userId: userId,
          userType: userType,
          token: token
        }));

        // Fetch initial data when connected
        fetchAllNotifications();
        fetchUnreadCount();
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data.type);

          // Handle new notification
          if (data.type === 'new_notification') {
            const notification: AdminWebSocketNotification = {
              id: data.data.id,
              title: data.data.title,
              message: data.data.message,
              is_read: data.data.is_read || false,
              created_at: data.data.created_at || new Date().toISOString(),
              data: data.data.data || {},
              type: data.data.type || 'general'
            };

            // 1. Update unread count immediately
            if (!notification.is_read) {
              setUnreadCount(prev => prev + 1);
            }

            // ⭐ LOGIC TO START LOOPING SOUND FOR NEW ORDERS ⭐
            if (notification.type === 'new_order' && notification.data?.order_id) {
              const orderId = notification.data.order_id;

              // Only process if this specific order ID hasn't been added yet
              if (!pendingOrdersRef.current.has(orderId)) {
                // Add the new order ID to the pending set
                pendingOrdersRef.current.add(orderId);
                setPendingOrderIds(Array.from(pendingOrdersRef.current));

                console.log(`🔔 New order ${orderId} received. Pending count: ${pendingOrdersRef.current.size}`);

                // Trigger haptics feedback
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                playNewOrderSound();
              }
            }
          }

          // Handle notification read from server (for real-time sync)
          else if (data.type === 'notification_read_update') {
            const { notificationId } = data;

            // Update the notification in the list
            setAllNotifications(prev =>
              prev.map(notif =>
                notif.id === notificationId
                  ? { ...notif, is_read: true }
                  : notif
              )
            );

            // Decrease unread count
            setUnreadCount(prev => Math.max(0, prev - 1));
          }

          // Handle unread count update from server
          else if (data.type === 'unread_count_update') {
            setUnreadCount(data.count);
          }

          // ... rest of your handlers
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Admin WebSocket error:', error);
        setIsConnected(false);
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        console.log(`🔌 Admin WebSocket disconnected: ${event.code} ${event.reason || 'No reason'}`);
        setIsConnected(false);
        isConnectingRef.current = false;

        // Reconnection logic
        if (event.code !== 1000 && retryCountRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = getReconnectDelay(retryCountRef.current);
          retryCountRef.current += 1;

          console.log(`🔄 Admin reconnecting in ${delay / 1000}s. Attempt #${retryCountRef.current}...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (event.code !== 1000) {
          console.error('❌ Max reconnection attempts reached for admin');
          retryCountRef.current = 0;
        }
      };

    } catch (error) {
      console.error('❌ Fatal error during admin WebSocket setup:', error);
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  }, [getReconnectDelay, fetchAllNotifications, fetchUnreadCount]);

  /**
   * Mark notification as read
   */
  const markNotificationAsRead = useCallback(async (notificationId: number) => {
    try {
      // Update local state immediately for responsive UI
      setAllNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, is_read: true }
            : notif
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Send to server
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) return;

      // Send via WebSocket for real-time updates
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'mark_notification_read',
          notificationId: notificationId
        }));
      }

      // Get admin data to extract the ID
      const adminDataString = await AsyncStorage.getItem('adminData');
      if (!adminDataString) {
        console.log('❌ No admin data found');
        return;
      }

      const adminData = JSON.parse(adminDataString);
      const adminId = adminData.id;

      if (!adminId) {
        console.log('❌ No admin ID found in admin data');
        return;
      }

      // Also send via API
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminId: adminId })
      });

    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      // Update local state
      setAllNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      setUnreadCount(0);

      // Send to server
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) return;

      // Get admin data to extract the ID
      const adminDataString = await AsyncStorage.getItem('adminData');
      if (!adminDataString) {
        console.log('❌ No admin data found');
        return;
      }

      const adminData = JSON.parse(adminDataString);
      const adminId = adminData.id;

      if (!adminId) {
        console.log('❌ No admin ID found in admin data');
        return;
      }

      await fetch(`${API_BASE_URL}/api/notifications/admin/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminId: adminId })
      });

      // Also notify WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'mark_all_notifications_read'
        }));
      }

      console.log('✅ Marked all notifications as read');

    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  }, []);

  /**
   * Clear all notifications from UI (not from server)
   */
  const clearAllNotifications = useCallback(async () => {
    try {
      // Clear from UI
      setAllNotifications([]);
      setUnreadCount(0);

      // Optional: Also delete from server
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) return;
      // Get admin data to extract the ID
      const adminDataString = await AsyncStorage.getItem('adminData');
      if (!adminDataString) {
        console.log('❌ No admin data found');
        return;
      }

      const adminData = JSON.parse(adminDataString);
      const adminId = adminData.id;

      if (!adminId) {
        console.log('❌ No admin ID found in admin data');
        return;
      }
      await fetch(`${API_BASE_URL}/api/notifications/admin/clear-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminId: adminId })
      });

      console.log('✅ Cleared all notifications');

    } catch (error) {
      console.error('❌ Error clearing all notifications:', error);
    }
  }, []);

  // --- Main Effect Hook ---
  useEffect(() => {
    // Initialize audio mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(error => {
      console.error('Error setting audio mode:', error);
    });

    // Connect WebSocket
    connectWebSocket();

    // Set up periodic status check
    statusCheckIntervalRef.current = setInterval(() => {
      checkOrderStatuses();
    }, SOUND_CHECK_INTERVAL);

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Admin component unmounting');
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
      }
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
      }
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      retryCountRef.current = 0;
    };
  }, [connectWebSocket, checkOrderStatuses]);

  useEffect(() => {

    // --- Load Sound Function ---
    const loadSound = async () => {
      try {
        // ⭐ CORRECTED AUDIO MODE SETUP (Uses both platform modes) ⭐
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: true, // Crucial for background operation
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,

          // Use imported enums based on platform
          ...(Platform.OS === 'ios' && {
            interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          }),
          ...(Platform.OS === 'android' && {
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          }),
        });

        // Create and load the sound object
        const { sound: newSound } = await Audio.Sound.createAsync(
          NEW_ORDER_SOUND,
          { shouldPlay: false, isLooping: false } // isLooping is FALSE for manual control
        );

        soundObjectRef.current = newSound;

        // ⭐ CRITICAL MANUAL LOOPING LISTENER ⭐
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            // Check if orders are still pending to decide if we restart
            if (pendingOrdersRef.current.size > 0 && isSoundEnabled) {
              newSound.replayAsync().catch(e => console.error('Failed to manually replay:', e));
            } else {
              // If no orders, clean up the sound state
              setSoundPlaying(false);
            }
          }
        });

        console.log('🔊 Audio file loaded with manual loop listener.');

      } catch (e) {
        console.error('Failed to load sound:', e);
      }
    };

    loadSound();

    // --- Cleanup Function ---
    // Note: The dependency array includes isSoundEnabled because it's used inside the listener
    return () => {
      if (soundObjectRef.current) {
        // Remove the listener before unloading
        soundObjectRef.current.setOnPlaybackStatusUpdate(null);
        soundObjectRef.current.unloadAsync().catch(e => console.error('Failed to unload sound:', e));
        soundObjectRef.current = null;
      }
    };
  }, [isSoundEnabled]);
  return {
    unreadCount,
    allNotifications,
    pendingOrderIds,
    isConnected,
    isSoundEnabled,
    soundPlaying,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications, // Renamed from clearLiveNotifications
    toggleSound,
    stopSound,
    reconnectWebSocket: connectWebSocket,
    fetchAllNotifications,
    fetchUnreadCount,
    checkOrderStatuses,
  };
};