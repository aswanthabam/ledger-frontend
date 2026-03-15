import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useAppStore, Category, Transaction } from '../../stores/useAppStore';
import { useMemo } from 'react';
import CategoryIcon from '../../components/CategoryIcon';

export default function HomeDashboard() {
    const router = useRouter();
    const user = useAppStore((state) => state.user);
    const categories = useAppStore((state) => state.categories);
    const transactions = useAppStore((state) => state.transactions);
    const currentMonth = useAppStore((state) => state.currentMonth);
    const setCurrentMonth = useAppStore((state) => state.setCurrentMonth);
    const isDarkMode = useAppStore((state) => state.isDarkMode);

    // Filter transactions for the current month
    const monthTransactions = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        return transactions.filter((t: Transaction) => {
            const d = new Date(t.transactionDate);
            return d.getFullYear() === year && d.getMonth() === month;
        });
    }, [transactions, currentMonth]);

    // Compute totals
    const spent = useMemo(() =>
        monthTransactions.filter((t: Transaction) => t.type === 'expense')
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        [monthTransactions]
    );
    const invested = useMemo(() =>
        monthTransactions.filter((t: Transaction) => t.type === 'asset')
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        [monthTransactions]
    );

    // Category breakdown
    const categorySpending = useMemo(() => {
        const map: Record<string, number> = {};
        monthTransactions.filter((t: Transaction) => t.type === 'expense').forEach((t: Transaction) => {
            map[t.categoryUuid] = (map[t.categoryUuid] || 0) + t.amount;
        });
        return Object.entries(map)
            .map(([uuid, amount]) => ({
                category: categories.find((c: Category) => c.uuid === uuid),
                amount,
                pct: spent > 0 ? Math.round((amount / spent) * 100) : 0,
            }))
            .filter((c) => c.category)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [monthTransactions, categories, spent]);

    // Recent activity (last 5)
    const recentActivity = useMemo(() => {
        return transactions.slice(0, 5).map((t: Transaction) => ({
            ...t,
            category: categories.find((c: Category) => c.uuid === t.categoryUuid),
        }));
    }, [transactions, categories]);

    const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    function changeMonth(delta: number) {
        const d = new Date(currentMonth);
        d.setMonth(d.getMonth() + delta);
        setCurrentMonth(d);
    }

    function formatAmount(cents: number): string {
        const dollars = (cents / 100).toFixed(2);
        return dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function formatDate(dateStr: string): string {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) {
            return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        }
        if (d.toDateString() === yesterday.toDateString()) {
            return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        }
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const spentDollars = Math.floor(spent / 100);
    const spentCents = String(spent % 100).padStart(2, '0');
    const investedDollars = Math.floor(invested / 100);
    const investedCents = String(invested % 100).padStart(2, '0');

    return (
        <View className="flex-1 bg-[#F9FAFB] dark:bg-[#030712]">
            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>

                {/* Header */}
                <View className="mt-8 flex-row items-center justify-between">
                    <Text className="text-xl font-medium text-gray-900 dark:text-gray-100">
                        Welcome {user?.name || 'there'},
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(app)/profile')} className="h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <Feather name="user" size={20} color="#EA580C" />
                    </TouchableOpacity>
                </View>

                {/* Month Selector */}
                <View className="mt-6 flex-row items-center justify-center space-x-4">
                    <TouchableOpacity className="p-2" onPress={() => changeMonth(-1)}>
                        <Feather name="chevron-left" size={20} color="#10B981" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        {monthLabel}
                    </Text>
                    <TouchableOpacity className="p-2" onPress={() => changeMonth(1)}>
                        <Feather name="chevron-right" size={20} color="#10B981" />
                    </TouchableOpacity>
                </View>

                {/* Hero Cards */}
                <View className="mt-6 rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-900">
                    <View>
                        <Text className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Spent</Text>
                        <Text className="mt-2 text-5xl font-black text-gray-900 dark:text-gray-100">
                            ${formatAmount(spent).split('.')[0]}<Text className="text-xl text-gray-400">.{spentCents}</Text>
                        </Text>
                    </View>

                    <View className="mt-6 h-px w-full bg-gray-100 dark:bg-gray-800" />

                    <View className="mt-6">
                        <Text className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Invested</Text>
                        <Text className="mt-2 text-3xl font-black text-gray-900 dark:text-gray-100">
                            ${formatAmount(invested).split('.')[0]}<Text className="text-lg text-gray-400">.{investedCents}</Text>
                        </Text>
                    </View>
                </View>

                {/* Spend by Category */}
                <View className="mt-8 flex-row items-center justify-between">
                    <Text className="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Spend by Category</Text>
                    <TouchableOpacity onPress={() => router.push('/categories/manage')}>
                        <Text className="text-sm font-medium text-green-600 dark:text-green-500">View All</Text>
                    </TouchableOpacity>
                </View>

                {categorySpending.length > 0 ? (
                    <View className="mt-4 space-y-6">
                        {categorySpending.map((item) => (
                            <View key={item.category!.uuid}>
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? item.category!.themeBgDark : item.category!.themeBgLight }}>
                                            <CategoryIcon icon={item.category!.icon} iconType={item.category!.iconType} size={16} color={isDarkMode ? item.category!.themeFgDark : item.category!.themeFgLight} />
                                        </View>
                                        <Text className="ml-4 text-base font-semibold text-gray-900 dark:text-gray-100">{item.category!.name}</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-base font-bold text-gray-900 dark:text-gray-100">${formatAmount(item.amount)}</Text>
                                        <Text className="text-xs text-gray-400">{item.pct}%</Text>
                                    </View>
                                </View>
                                <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                    <View className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: isDarkMode ? item.category!.themeFgDark : item.category!.themeFgLight }} />
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text className="mt-4 text-sm text-gray-400 dark:text-gray-500">No expenses this month yet.</Text>
                )}

                {/* Recent Activity */}
                <View className="mt-10 flex-row items-center justify-between">
                    <Text className="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Recent Activity</Text>
                    <TouchableOpacity onPress={() => router.push('/transactions/all')}>
                        <Text className="text-sm font-medium text-green-600 dark:text-green-500">View All</Text>
                    </TouchableOpacity>
                </View>

                {recentActivity.length > 0 ? (
                    <View className="mt-4 space-y-4">
                        {recentActivity.map((item) => (
                            <View key={item.uuid} className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: item.type === 'expense' ? '#EF4444' : '#10B981' }} />
                                    <View className="ml-4">
                                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            {item.note || item.category?.name || 'Transaction'}
                                        </Text>
                                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDate(item.transactionDate)}
                                        </Text>
                                    </View>
                                </View>
                                <Text className={`text-base font-bold ${item.type === 'expense' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                    {item.type === 'expense' ? '-' : '+'}${formatAmount(item.amount)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text className="mt-4 text-sm text-gray-400 dark:text-gray-500">No transactions yet. Tap + to add one!</Text>
                )}

            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                className="absolute bottom-8 right-6 h-16 w-16 items-center justify-center rounded-full bg-black shadow-lg dark:bg-white"
                onPress={() => router.push('/transactions/add')}
            >
                <AntDesign name="plus" size={28} color={isDarkMode ? 'black' : 'white'} />
            </TouchableOpacity>
        </View>
    );
}
