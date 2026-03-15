import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { initDB } from '../lib/db';
import '../global.css';

export default function RootLayout() {
    const [dbReady, setDbReady] = useState(false);

    useEffect(() => {
        async function setup() {
            try {
                await initDB();
                setDbReady(true);
            } catch (e) {
                console.error('Failed to init DB', e);
            }
        }
        setup();
    }, []);

    if (!dbReady) {
        return (
            <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
                <ActivityIndicator size="small" color="#10B981" />
            </View>
        );
    }

    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(app)" />
                <Stack.Screen name="index" />
                <Stack.Screen name="splash" />
                <Stack.Screen name="sign-in" />
                <Stack.Screen name="categories/add" />
                <Stack.Screen name="categories/icons" />
                <Stack.Screen name="categories/manage" />
                <Stack.Screen name="categories/select" />
                <Stack.Screen name="transactions/add" />
                <Stack.Screen name="transactions/all" />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}
