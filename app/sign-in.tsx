import { View, Text, TouchableOpacity, Platform, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from '../lib/secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useEffect, useState } from 'react';
import { AntDesign } from '@expo/vector-icons';
import { verifyGoogleToken } from '../lib/api';
import { useAppStore } from '../stores/useAppStore';
import { runSync } from '../lib/sync';

// Ensure WebBrowser completes its authentication session for web
if (Platform.OS === 'web') {
    WebBrowser.maybeCompleteAuthSession();
}

export default function SignInScreen() {
    const router = useRouter();
    const setUser = useAppStore((state) => state.setUser);
    const setAuthenticating = useAppStore((state) => state.setAuthenticating);


    const redirectUri = AuthSession.makeRedirectUri();

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
        redirectUri,
        responseType: Platform.OS === 'web' ? 'id_token' : 'code',
    });

    const [loading, setLoading] = useState(!!response);
    const [error, setError] = useState('');

    useEffect(() => {
        console.log("Auth Request:", request);
    }, [request]);

    useEffect(() => {
        if (!response) return;

        console.log("response receive:", response)

        if (response.type === 'success') {
            const idToken =
                response.authentication?.idToken ||
                response.params?.id_token;

            const accessToken =
                response.authentication?.accessToken ||
                response.params?.access_token;

            if (idToken) {
                handleBackendVerification(idToken);
            } else if (accessToken) {
                handleBackendVerification(accessToken);
            } else {
                setLoading(false);
                setError('Authentication succeeded but no token was received.');
            }
        } else if (response.type === 'error') {
            setError('Authentication failed. Please try again.');
            setLoading(false);
            setAuthenticating(false);
        } else if (response.type === 'cancel' || response.type === 'dismiss') {
            setLoading(false);
            setAuthenticating(false);
        }
    }, [response]);

    async function handleBackendVerification(googleToken: string) {
        setLoading(true);
        setError('');
        try {
            const deviceInfo = `${Platform.OS} - ${Platform.Version}`;
            const data = await verifyGoogleToken(googleToken, deviceInfo);
            console.log("token verify data", data);
            // Store JWT
            await SecureStore.setItemAsync('authToken', data.token);

            // Store user info
            if (data.user) {
                const userName = data.user.name || data.user.email?.split('@')[0] || 'User';
                const userEmail = data.user.email || '';
                const profilePicture = data.user.profilePicture || undefined;

                setUser({
                    name: userName,
                    email: userEmail,
                    profilePicture: profilePicture,
                });
                await SecureStore.setItemAsync('userName', userName);
                await SecureStore.setItemAsync('userEmail', userEmail);
                if (profilePicture) {
                    await SecureStore.setItemAsync('userProfilePicture', profilePicture);
                }

                try {
                    await runSync();
                } catch (syncError: any) {
                    if (syncError.message === 'UNAUTHORIZED') {
                        // Token expired
                        await SecureStore.deleteItemAsync('authToken');
                        setAuthenticating(false);
                        router.replace('/sign-in');
                        return;
                    }
                    // Non-auth sync errors are ok — we continue with local data
                    console.warn('Sync on boot failed:', syncError.message);
                }

                // Check for categories
                const categories = useAppStore.getState().categories;
                setAuthenticating(false);
                if (categories.length === 0) {
                    console.log("No categories found, redirecting to onboarding");
                    router.replace('/onboarding');
                } else {
                    console.log("Categories found, redirecting to app dashboard");
                    router.replace('/(app)');
                }
            }
        } catch (e: any) {
            console.error("Verification failed", e);
            setError(e.message || 'Failed to verify with server. Please try again.');
            setLoading(false);
            setAuthenticating(false);
        }
    }

    return (
        <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-950">

            {/* Icon Logo */}
            <View className="mb-4 h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-gray-900">
                <Image
                    source={require('../assets/icon.png')}
                    style={{ width: 96, height: 96 }}
                    resizeMode="contain"
                />
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
                            setAuthenticating(true);
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
