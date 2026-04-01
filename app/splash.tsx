import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, Appearance } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from '../lib/secure-store';
import { runSync } from '../lib/sync';
import { useAppStore } from '../stores/useAppStore';
import { bootApp } from '../lib/boot';

export default function SplashScreen() {
    const router = useRouter();
    const setUser = useAppStore((state) => state.setUser);
    const [status, setStatus] = useState('Checking credentials...');

    useEffect(() => {
        async function boot() {
            try {
                // Perform shared boot logic
                await bootApp();

                const token = await SecureStore.getItemAsync('authToken');
                const isAuthenticating = useAppStore.getState().isAuthenticating;
                if (!token) {
                    if (isAuthenticating) {
                        setStatus('Finalizing sign in...');
                        return;
                    }
                    router.replace('/sign-in');
                    return;
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
                    style={{ width: 96, height: 96 }}
                    resizeMode="contain"
                />
            </View>
            <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Ledger</Text>
            <ActivityIndicator size="small" color="#10B981" />
            <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400">{status}</Text>
        </View>
    );
}
