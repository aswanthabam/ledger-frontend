import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from '../lib/secure-store';
import { runSync } from '../lib/sync';
import { useAppStore } from '../stores/useAppStore';

export default function SplashScreen() {
    const router = useRouter();
    const setUser = useAppStore((state) => state.setUser);
    const [status, setStatus] = useState('Checking credentials...');

    useEffect(() => {
        async function boot() {
            try {
                const token = await SecureStore.getItemAsync('authToken');

                if (!token) {
                    router.replace('/sign-in');
                    return;
                }

                // Restore user info from local storage
                const userName = await SecureStore.getItemAsync('userName');
                const userEmail = await SecureStore.getItemAsync('userEmail');
                const userProfilePicture = await SecureStore.getItemAsync('userProfilePicture');
                if (userName || userEmail) {
                    setUser({
                        name: userName || 'User',
                        email: userEmail || '',
                        profilePicture: userProfilePicture || undefined
                    });
                }

                // Run sync to pull latest data from server
                setStatus('Syncing data...');
                try {
                    await runSync();
                } catch (syncError: any) {
                    if (syncError.message === 'UNAUTHORIZED') {
                        // Token expired
                        await SecureStore.deleteItemAsync('authToken');
                        router.replace('/sign-in');
                        return;
                    }
                    // Non-auth sync errors are ok — we continue with local data
                    console.warn('Sync on boot failed:', syncError.message);
                }

                // Check for categories
                const categories = useAppStore.getState().categories;
                if (categories.length === 0) {
                    router.replace('/onboarding');
                } else {
                    router.replace('/(app)');
                }
            } catch (e) {
                console.error('Boot error:', e);
                router.replace('/sign-in');
            }
        }

        boot();
    }, [router]);

    return (
        <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
            <View className="mb-6 h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-gray-900">
                <Image
                    source={require('../assets/icon.png')}
                    className="h-full w-full"
                    resizeMode="contain"
                />
            </View>
            <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Ledger</Text>
            <ActivityIndicator size="small" color="#10B981" />
            <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400">{status}</Text>
        </View>
    );
}
