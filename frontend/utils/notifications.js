import axios from 'axios';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notifications globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true
  }),
});

export async function registerForPushNotificationsAsync(userType, userId) {
  let token;

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // --- ADD THIS SECTION FOR ANDROID POPUPS ---
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('new-order-alert', {
      name: 'New Order Alert',
      importance: Notifications.AndroidImportance.MAX, // Forces the popup banner
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'newOrderAlert.mp3', // Make sure this file exists in assets
    });
  }
  // -------------------------------------------

  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get FCM token
    const tokenData = await Notifications.getDevicePushTokenAsync();
    token = tokenData.data;

    console.log('📱 Device Push Token Type:', tokenData.type);
    console.log('📱 Push token:', token);

    // Prepare payload for backend
    const payload = {
      userType: userType,
      userId: userId,
      token: token,
      platform: Platform.OS
    };

    console.log('📤 Sending to backend:', JSON.stringify(payload, null, 2));

    // Send token to backend
    const response = await axios.post(
      'https://haba-haba-api.ubua.cloud/api/notifications/register-token',
      payload
    );

    console.log('✅ Token registered successfully:', response.data);

  } catch (err) {
    console.error('❌ Push registration error:', err.message);

    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Error data:', JSON.stringify(err.response.data, null, 2));
    } else if (err.request) {
      console.error('   No response received from server');
    } else {
      console.error('   Error details:', err);
    }
  }

  return token;
}

export function useNotificationListener(onNotificationReceived) {
  useEffect(() => {
    // Foreground notification listener
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 FOREGROUND Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Background/quit state notification listener
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 User tapped notification (app in background/quit):', response.notification);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [onNotificationReceived]);
}