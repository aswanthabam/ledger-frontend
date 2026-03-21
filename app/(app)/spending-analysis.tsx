import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppStore, Category, Transaction } from '../../stores/useAppStore';
import { useMemo } from 'react';
import CategoryIcon from '../../components/CategoryIcon';

export default function SpendingAnalysis() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse the incoming dates
    const startDate = params.start ? new Date(params.start as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = params.end ? new Date(params.end as string) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    const categories = useAppStore((state) => state.categories);
    const transactions = useAppStore((state) => state.transactions);
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const currencySymbol = useAppStore((state) => state.currencySymbol);

    // Filter transactions for the current range
    const currentTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = new Date(t.transactionDate);
            return d >= startDate && d <= endDate;
        });
    }, [transactions, startDate, endDate]);

    // Calculate previous range dates based on the difference
    const { prevStartDate, prevEndDate } = useMemo(() => {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const pst = new Date(startDate.getTime() - diffTime - (24 * 60 * 60 * 1000));
        const pet = new Date(startDate.getTime() - (24 * 60 * 60 * 1000));
        return { prevStartDate: pst, prevEndDate: pet };
    }, [startDate, endDate]);

    // Filter transactions for the previous range
    const prevTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = new Date(t.transactionDate);
            return d >= prevStartDate && d <= prevEndDate;
        });
    }, [transactions, prevStartDate, prevEndDate]);

    const currentTotal = useMemo(() => currentTransactions.reduce((sum, t) => sum + t.amount, 0), [currentTransactions]);
    const prevTotal = useMemo(() => prevTransactions.reduce((sum, t) => sum + t.amount, 0), [prevTransactions]);

    const totalPctChange = prevTotal === 0 ? 0 : Math.round(((currentTotal - prevTotal) / prevTotal) * 100);

    const categoryStats = useMemo(() => {
        const currentMap: Record<string, { amount: number, count: number }> = {};
        currentTransactions.forEach((t) => {
            if (!currentMap[t.categoryUuid]) currentMap[t.categoryUuid] = { amount: 0, count: 0 };
            currentMap[t.categoryUuid].amount += t.amount;
            currentMap[t.categoryUuid].count += 1;
        });

        const prevMap: Record<string, number> = {};
        prevTransactions.forEach((t) => {
            prevMap[t.categoryUuid] = (prevMap[t.categoryUuid] || 0) + t.amount;
        });

        return Object.entries(currentMap)
            .map(([uuid, stats]) => {
                const prevAmount = prevMap[uuid] || 0;
                const pctChange = prevAmount === 0 ? 0 : Math.round(((stats.amount - prevAmount) / prevAmount) * 100);
                return {
                    category: categories.find((c) => c.uuid === uuid),
                    amount: stats.amount,
                    count: stats.count,
                    pctOfTotal: currentTotal > 0 ? Math.round((stats.amount / currentTotal) * 100) : 0,
                    pctChange,
                };
            })
            .filter((c) => c.category)
            .sort((a, b) => b.amount - a.amount);
    }, [currentTransactions, prevTransactions, categories, currentTotal]);

    // Find highest increase
    const highestIncrease = useMemo(() => {
        if (categoryStats.length === 0) return null;
        let highest = categoryStats[0];
        for (const cat of categoryStats) {
            if (cat.pctChange > highest.pctChange) {
                highest = cat;
            }
        }
        return highest;
    }, [categoryStats]);

    function formatAmount(cents: number): string {
        const dollars = (cents / 100).toFixed(2);
        return dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    const formatDollars = (cents: number) => formatAmount(cents).split('.')[0];
    const formatCents = (cents: number) => formatAmount(cents).split('.')[1];

    const getTrendBadgeStyle = (pctChange: number) => {
        if (pctChange > 0) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: 'trending-up', color: isDarkMode ? '#ef4444' : '#dc2626' };
        if (pctChange < 0) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: 'trending-down', color: isDarkMode ? '#4ade80' : '#16a34a' };
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', icon: 'minus', color: isDarkMode ? '#9ca3af' : '#6b7280' };
    };

    const totalTrend = getTrendBadgeStyle(totalPctChange);

    return (
        <View className="flex-1 bg-[#F6F8F6] dark:bg-[#030712]">
            <ScrollView contentContainerStyle={{ padding: 24, paddingTop: Platform.OS === 'web' ? 24 : 60, paddingBottom: 120 }}>
                <View className="flex-row items-center pb-6">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm mr-4">
                        <Feather name="arrow-left" size={20} color={isDarkMode ? '#FFFFFF' : '#111827'} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-[#111827] dark:text-white">Spending Analysis</Text>
                </View>
                <View className="mb-8 mt-4">
                    <Text className="text-[11px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
                        TOTAL SPEND ({params.range || 'SELECTED RANGE'})
                    </Text>
                    <View className="flex-row items-end mt-2">
                        <Text className="text-5xl font-black tracking-tight text-[#111827] dark:text-white">
                            {currencySymbol}{formatDollars(currentTotal)}
                            <Text className="text-2xl text-[#9CA3AF]">.{formatCents(currentTotal)}</Text>
                        </Text>
                        {totalPctChange !== 0 && (
                            <Text className={`ml-3 mb-1.5 text-lg font-bold ${totalTrend.text}`}>
                                {totalPctChange > 0 ? '+' : ''}{totalPctChange}%
                            </Text>
                        )}
                    </View>
                </View>

                {highestIncrease && highestIncrease.pctChange > 0 && (
                    <View className="rounded-[32px] bg-white p-6 shadow-sm shadow-gray-200/50 dark:bg-gray-900 dark:shadow-none mb-6">
                        <View className="flex-row justify-between items-start mb-4">
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                                <Feather name="trending-up" size={20} color={isDarkMode ? '#ef4444' : '#dc2626'} />
                            </View>
                            <View className="rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1">
                                <Text className="text-xs font-bold text-red-600 dark:text-red-400">{highestIncrease.category?.name}</Text>
                            </View>
                        </View>
                        <Text className="text-xl font-bold text-[#111827] dark:text-white mb-2">Highest Increase</Text>
                        <Text className="text-sm text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                            Your spending in {highestIncrease.category?.name} has increased by {highestIncrease.pctChange}% compared to the previous period.
                        </Text>
                    </View>
                )}

                <Text className="text-[11px] font-bold tracking-[0.1em] text-[#9CA3AF] mb-8 mt-2">CATEGORIES</Text>

                <View className="space-y-6">
                    {categoryStats.map((item) => (
                        <View key={item.category!.uuid} className="mb-4">
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center">
                                    <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? item.category!.themeBgDark : item.category!.themeBgLight }}>
                                        <CategoryIcon icon={item.category!.icon} iconType={item.category!.iconType} size={20} color={isDarkMode ? item.category!.themeFgDark : item.category!.themeFgLight} />
                                    </View>
                                    <View className="ml-4">
                                        <Text className="text-base font-bold text-[#111827] dark:text-white">{item.category!.name}</Text>
                                        <Text className="text-xs font-medium text-[#9CA3AF] mt-0.5">{item.count} Transactions</Text>
                                    </View>
                                </View>
                                <View className="items-end">
                                    <View className="flex-row items-center">
                                        <Text className="text-base font-bold text-[#111827] dark:text-white">
                                            {currencySymbol}{formatAmount(item.amount)}
                                        </Text>
                                        {item.pctChange !== 0 && (
                                            <View className={`flex-row items-center rounded-full px-1.5 py-0.5 ml-2 ${getTrendBadgeStyle(item.pctChange).bg}`}>
                                                <Feather name={getTrendBadgeStyle(item.pctChange).icon as any} size={10} color={getTrendBadgeStyle(item.pctChange).color} />
                                                <Text className={`ml-1 text-[10px] font-bold leading-tight ${getTrendBadgeStyle(item.pctChange).text}`}>
                                                    {item.pctChange > 0 ? `+${item.pctChange}%` : `${item.pctChange}%`}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                            <View className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                <View className="h-full rounded-full" style={{ width: `${item.pctOfTotal}%`, backgroundColor: isDarkMode ? item.category!.themeFgDark : item.category!.themeFgLight }} />
                            </View>
                        </View>
                    ))}
                    {categoryStats.length === 0 && (
                        <Text className="text-sm text-gray-500">No categories found for this period.</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
