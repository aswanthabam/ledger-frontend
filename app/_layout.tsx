import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TextInput } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import { initDB } from '../lib/db';
import { useColorScheme } from 'nativewind';
import { useAppStore } from '../stores/useAppStore';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { bootApp } from '../lib/boot';
import '../global.css';

// Handle auth session completion for web early
if (Platform.OS === 'web') {
    WebBrowser.maybeCompleteAuthSession();
}

// Set global default font for Text and TextInput
interface TextWithDefaultProps extends React.FC<any> {
    defaultProps?: { style?: any };
}
((Text as unknown) as TextWithDefaultProps).defaultProps = ((Text as unknown) as TextWithDefaultProps).defaultProps || {};
((Text as unknown) as TextWithDefaultProps).defaultProps!.style = { fontFamily: 'Inter_400Regular' };

((TextInput as unknown) as TextWithDefaultProps).defaultProps = ((TextInput as unknown) as TextWithDefaultProps).defaultProps || {};
((TextInput as unknown) as TextWithDefaultProps).defaultProps!.style = { fontFamily: 'Inter_400Regular' };

export default function RootLayout() {
    const [dbReady, setDbReady] = useState(false);
    const { isDarkMode } = useAppStore();
    const { setColorScheme } = useColorScheme();

    // Sync store theme with NativeWind
    useEffect(() => {
        setColorScheme(isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);
    
    let [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        Inter_900Black,
    });

    useEffect(() => {
        async function setup() {
            // On web, skip DB init if we are in an auth redirect tab
            if (Platform.OS === 'web') {
                const search = window.location.search;
                const hash = window.location.hash;
                const isAuthRedirect = search.includes('code=') || 
                                     search.includes('error=') || 
                                     hash.includes('id_token=') || 
                                     hash.includes('access_token=') ||
                                     hash.includes('state=');
                
                if (isAuthRedirect) {
                    console.log('Skipping DB init in auth redirect tab');
                    return;
                }
            }

            try {
                await initDB();
                await bootApp();
                setDbReady(true);
            } catch (e) {
                console.error('Failed to init DB or boot app', e);
            }
        }
        setup();
    }, []);

    if (!dbReady || !fontsLoaded) {
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
                <Stack.Screen name="onboarding" />
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
