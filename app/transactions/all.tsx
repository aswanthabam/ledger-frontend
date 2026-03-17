import { View, Text, TouchableOpacity, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useAppStore, Transaction, Category } from '../../stores/useAppStore';
import { useMemo, useState } from 'react';
import CategoryIcon from '../../components/CategoryIcon';
import { softDeleteTransaction } from '../../lib/db';
import { apiDelete } from '../../lib/api';
import { loadDataIntoStore } from '../../lib/sync';
import { Alert } from 'react-native';

export default function AllTransactionsScreen() {
    const router = useRouter();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const currencySymbol = useAppStore((state) => state.currencySymbol);
    const transactions = useAppStore((state) => state.transactions);
    const categories = useAppStore((state) => state.categories);

    const [expandedUuid, setExpandedUuid] = useState<string | null>(null);

    // Group transactions by date
    const sections = useMemo(() => {
        const groups: Record<string, { items: (Transaction & { category?: Category })[], total: number }> = {};
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        for (const t of transactions) {
            const d = new Date(t.transactionDate);
            const dateStr = d.toDateString();
            let label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();
            if (dateStr === today) label = 'TODAY';
            else if (dateStr === yesterday) label = 'YESTERDAY';

            if (!groups[label]) groups[label] = { items: [], total: 0 };
            const cat = categories.find((c: Category) => c.uuid === t.categoryUuid);
            groups[label].items.push({ ...t, category: cat });
            groups[label].total += t.type === 'expense' ? -t.amount : t.amount;
        }

        return Object.entries(groups).map(([title, { items, total }]) => ({
            title,
            total,
            data: items,
        }));
    }, [transactions, categories]);

    function formatAmount(cents: number): string {
        return (Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    const handleDelete = (uuid: string, note?: string) => {
        Alert.alert(
            "Delete Transaction",
            `Are you sure you want to delete this transaction${note ? ` ("${note}")` : ""}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: async () => {
                        try {
                            await softDeleteTransaction(uuid);
                            await loadDataIntoStore();
                            try {
                                await apiDelete(`/api/transactions/${uuid}`);
                            } catch (e) {
                                console.warn('Server delete failed, will sync later');
                            }
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Transaction & { category?: Category } }) => {
        const isExpanded = expandedUuid === item.uuid;
        return (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setExpandedUuid(isExpanded ? null : item.uuid)}
                className="mb-4 overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-gray-900"
            >
                <View className="flex-row items-center justify-between p-4">
                    <View className="flex-row items-center">
                        <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? (item.category?.themeBgDark || '#064E3B') : (item.category?.themeBgLight || '#D1FAE5') }}>
                            <CategoryIcon icon={item.category?.icon || 'circle'} iconType={item.category?.iconType} size={20} color={isDarkMode ? (item.category?.themeFgDark || '#34D399') : (item.category?.themeFgLight || '#059669')} />
                        </View>
                        <View className="ml-4">
                            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.note || item.category?.name || 'Transaction'}</Text>
                            <Text className="text-xs text-gray-500 dark:text-gray-400">{item.category?.name || ''}</Text>
                        </View>
                    </View>
                    <View className="items-end">
                        <Text className={`text-base font-bold ${item.type === 'expense' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                            {item.type === 'expense' ? '-' : '+'}{currencySymbol}{formatAmount(item.amount)}
                        </Text>
                        <View className="mt-1">
                            <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
                        </View>
                    </View>
                </View>

                {isExpanded && (
                    <View className="border-t border-gray-50 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/20">
                        <View className="mb-4 space-y-2">
                            <View className="flex-row justify-between">
                                <Text className="text-xs text-gray-500 dark:text-gray-400">Date</Text>
                                <Text className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                    {new Date(item.transactionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </Text>
                            </View>
                            {item.note ? (
                                <View className="mt-2">
                                    <Text className="text-xs text-gray-500 dark:text-gray-400">Notes</Text>
                                    <Text className="mt-1 text-sm text-gray-900 dark:text-gray-100">{item.note}</Text>
                                </View>
                            ) : null}
                        </View>

                        <View className="flex-row items-center justify-end space-x-3">
                            <TouchableOpacity 
                                onPress={() => router.push({ pathname: '/transactions/add', params: { editUuid: item.uuid } })}
                                className="flex-row items-center rounded-full bg-blue-50 px-4 py-2 dark:bg-blue-900/20"
                            >
                                <Feather name="edit-2" size={14} color="#3B82F6" />
                                <Text className="ml-2 text-xs font-bold text-blue-600 dark:text-blue-400">Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => handleDelete(item.uuid, item.note)}
                                className="flex-row items-center rounded-full bg-red-50 px-4 py-2 dark:bg-red-900/20 ml-2"
                            >
                                <Feather name="trash-2" size={14} color="#EF4444" />
                                <Text className="ml-2 text-xs font-bold text-red-600 dark:text-red-400">Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-[#F9FAFB] dark:bg-[#030712]">

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <AntDesign name="arrow-left" size={24} color={isDarkMode ? 'white' : 'black'} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Transactions</Text>
                <View className="w-10" />
            </View>

            <View className="px-6 flex-1 mt-4">
                {sections.length > 0 ? (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.uuid}
                        renderItem={renderItem}
                        renderSectionHeader={({ section: { title, total } }) => (
                            <View className="flex-row items-center justify-between pb-4 pt-6">
                                <Text className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">{title}</Text>
                                <Text className={`text-xs ${total < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                    {total < 0 ? '-' : '+'}{currencySymbol}{formatAmount(Math.abs(total))}
                                </Text>
                            </View>
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 60 }}
                        ListEmptyComponent={
                            <Text className="mt-10 text-center text-sm text-gray-400">No transactions yet.</Text>
                        }
                    />
                ) : (
                    <View className="flex-1 items-center justify-center">
                        <Feather name="inbox" size={48} color="#9CA3AF" />
                        <Text className="mt-4 text-base text-gray-400">No transactions yet</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
