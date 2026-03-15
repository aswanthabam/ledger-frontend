import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useAppStore, Category } from '../../stores/useAppStore';
import { generateUUID, insertTransaction } from '../../lib/db';
import { apiPost } from '../../lib/api';
import { loadDataIntoStore } from '../../lib/sync';
import CategoryIcon from '../../components/CategoryIcon';

export default function AddTransactionScreen() {
    const router = useRouter();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const categories = useAppStore((state) => state.categories);

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'expense' | 'asset'>('expense');
    const [note, setNote] = useState('');
    const [selectedCategoryUuid, setSelectedCategoryUuid] = useState('');
    const [date, setDate] = useState(new Date());
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter categories by type and search
    const filteredCategories = useMemo(() => {
        let cats = categories.filter((c: Category) => c.type === type);
        if (searchQuery) {
            cats = cats.filter((c: Category) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return cats.slice(0, 8);
    }, [categories, type, searchQuery]);

    async function handleSubmit() {
        if (!amount || !selectedCategoryUuid) {
            Alert.alert('Missing Fields', 'Please enter an amount and select a category.');
            return;
        }

        const amountCents = Math.round(parseFloat(amount) * 100);
        if (isNaN(amountCents) || amountCents <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }

        setSubmitting(true);
        const uuid = generateUUID();
        // Local DB stores date as YYYY-MM-DD
        const transactionDateLocal = date.toISOString().split('T')[0];
        // API requires full ISO 8601 datetime
        const transactionDateISO = date.toISOString();

        try {
            // Write to local DB first (optimistic)
            await insertTransaction({
                uuid, categoryUuid: selectedCategoryUuid,
                type, amount: amountCents, transactionDate: transactionDateLocal, note,
            });

            // Refresh store
            await loadDataIntoStore();

            // Try to push to server
            try {
                await apiPost('/api/transactions', {
                    uuid, categoryUuid: selectedCategoryUuid,
                    type, amount: amountCents,
                    transactionDate: transactionDateISO,
                    note: note || undefined,
                });
            } catch (e) {
                // Will be synced later
                console.warn('Server push failed, will sync later:', e);
            }

            router.back();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to add transaction.');
        } finally {
            setSubmitting(false);
        }
    }

    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white dark:bg-[#030712]"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 100 }}>

                {/* Header */}
                <View className="mt-8 flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()} className="p-2">
                        <AntDesign name="arrow-left" size={24} color={isDarkMode ? 'white' : 'black'} />
                    </TouchableOpacity>
                    <View className="w-10" />
                </View>

                {/* Amount Input */}
                <View className="mt-8 items-center">
                    <Text className="text-sm font-semibold text-green-500">Enter amount</Text>
                    <View className="mt-2 flex-row items-center justify-center">
                        <Text className="text-6xl font-black text-gray-900 dark:text-gray-100">$</Text>
                        <TextInput
                            className="ml-1 text-6xl font-black text-gray-900 dark:text-gray-100"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={isDarkMode ? '#374151' : '#D1D5DB'}
                            autoFocus
                        />
                    </View>
                </View>

                {/* Notes */}
                <View className="mt-6 w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
                    <TextInput
                        className="text-center text-base text-gray-900 dark:text-gray-100"
                        value={note}
                        onChangeText={setNote}
                        placeholder="Notes"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                {/* Expense/Asset Toggle */}
                <View className="mt-8 flex-row rounded-full bg-gray-50 p-1 dark:bg-gray-900/50">
                    <TouchableOpacity
                        className={`flex-1 items-center justify-center rounded-full py-3 ${type === 'expense' ? 'bg-white shadow-sm dark:bg-gray-800' : ''}`}
                        onPress={() => { setType('expense'); setSelectedCategoryUuid(''); }}
                    >
                        <Text className={`font-semibold ${type === 'expense' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 items-center justify-center rounded-full py-3 ${type === 'asset' ? 'bg-white shadow-sm dark:bg-gray-800' : ''}`}
                        onPress={() => { setType('asset'); setSelectedCategoryUuid(''); }}
                    >
                        <Text className={`font-semibold ${type === 'asset' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>Asset</Text>
                    </TouchableOpacity>
                </View>

                {/* Category Selection */}
                <View className="mt-10">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Select Category</Text>
                        <TouchableOpacity onPress={() => router.push('/categories/select')}>
                            <Text className="text-sm font-medium text-green-600 dark:text-green-500">View All</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mt-4 flex-row items-center rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
                        <Feather name="search" size={18} color="#9CA3AF" />
                        <TextInput
                            placeholder="Search categories..."
                            className="ml-2 flex-1 text-gray-900 dark:text-white"
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {filteredCategories.length > 0 ? (
                        <View className="mt-6 flex-row flex-wrap gap-4">
                            {filteredCategories.map((cat: Category) => {
                                const isSelected = selectedCategoryUuid === cat.uuid;
                                return (
                                    <View key={cat.uuid} className="items-center" style={{ width: '22%' }}>
                                        <TouchableOpacity
                                            onPress={() => setSelectedCategoryUuid(cat.uuid)}
                                            className={`h-16 w-16 items-center justify-center rounded-2xl ${isSelected ? 'border-2 border-green-500' : ''}`}
                                            style={{ backgroundColor: isDarkMode ? cat.themeBgDark : cat.themeBgLight }}
                                        >
                                            <CategoryIcon
                                                icon={cat.icon}
                                                iconType={cat.iconType}
                                                size={24}
                                                color={isSelected ? '#10B981' : (isDarkMode ? cat.themeFgDark : cat.themeFgLight)}
                                            />
                                        </TouchableOpacity>
                                        <Text className={`mt-2 text-xs ${isSelected ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {cat.name}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <Text className="mt-6 text-center text-sm text-gray-400">No categories found. Create one first.</Text>
                    )}
                </View>

                {/* Date */}
                <View className="mt-10">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Date</Text>
                    <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                        <View className="flex-row items-center">
                            <Feather name="calendar" size={20} color={isDarkMode ? '#D1D5DB' : '#4B5563'} />
                            <Text className="ml-3 text-base font-medium text-gray-900 dark:text-white">{formattedDate}</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>

            {/* Submit */}
            <View className="absolute bottom-10 left-6 right-6">
                <TouchableOpacity
                    className="items-center justify-center rounded-full bg-black py-4 shadow-sm dark:bg-white"
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <Text className="text-lg font-bold text-white dark:text-black">
                        {submitting ? 'Adding...' : 'Add Entry'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
