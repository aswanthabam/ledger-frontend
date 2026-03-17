import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Switch, Modal, TextInput, FlatList, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from '../../lib/secure-store';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useAppStore } from '../../stores/useAppStore';
import { logout, apiPatch } from '../../lib/api';
import { CURRENCIES, Currency } from '../../lib/currencies';
import { hasUnsyncedData, resetDB } from '../../lib/db';

export default function ProfileScreen() {
    const router = useRouter();
    const { isDarkMode, toggleDarkMode, user, setUser, currency, currencySymbol, setCurrency } = useAppStore();
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [currencySearch, setCurrencySearch] = useState('');

    const filteredCurrencies = useMemo(() => {
        if (!currencySearch) return CURRENCIES;
        const q = currencySearch.toLowerCase();
        return CURRENCIES.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }, [currencySearch]);

    async function handleCurrencySelect(selected: Currency) {
        setCurrencyModalVisible(false);
        setCurrencySearch('');

        // Update local state + SecureStore
        const changedAt = new Date().toISOString();
        setCurrency(selected.code, changedAt);
        await SecureStore.setItemAsync('currency', selected.code);
        await SecureStore.setItemAsync('currencyChangedAt', changedAt);

        // Try to push to server (fail silently if offline)
        try {
            await apiPatch('/api/users/me/preferences', {
                preferences: { currency: selected.code },
            });
        } catch (e) {
            console.warn('Currency update failed (will sync later):', e);
        }
    }

    async function performSignOut() {
        try {
            // Call server logout
            try { await logout(); } catch (e) { /* ignore network errors */ }

            // Reset DB and clear local state
            await resetDB();
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('userName');
            await SecureStore.deleteItemAsync('userEmail');
            await SecureStore.deleteItemAsync('userProfilePicture');
            await SecureStore.deleteItemAsync('currency');
            await SecureStore.deleteItemAsync('currencyChangedAt');
            await SecureStore.deleteItemAsync('lastSyncTimestamp');

            setUser(null);
            router.replace('/sign-in');
        } catch (e) {
            console.error('Logout error', e);
        }
    }

    async function handleSignOut() {
        const unsynced = await hasUnsyncedData();
        if (unsynced) {
            Alert.alert(
                'Unsynced Changes',
                'You have data that hasn\'t been synced to the cloud yet. Signing out will permanently delete these local changes. Are you sure?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out Anyway', style: 'destructive', onPress: performSignOut }
                ]
            );
        } else {
            Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out? Your local data will be cleared and re-synced on your next login.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: performSignOut }
                ]
            );
        }
    }

    const displayName = user?.name || 'User';
    const displayEmail = user?.email || '';
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    const selectedCurrencyObj = CURRENCIES.find((c) => c.code === currency);

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

                <View className="mt-10 items-center">
                    <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-green-100 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10">
                        {user?.profilePicture ? (
                            <Image
                                source={{ uri: user.profilePicture }}
                                className="h-full w-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <Text className="text-4xl font-black text-green-600 dark:text-green-500">{initials}</Text>
                        )}
                    </View>
                    <Text className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{displayName}</Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">{displayEmail}</Text>
                </View>

                {/* Preferences */}
                <View className="mt-10">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        Preferences
                    </Text>

                    {/* Dark Mode */}
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

                    {/* Currency */}
                    <TouchableOpacity
                        className="mt-4 flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
                        onPress={() => setCurrencyModalVisible(true)}
                    >
                        <View className="flex-row items-center">
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                                <Text className="text-lg font-bold text-green-600">{currencySymbol}</Text>
                            </View>
                            <View className="ml-4">
                                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">Currency</Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400">
                                    {selectedCurrencyObj ? `${selectedCurrencyObj.name} (${selectedCurrencyObj.code})` : currency}
                                </Text>
                            </View>
                        </View>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
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

            {/* Currency Picker Modal */}
            <Modal
                visible={currencyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCurrencyModalVisible(false)}
            >
                <View className="flex-1 justify-end">
                    <TouchableOpacity
                        className="flex-1"
                        activeOpacity={1}
                        onPress={() => setCurrencyModalVisible(false)}
                    />
                    <View
                        className="rounded-t-3xl bg-white px-6 pb-10 pt-6 dark:bg-gray-900"
                        style={{ maxHeight: '70%' }}
                    >
                        {/* Modal Header */}
                        <View className="mb-4 flex-row items-center justify-between">
                            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">Select Currency</Text>
                            <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                                <AntDesign name="close" size={22} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View className="mb-4 flex-row items-center rounded-xl bg-gray-50 px-4 dark:bg-gray-800">
                            <Feather name="search" size={18} color="#9CA3AF" />
                            <TextInput
                                className="ml-2 flex-1 py-3 text-base text-gray-900 dark:text-gray-100"
                                placeholder="Search currencies..."
                                placeholderTextColor="#9CA3AF"
                                value={currencySearch}
                                onChangeText={setCurrencySearch}
                                autoCorrect={false}
                            />
                        </View>

                        {/* Currency List */}
                        <FlatList
                            data={filteredCurrencies}
                            keyExtractor={(item) => item.code}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const isActive = item.code === currency;
                                return (
                                    <TouchableOpacity
                                        className="flex-row items-center justify-between rounded-xl px-4 py-3"
                                        style={isActive ? { backgroundColor: isDarkMode ? '#064E3B' : '#D1FAE5' } : undefined}
                                        onPress={() => handleCurrencySelect(item)}
                                    >
                                        <View className="flex-row items-center">
                                            <Text className="w-10 text-center text-lg font-bold text-gray-700 dark:text-gray-300">{item.symbol}</Text>
                                            <View className="ml-3">
                                                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.code}</Text>
                                                <Text className="text-xs text-gray-500 dark:text-gray-400">{item.name}</Text>
                                            </View>
                                        </View>
                                        {isActive && <AntDesign name="check" size={20} color="#10B981" />}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <Text className="mt-8 text-center text-sm text-gray-400">No currencies found</Text>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
