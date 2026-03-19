import { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useAppStore, Category, Transaction } from '../../stores/useAppStore';
import { generateUUID, insertTransaction, updateTransaction } from '../../lib/db';
import { apiPost, apiPatch } from '../../lib/api';
import { loadDataIntoStore } from '../../lib/sync';
import CategoryIcon from '../../components/CategoryIcon';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function AddTransactionScreen() {
    const router = useRouter();
    const { editUuid } = useLocalSearchParams<{ editUuid?: string }>();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const currencySymbol = useAppStore((state) => state.currencySymbol);
    const transactions = useAppStore((state) => state.transactions);
    const categories = useAppStore((state) => state.categories);

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'expense' | 'asset'>('expense');
    const [note, setNote] = useState('');
    const [selectedCategoryUuid, setSelectedCategoryUuid] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
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

    // Pre-fill if editing
    useEffect(() => {
        if (editUuid) {
            const txn = transactions.find(t => t.uuid === editUuid);
            if (txn) {
                setAmount((txn.amount / 100).toString());
                setType(txn.type);
                setNote(txn.note || '');
                setSelectedCategoryUuid(txn.categoryUuid);
                setDate(new Date(txn.transactionDate));
            }
        }
    }, [editUuid, transactions]);

    // Handle selection from the "View All" screen via Zustand
    const pickedCategoryUuid = useAppStore((state) => state.pickedCategoryUuid);
    const setPickedCategory = useAppStore((state) => state.setPickedCategory);

    useEffect(() => {
        if (pickedCategoryUuid) {
            setSelectedCategoryUuid(pickedCategoryUuid);
            // Clear it so it doesn't overwrite future selections on this screen
            setPickedCategory(null);
        }
    }, [pickedCategoryUuid]);

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
            if (editUuid) {
                await updateTransaction({
                    uuid: editUuid, categoryUuid: selectedCategoryUuid,
                    type, amount: amountCents, transactionDate: transactionDateLocal, note,
                });
            } else {
                await insertTransaction({
                    uuid, categoryUuid: selectedCategoryUuid,
                    type, amount: amountCents, transactionDate: transactionDateLocal, note,
                });
            }

            // Refresh store
            await loadDataIntoStore();

            // Try to push to server
            try {
                if (editUuid) {
                    await apiPatch(`/api/transactions/${editUuid}`, {
                        categoryUuid: selectedCategoryUuid,
                        type, amount: amountCents,
                        transactionDate: transactionDateISO,
                        note: note || undefined,
                    });
                } else {
                    await apiPost('/api/transactions', {
                        uuid, categoryUuid: selectedCategoryUuid,
                        type, amount: amountCents,
                        transactionDate: transactionDateISO,
                        note: note || undefined,
                    });
                }
            } catch (e) {
                // Will be synced later
                console.warn('Server push failed, will sync later:', e);
            }

            router.back();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save transaction.');
        } finally {
            setSubmitting(false);
        }
    }

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios'); // Logic for Android to hide, iOS to keep
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white dark:bg-[#030712]"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 100 }}>

                {/* Header */}
                <View 
                    className="flex-row items-center justify-between"
                    style={{ marginTop: Platform.OS === 'web' ? 0 : 32 }}
                >
                    <TouchableOpacity onPress={() => router.back()} className="p-2">
                        <AntDesign name="arrow-left" size={24} color={isDarkMode ? 'white' : 'black'} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">{editUuid ? 'Edit Transaction' : 'Add Transaction'}</Text>
                    <View className="w-10" />
                </View>

                {/* Amount Input */}
                <View className="mt-8 items-center">
                    <Text className="text-sm font-semibold text-green-500">Enter amount</Text>
                    <View className="mt-2 flex-row items-center justify-center">
                        <Text
                            className="text-6xl font-black text-gray-900 dark:text-gray-100"
                            style={{ includeFontPadding: false, lineHeight: 72 }}
                        >
                            {currencySymbol}
                        </Text>
                        <TextInput
                            className="ml-1 text-6xl font-black text-gray-900 dark:text-gray-100"
                            style={Platform.select({
                                web: { outlineStyle: 'none' as any, minWidth: 150, padding: 0 },
                                default: { includeFontPadding: false, lineHeight: 72, padding: 0 }
                            })}
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
                <View className="items-center">
                    <View className="w-3/4 h-10 rounded-2xl bg-gray-50 dark:bg-gray-900/50 py-1 justify-center items-center">
                        <TextInput
                            className="text-sm text-center text-gray-900 dark:text-gray-100"
                            style={{ includeFontPadding: false, padding: 0, width: '100%', textAlign: 'center' }}
                            value={note}
                            onChangeText={setNote}
                            placeholder="Notes"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Expense/Asset Toggle */}
                <View className="mt-8 flex-row rounded-full bg-gray-50 p-1 dark:bg-gray-900/50">
                    <TouchableOpacity
                        className="flex-1 items-center justify-center rounded-full py-3"
                        style={type === 'expense' ? { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 } : undefined}
                        onPress={() => { setType('expense'); setSelectedCategoryUuid(''); }}
                    >
                        <Text className="font-semibold" style={{ color: type === 'expense' ? (isDarkMode ? '#FFFFFF' : '#111827') : '#6B7280' }}>Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 items-center justify-center rounded-full py-3"
                        style={type === 'asset' ? { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 } : undefined}
                        onPress={() => { setType('asset'); setSelectedCategoryUuid(''); }}
                    >
                        <Text className="font-semibold" style={{ color: type === 'asset' ? (isDarkMode ? '#FFFFFF' : '#111827') : '#6B7280' }}>Asset</Text>
                    </TouchableOpacity>
                </View>

                {/* Category Selection */}
                <View className="mt-10">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Select Category</Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/categories/select', params: { type } })}>
                            <Text className="text-sm font-medium text-green-600 dark:text-green-500">View All</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mt-4 flex-row items-center rounded-xl bg-gray-50 px-4 dark:bg-gray-900/50">
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
                        <View className="mt-6">
                            <ScrollView
                                horizontal={true}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 24 }}
                            >
                                {filteredCategories.map((cat: Category) => {
                                    const isSelected = selectedCategoryUuid === cat.uuid;
                                    return (
                                        <View key={cat.uuid} className="items-center mr-4 w-16">
                                            <TouchableOpacity
                                                onPress={() => setSelectedCategoryUuid(cat.uuid)}
                                                className={`h-14 w-14 items-center justify-center rounded-2xl ${isSelected ? 'border-2' : ''}`}
                                                style={{
                                                    backgroundColor: isDarkMode ? cat.themeBgDark : cat.themeBgLight,
                                                    ...(isSelected ? { borderColor: isDarkMode ? cat.themeFgDark : cat.themeFgLight } : {})
                                                }}
                                            >
                                                <CategoryIcon
                                                    icon={cat.icon}
                                                    iconType={cat.iconType}
                                                    size={20}
                                                    color={isSelected ? cat.themeFgLight : (isDarkMode ? cat.themeFgDark : cat.themeFgLight)}
                                                />
                                            </TouchableOpacity>
                                            <Text className={`mt-2 text-[11px] text-center ${isSelected ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} numberOfLines={1}>
                                                {cat.name}
                                            </Text>
                                        </View>
                                    );
                                })}

                                {/* Add Category Button */}
                                <View className="items-center w-16 mr-6">
                                    <TouchableOpacity
                                        onPress={() => router.push('/categories/add')}
                                        className="h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                                    >
                                        <AntDesign name="plus" size={20} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                                    </TouchableOpacity>
                                    <Text className="mt-2 text-[11px] text-center text-gray-500 dark:text-gray-400" numberOfLines={1}>
                                        New
                                    </Text>
                                </View>
                            </ScrollView>
                        </View>
                    ) : (
                        <View className="mt-6 items-center">
                            <TouchableOpacity
                                onPress={() => router.push('/categories/add')}
                                className="h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                            >
                                <AntDesign name="plus" size={20} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                            </TouchableOpacity>
                            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">Create a category first.</Text>
                        </View>
                    )}
                </View>

                {/* Date */}
                <View className="mt-10">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Date</Text>
                    <TouchableOpacity 
                        onPress={() => setShowDatePicker(true)}
                        className="mt-4 flex-row items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50"
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <Feather name="calendar" size={20} color={isDarkMode ? '#D1D5DB' : '#4B5563'} />
                            <Text className="ml-3 text-base font-medium text-gray-900 dark:text-white">{formattedDate}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                    />
                )}

            </ScrollView>

            {/* Submit */}
            <View className="absolute bottom-10 left-6 right-6">
                <TouchableOpacity
                    className="w-full items-center justify-center rounded-full bg-black py-4 shadow-sm dark:bg-white"
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <Text
                        className="text-center text-lg font-bold text-white dark:text-black"
                        numberOfLines={1}
                        style={{ includeFontPadding: false }}
                    >
                        {submitting ? (editUuid ? 'Saving...' : 'Adding...') : (editUuid ? 'Save Changes' : 'Add Entry')}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
