import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from '../lib/secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useEffect, useState } from 'react';
import { AntDesign } from '@expo/vector-icons';
import { verifyGoogleToken } from '../lib/api';
import { useAppStore } from '../stores/useAppStore';

// Ensure WebBrowser completes its authentication session
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
    const router = useRouter();
    const setUser = useAppStore((state) => state.setUser);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const redirectUri = AuthSession.makeRedirectUri({
        scheme: Platform.OS === 'android'
            ? 'com.googleusercontent.apps.718189168936-vlpef9ft1m9s5g6qijt7ujl17ag8s7gd'
            : 'com.ledger.app',
    });

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
        redirectUri,
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.idToken) {
                handleBackendVerification(authentication.idToken);
            } else if (authentication?.accessToken) {
                // Some flows return accessToken instead
                handleBackendVerification(authentication.accessToken);
            }
        } else if (response?.type === 'error') {
            setError('Authentication failed. Please try again.');
            setLoading(false);
        }
    }, [response]);

    async function handleBackendVerification(googleToken: string) {
        setLoading(true);
        setError('');
        try {
            const deviceInfo = `${Platform.OS} - ${Platform.Version}`;
            const data = await verifyGoogleToken(googleToken, deviceInfo);

            // Store JWT
            await SecureStore.setItemAsync('authToken', data.token);

            // Store user info
            if (data.user) {
                setUser({
                    name: data.user.name || data.user.email?.split('@')[0] || 'User',
                    email: data.user.email || '',
                    avatar: data.user.avatar || undefined,
                });
                await SecureStore.setItemAsync('userName', data.user.name || '');
                await SecureStore.setItemAsync('userEmail', data.user.email || '');
            }

            router.replace('/(app)');
        } catch (e: any) {
            console.error("Verification failed", e);
            setError(e.message || 'Failed to verify with server. Please try again.');
            setLoading(false);
        }
    }

    return (
        <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-950">

            {/* Icon Logo */}
            <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Text className="text-4xl font-black text-green-600 dark:text-green-500">L</Text>
            </View>
            <Text className="mb-2 text-4xl font-bold text-gray-900 dark:text-gray-100">Ledger</Text>

            {/* Taglines */}
            <Text className="mt-8 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
                Financial clarity{'\n'}starts{'\n'}here.
            </Text>
            <Text className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Track every penny, master your budget, and reach your goals effortlessly.
            </Text>

            {/* Error Message */}
            {error ? (
                <Text className="mt-4 text-center text-sm text-red-500">{error}</Text>
            ) : null}

            {/* Auth Button */}
            <View className="mt-12 w-full">
                {loading ? (
                    <View className="items-center justify-center py-4">
                        <ActivityIndicator size="small" color="#10B981" />
                        <Text className="mt-2 text-sm text-gray-500">Signing in...</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        disabled={!request}
                        onPress={() => {
                            setLoading(true);
                            promptAsync();
                        }}
                        className="flex-row items-center justify-center rounded-full border border-gray-200 bg-white py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                        <AntDesign name="google" size={24} color="#DB4437" />
                        <Text className="ml-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Continue with Google
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Footer Legal */}
            <Text className="absolute bottom-10 px-4 text-center text-xs text-gray-400 dark:text-gray-500">
                By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
        </View>
    );
}
