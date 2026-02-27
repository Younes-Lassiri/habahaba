import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

export function useNotificationListener() {
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);
}
