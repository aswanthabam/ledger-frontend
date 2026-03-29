import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import { initDB } from '../lib/db';
import { useColorScheme } from 'nativewind';
import { useAppStore } from '../stores/useAppStore';
import * as WebBrowser from 'expo-web-browser';
import { bootApp } from '../lib/boot';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from '../widget';
import { logger } from '../lib/logger';
import '../global.css';

if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}

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

// Global error boundary for React errors
class ErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { hasError: boolean }> {
    constructor(props: { children: ReactNode; onRetry: () => void }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('React ErrorBoundary Caught Error', error, { componentStack: errorInfo.componentStack });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-gray-950">
                    <Text className="text-4xl">⚠️</Text>
                    <Text className="mt-4 text-center text-xl font-bold text-gray-900 dark:text-white">Something went wrong</Text>
                    <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                        An unexpected error occurred. Please try restarting the app.
                    </Text>
                    <TouchableOpacity 
                        className="mt-8 rounded-full bg-green-600 px-8 py-3"
                        onPress={() => {
                            if (Platform.OS === 'web') {
                                window.location.reload();
                            } else {
                                this.setState({ hasError: false }, () => this.props.onRetry());
                            }
                        }} 
                    >
                        <Text className="font-bold text-white">Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

// Catch general JS errors
if (!__DEV__) {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
        logger.error(`Global JS Error (Fatal: ${isFatal})`, error);
        if (defaultHandler) {
            defaultHandler(error, isFatal);
        }
    });
}

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
            // Force re-init if retry was pressed
            if (dbReady === false && !__DEV__) {
                 // allow restart logic if needed, but usually full reload is better
            }
            
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
                logger.error('Boot/Init DB Failure', e);
                console.error('Failed to init DB or boot app', e);
                // We don't setDbReady true here, so it stays loading or boundary catches
            }
        }
        setup();
    }, [dbReady]);

    if (!dbReady || !fontsLoaded) {
        return (
            <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
                <ActivityIndicator size="small" color="#10B981" />
            </View>
        );
    }

    return (
        <ErrorBoundary onRetry={() => setDbReady(false)}>
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
        </ErrorBoundary>
    );
}
