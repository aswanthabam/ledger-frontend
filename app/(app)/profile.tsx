import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from '../../lib/secure-store';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useAppStore } from '../../stores/useAppStore';
import { logout } from '../../lib/api';

export default function ProfileScreen() {
    const router = useRouter();
    const { isDarkMode, toggleDarkMode, user, setUser } = useAppStore();

    async function handleSignOut() {
        try {
            // Call server logout
            try { await logout(); } catch (e) { /* ignore network errors */ }

            // Clear local state
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('userName');
            await SecureStore.deleteItemAsync('userEmail');
            setUser(null);
            router.replace('/sign-in');
        } catch (e) {
            console.error('Logout error', e);
        }
    }

    const displayName = user?.name || 'User';
    const displayEmail = user?.email || '';
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <View className="flex-1 bg-[#F9FAFB] dark:bg-[#030712]">
            <View className="flex-1 px-6 pt-16">

                {/* Header */}
                <View className="flex-row items-center justify-between shadow-sm">
                    <TouchableOpacity onPress={() => router.back()} className="p-2">
                        <AntDesign name="arrow-left" size={24} color={isDarkMode ? 'white' : 'black'} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Profile & Settings
                    </Text>
                    <View className="w-10" />
                </View>

                {/* Profile Info */}
                <View className="mt-10 items-center">
                    <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-green-100 dark:border-green-900/30">
                        <Text className="text-4xl font-black text-green-600 dark:text-green-500">{initials}</Text>
                    </View>
                    <Text className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{displayName}</Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">{displayEmail}</Text>
                </View>

                {/* Preferences */}
                <View className="mt-10">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        Preferences
                    </Text>
                    <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
                        <View className="flex-row items-center">
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                                <Feather name="moon" size={20} color="#10B981" />
                            </View>
                            <View className="ml-4">
                                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">Dark Mode</Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400">
                                    Currently set to {isDarkMode ? 'Dark' : 'Light'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={isDarkMode}
                            onValueChange={toggleDarkMode}
                            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                            thumbColor={'#FFFFFF'}
                        />
                    </View>
                </View>

                {/* Data & Management */}
                <View className="mt-8">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        Data & Management
                    </Text>

                    <TouchableOpacity
                        className="mt-4 flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
                        onPress={() => router.push('/categories/manage')}
                    >
                        <View className="flex-row items-center">
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                                <Feather name="grid" size={20} color="#10B981" />
                            </View>
                            <Text className="ml-4 text-base font-semibold text-gray-900 dark:text-gray-100">Manage Categories</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="mt-4 flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
                        onPress={() => router.push('/transactions/all')}
                    >
                        <View className="flex-row items-center">
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                                <Feather name="list" size={20} color="#10B981" />
                            </View>
                            <Text className="ml-4 text-base font-semibold text-gray-900 dark:text-gray-100">View Transactions</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <View className="mt-12">
                    <TouchableOpacity
                        className="flex-row items-center justify-center rounded-full border border-red-100 bg-red-50 py-4 shadow-sm dark:border-red-900/50 dark:bg-red-950/30"
                        onPress={handleSignOut}
                    >
                        <Feather name="log-out" size={20} color="#EF4444" />
                        <Text className="ml-3 text-lg font-semibold text-red-500">
                            Sign Out
                        </Text>
                    </TouchableOpacity>
                    <Text className="mt-6 text-center text-xs text-gray-400">Version 1.0.0</Text>
                </View>
            </View>
        </View>
    );
}
