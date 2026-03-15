import { View, Text, TouchableOpacity, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useAppStore, Transaction, Category } from '../../stores/useAppStore';
import { useMemo } from 'react';
import CategoryIcon from '../../components/CategoryIcon';

export default function AllTransactionsScreen() {
    const router = useRouter();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const transactions = useAppStore((state) => state.transactions);
    const categories = useAppStore((state) => state.categories);

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

    const renderItem = ({ item }: { item: Transaction & { category?: Category } }) => (
        <View className="mb-4 flex-row items-center justify-between rounded-3xl bg-white p-4 shadow-sm dark:bg-gray-900">
            <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? (item.category?.themeBgDark || '#064E3B') : (item.category?.themeBgLight || '#D1FAE5') }}>
                    <CategoryIcon icon={item.category?.icon || 'circle'} iconType={item.category?.iconType} size={20} color={isDarkMode ? (item.category?.themeFgDark || '#34D399') : (item.category?.themeFgLight || '#059669')} />
                </View>
                <View className="ml-4">
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.note || item.category?.name || 'Transaction'}</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">{item.category?.name || ''}</Text>
                </View>
            </View>
            <Text className={`text-base font-bold ${item.type === 'expense' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                {item.type === 'expense' ? '-' : '+'}${formatAmount(item.amount)}
            </Text>
        </View>
    );

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
                                    {total < 0 ? '-' : '+'}${formatAmount(Math.abs(total))}
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
