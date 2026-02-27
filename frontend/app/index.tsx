import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Index() {
    const [isReady, setIsReady] = useState(false);
    const [initialRoute, setInitialRoute] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkInitialRoute = async () => {
            try {
                // 1. Check if user has launched before (for Onboarding)
                const hasLaunched = await AsyncStorage.getItem('hasCompletedOnboarding');

                // 2. Check if user is already logged in (Token)
                const token = await AsyncStorage.getItem('token'); // Assuming 'token' is the key used for auth

                if (token) {
                    // User is logged in -> Go to Home
                    setInitialRoute('/(tabs)');
                } else if (hasLaunched === 'true') {
                    // User has onboarded but not logged in -> Go to Sign In
                    setInitialRoute('/(tabs)');
                } else {
                    // First time launch -> Go to Onboarding
                    setInitialRoute('/onboarding');
                }
            } catch (error) {
                console.error('Error checking initial route:', error);
                setInitialRoute('/signin'); // Fallback
            } finally {
                setIsReady(true);
            }
        };

        checkInitialRoute();
    }, []);
    // Redirect to the determined route
    return <Redirect href={initialRoute as any} />;
}
