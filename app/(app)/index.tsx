import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, AntDesign, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useAppStore, Category, Transaction } from '../../stores/useAppStore';
import { useMemo, useState } from 'react';
import CategoryIcon from '../../components/CategoryIcon';

export default function HomeDashboard() {
    const router = useRouter();
    const user = useAppStore((state) => state.user);
    const categories = useAppStore((state) => state.categories);
    const transactions = useAppStore((state) => state.transactions);
    const currentMonth = useAppStore((state) => state.currentMonth);
    const setCurrentMonth = useAppStore((state) => state.setCurrentMonth);
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const currencySymbol = useAppStore((state) => state.currencySymbol);

    // Filter transactions for the current month
    const monthTransactions = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        return transactions.filter((t: Transaction) => {
            const d = new Date(t.transactionDate);
            return d.getFullYear() === year && d.getMonth() === month;
        });
    }, [transactions, currentMonth]);

    const prevMonthTransactions = useMemo(() => {
        const d = new Date(currentMonth);
        d.setMonth(d.getMonth() - 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        return transactions.filter((t: Transaction) => {
            const txDate = new Date(t.transactionDate);
            return txDate.getFullYear() === year && txDate.getMonth() === month;
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

    const prevSpent = useMemo(() => prevMonthTransactions.filter((t: Transaction) => t.type === 'expense').reduce((sum: number, t: Transaction) => sum + t.amount, 0), [prevMonthTransactions]);
    const prevInvested = useMemo(() => prevMonthTransactions.filter((t: Transaction) => t.type === 'asset').reduce((sum: number, t: Transaction) => sum + t.amount, 0), [prevMonthTransactions]);

    const spentPctChange = prevSpent === 0 ? 0 : Math.round(((spent - prevSpent) / prevSpent) * 100);
    const investedPctChange = prevInvested === 0 ? 0 : Math.round(((invested - prevInvested) / prevInvested) * 100);

    const formatPctBadge = (val: number) => {
        if (val === 0) return '0%';
        if (val > 0) return `+${val}%`;
        return `${val}%`;
    };

    // Category breakdown
    const categorySpending = useMemo(() => {
        const currentMap: Record<string, number> = {};
        monthTransactions.filter((t: Transaction) => t.type === 'expense').forEach((t: Transaction) => {
            currentMap[t.categoryUuid] = (currentMap[t.categoryUuid] || 0) + t.amount;
        });

        const prevMap: Record<string, number> = {};
        prevMonthTransactions.filter((t: Transaction) => t.type === 'expense').forEach((t: Transaction) => {
            prevMap[t.categoryUuid] = (prevMap[t.categoryUuid] || 0) + t.amount;
        });

        return Object.entries(currentMap)
            .map(([uuid, amount]) => {
                const prevAmount = prevMap[uuid] || 0;
                const pctChange = prevAmount === 0 ? 0 : Math.round(((amount - prevAmount) / prevAmount) * 100);
                return {
                    category: categories.find((c: Category) => c.uuid === uuid),
                    amount,
                    pctOfTotal: spent > 0 ? Math.round((amount / spent) * 100) : 0,
                    pctChange,
                };
            })
            .filter((c) => c.category)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [monthTransactions, prevMonthTransactions, categories, spent]);

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
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    const formatDollars = (cents: number) => formatAmount(cents).split('.')[0];
    const formatCents = (cents: number) => formatAmount(cents).split('.')[1];

    const getTrendBadgeStyle = (pctChange: number) => {
        if (pctChange > 0) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: 'trending-up', color: isDarkMode ? '#ef4444' : '#dc2626' };
        if (pctChange < 0) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: 'trending-down', color: isDarkMode ? '#4ade80' : '#16a34a' };
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', icon: 'minus', color: isDarkMode ? '#9ca3af' : '#6b7280' };
    };

    const spentTrend = getTrendBadgeStyle(spentPctChange);
    // For investments, going up is good (green), down is bad (red) - reverse of expenses
    const investedTrend = investedPctChange > 0
        ? { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: 'trending-up', color: isDarkMode ? '#4ade80' : '#16a34a' }
        : investedPctChange < 0
            ? { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: 'trending-down', color: isDarkMode ? '#ef4444' : '#dc2626' }
            : { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', icon: 'minus', color: isDarkMode ? '#9ca3af' : '#6b7280' };

    const [touchStartX, setTouchStartX] = useState(0);

    const onTouchStart = (e: any) => {
        setTouchStartX(e.nativeEvent.pageX);
    };

    const onTouchEnd = (e: any) => {
        const touchEndX = e.nativeEvent.pageX;
        const distance = touchEndX - touchStartX;
        if (distance > 50) {
            changeMonth(-1);
        } else if (distance < -50) {
            changeMonth(1);
        }
    };

    return (
        <View className="flex-1 bg-[#F6F8F6] dark:bg-[#030712]">
            <ScrollView contentContainerStyle={{
                padding: 24,
                paddingTop: Platform.OS === 'web' ? 24 : 60,
                paddingBottom: 120
            }}>
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-xl font-medium text-gray-900 dark:text-gray-100">Welcome {user?.name || 'User'}</Text>
                    </View>
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => router.push('/(app)/analytics')}
                            className="mr-2 items-center justify-center p-2"
                        >
                            <MaterialIcons name="insights" size={24} color={isDarkMode ? '#FFFFFF' : '#111827'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/(app)/profile')}
                            className="h-12 w-12 overflow-hidden items-center justify-center rounded-full border-2 border-white bg-green-100 shadow-sm dark:border-gray-800 dark:bg-green-900/30"
                        >
                            {user?.profilePicture ? (
                                <Image
                                    source={{ uri: user.profilePicture }}
                                    className="h-full w-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <Feather name="user" size={24} color="#10B981" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Month Selector */}
                <View className="mt-8 flex-row items-center justify-center space-x-6">
                    <TouchableOpacity onPress={() => changeMonth(-1)}>
                        <Feather name="chevron-left" size={20} color="#10B981" />
                    </TouchableOpacity>
                    <Text className="text-base font-bold text-gray-600 dark:text-gray-300 w-36 text-center">
                        {monthLabel}
                    </Text>
                    <TouchableOpacity onPress={() => changeMonth(1)}>
                        <Feather name="chevron-right" size={20} color="#10B981" />
                    </TouchableOpacity>
                </View>

                {/* Main Card */}
                <View 
                    className="mt-8 rounded-[32px] bg-white p-6 shadow-sm shadow-gray-200/50 dark:bg-gray-900 dark:shadow-none"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    {/* Spent */}
                    <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-bold tracking-widest text-[#9CA3AF]">Spent</Text>
                        <View className={`flex-row items-center rounded-full px-2 py-1 ${spentTrend.bg}`}>
                            <Feather name={spentTrend.icon as any} size={12} color={spentTrend.color} />
                            <Text className={`ml-1 text-xs font-bold leading-tight ${spentTrend.text}`}>{formatPctBadge(spentPctChange)}</Text>
                        </View>
                    </View>
                    <Text className="mt-2 text-[48px] font-black tracking-tight text-[#111827] dark:text-white leading-[56px]">
                        {currencySymbol}{formatDollars(spent)}<Text className="text-2xl text-[#9CA3AF]">.{formatCents(spent)}</Text>
                    </Text>

                    <View className="mt-6 mb-6 h-px w-full bg-gray-100 dark:bg-gray-800" />

                    {/* Invested */}
                    <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-bold tracking-widest text-[#9CA3AF]">INVESTED</Text>
                        <View className={`flex-row items-center rounded-full px-2 py-1 ${investedTrend.bg}`}>
                            <Feather name={investedTrend.icon as any} size={12} color={investedTrend.color} />
                            <Text className={`ml-1 text-xs font-bold leading-tight ${investedTrend.text}`}>{formatPctBadge(investedPctChange)}</Text>
                        </View>
                    </View>
                    <Text className="mt-2 text-3xl font-black tracking-tight text-[#111827] dark:text-white">
                        {currencySymbol}{formatDollars(invested)}<Text className="text-lg text-[#9CA3AF]">.{formatCents(invested)}</Text>
                    </Text>
                </View>

                {/* Spend By Category */}
                <View className="mt-10 flex-row items-center justify-between mb-6">
                    <Text className="text-[11px] font-bold tracking-[0.15em] text-[#9CA3AF]">SPEND BY CATEGORY</Text>
                    <TouchableOpacity onPress={() => {
                        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
                        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
                        const rangeName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        router.push({ pathname: '/(app)/spending-analysis', params: { range: rangeName, start, end } });
                    }}>
                        <Text className="text-sm font-bold text-[#10B981]">View All</Text>
                    </TouchableOpacity>
                </View>

                {categorySpending.length > 0 ? (
                    <View className="space-y-5">
                        {categorySpending.map((item) => (
                            <View key={item.category!.uuid} className="mb-6">
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-row items-center flex-1">
                                        <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? item.category!.themeBgDark : item.category!.themeBgLight }}>
                                            <CategoryIcon icon={item.category!.icon} iconType={item.category!.iconType} size={20} color={isDarkMode ? item.category!.themeFgDark : item.category!.themeFgLight} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="ml-4 text-base font-semibold text-[#111827] dark:text-white">{item.category!.name}</Text>
                                            <View className="ml-4 mt-3 w-full flex-row h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                                <View className="h-full rounded-full" style={{ width: `${item.pctOfTotal}%`, backgroundColor: isDarkMode ? item.category!.themeFgDark : item.category!.themeFgLight }} />
                                            </View>
                                        </View>
                                    </View>
                                    <View className="items-end justify-center">
                                        <View className="flex-row items-center">
                                            <Text className="text-base font-bold text-[#111827] dark:text-white">{currencySymbol}{formatAmount(item.amount)}</Text>
                                            {item.pctChange !== 0 && <View className={`flex-row items-center rounded-full px-1.5 py-0.5 ml-2 ${getTrendBadgeStyle(item.pctChange).bg}`}>
                                                <Feather name={getTrendBadgeStyle(item.pctChange).icon as any} size={10} color={getTrendBadgeStyle(item.pctChange).color} />
                                                <Text className={`ml-1 text-[10px] font-bold leading-tight ${getTrendBadgeStyle(item.pctChange).text}`}>
                                                    {formatPctBadge(item.pctChange)}
                                                </Text>
                                            </View>}
                                        </View>
                                        <Text className="text-[10px] font-bold text-[#9CA3AF] mt-0.5">{item.pctOfTotal}%</Text>
                                    </View>
                                </View>
                                {/* Custom Progress Line Underneath */}

                            </View>
                        ))}
                    </View>
                ) : (
                    <Text className="mt-2 text-sm text-gray-400 dark:text-gray-500">No expenses this month yet.</Text>
                )}

                {/* Recent Activity */}
                <View className="mt-4 flex-row items-center justify-between mb-5">
                    <Text className="text-[11px] font-bold tracking-[0.15em] text-[#9CA3AF]">RECENT ACTIVITY</Text>
                    <TouchableOpacity onPress={() => router.push('/transactions/all')}>
                        <Text className="text-sm font-bold text-[#10B981]">View All</Text>
                    </TouchableOpacity>
                </View>

                {recentActivity.length > 0 ? (
                    <View className="space-y-6">
                        {recentActivity.map((item) => (
                            <View key={item.uuid} className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center flex-1 pr-4">
                                    {/* Indicator Dot */}
                                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: isDarkMode ? (item.category?.themeFgDark || '#10B981') : (item.category?.themeFgLight || '#10B981') }} />
                                    <View className="ml-4 flex-1">
                                        <Text className="text-[15px] font-semibold text-[#111827] dark:text-white" numberOfLines={1}>
                                            {item.note || item.category?.name || 'Transaction'}
                                        </Text>
                                        <Text className="text-[11px] font-medium text-[#9CA3AF] mt-1">
                                            {formatDate(item.transactionDate)}
                                        </Text>
                                    </View>
                                </View>
                                <Text className="text-[15px] font-bold text-[#111827] dark:text-white whitespace-nowrap">
                                    {item.type === 'expense' ? '-' : '+'}{currencySymbol}{formatAmount(item.amount)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text className="mt-2 text-sm text-gray-400 dark:text-gray-500">No transactions yet. Tap the + to add one!</Text>
                )}

            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-[#0F172A] dark:bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                onPress={() => router.push('/transactions/add')}
            >
                <AntDesign name="plus" size={24} color={isDarkMode ? '#0F172A' : '#FFFFFF'} />
            </TouchableOpacity>
        </View>
    );
}
