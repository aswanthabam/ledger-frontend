import { View, Text, ScrollView, TouchableOpacity, Platform, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppStore, Category, Transaction } from '../../stores/useAppStore';
import { useMemo, useState } from 'react';
import CategoryIcon from '../../components/CategoryIcon';
import { LineChart } from 'react-native-gifted-charts';
import DateTimePicker from '@react-native-community/datetimepicker';

type TimeRange = 'This Month' | 'Previous Month' | 'Last 3 Months' | '6 Months' | 'This Year' | 'Custom';

export default function Analytics() {
    const router = useRouter();
    const categories = useAppStore((state) => state.categories);
    const transactions = useAppStore((state) => state.transactions);
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const currencySymbol = useAppStore((state) => state.currencySymbol);

    const screenWidth = Dimensions.get('window').width;
    const chartWidth = Math.max(screenWidth - 100, 200);

    const [selectedRange, setSelectedRange] = useState<TimeRange>('This Month');
    const ranges: TimeRange[] = ['This Month', 'Previous Month', 'Last 3 Months', '6 Months', 'This Year', 'Custom'];

    const [customStartDate, setCustomStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);

    const { startDate, endDate } = useMemo(() => {
        const today = new Date();
        let start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        let end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        switch (selectedRange) {
            case 'This Month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'Previous Month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'Last 3 Months':
                start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
                break;
            case '6 Months':
                start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
                break;
            case 'This Year':
                start = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
                end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'Custom':
                start = new Date(customStartDate);
                start.setHours(0, 0, 0, 0);
                end = new Date(customEndDate);
                end.setHours(23, 59, 59, 999);
                break;
        }
        return { startDate: start, endDate: end };
    }, [selectedRange, customStartDate, customEndDate]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = new Date(t.transactionDate);
            return d >= startDate && d <= endDate;
        });
    }, [transactions, startDate, endDate]);

    const prevTransactions = useMemo(() => {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const pst = new Date(startDate.getTime() - diffTime - (24 * 60 * 60 * 1000));
        const pet = new Date(startDate.getTime() - (24 * 60 * 60 * 1000));

        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = new Date(t.transactionDate);
            return d >= pst && d <= pet;
        });
    }, [transactions, startDate, endDate]);

    const totalSpent = useMemo(() => {
        return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        if (filteredTransactions.length === 0) return [];

        const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);

        if (daysDiff <= 7) {
            // Daily for short ranges
            let grouped: Record<string, number> = {};
            let curr = new Date(startDate);
            while (curr <= endDate) {
                grouped[curr.toISOString().split('T')[0]] = 0;
                curr.setDate(curr.getDate() + 1);
            }
            filteredTransactions.forEach(t => {
                const dateKey = new Date(t.transactionDate).toISOString().split('T')[0];
                if (grouped[dateKey] !== undefined) {
                    grouped[dateKey] += t.amount / 100;
                }
            });

            const keys = Object.keys(grouped).sort();
            return keys.map((key) => {
                const d = new Date(key);
                return {
                    value: grouped[key],
                    label: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                    tooltipLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    labelComponent: () => (
                        <View style={{ width: 40, marginLeft: -10, marginTop: 0 }}>
                            <Text style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 9, fontWeight: 'bold', textAlign: 'center' }}>
                                {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                            </Text>
                        </View>
                    )
                };
            });
        } else if (daysDiff <= 35) {
            // Daily points for month-size ranges, but aggregate labels weekly
            let grouped: Record<string, number> = {};
            let curr = new Date(startDate);
            while (curr <= endDate) {
                grouped[curr.toISOString().split('T')[0]] = 0;
                curr.setDate(curr.getDate() + 1);
            }
            filteredTransactions.forEach(t => {
                const dateKey = new Date(t.transactionDate).toISOString().split('T')[0];
                if (grouped[dateKey] !== undefined) {
                    grouped[dateKey] += t.amount / 100;
                }
            });

            const keys = Object.keys(grouped).sort();
            return keys.map((key, index) => {
                const d = new Date(key);
                const chunkStartDay = Math.floor(index / 7) * 7;
                const chunkEndDay = Math.min(chunkStartDay + 6, keys.length - 1);

                let labelComponent = undefined;
                if (index === Math.floor((chunkStartDay + chunkEndDay) / 2)) {
                    const sd = new Date(keys[chunkStartDay]).getDate();
                    const ed = new Date(keys[chunkEndDay]).getDate();
                    const labelStr = `${sd}-${ed}`;
                    labelComponent = () => (
                        <View style={{ width: 60, marginLeft: -20, marginTop: 0 }}>
                            <Text style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 9, fontWeight: 'bold', textAlign: 'center' }}>
                                {labelStr}
                            </Text>
                        </View>
                    );
                }

                return {
                    value: grouped[key],
                    label: '',
                    tooltipLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    labelComponent
                };
            });
        } else {
            // Monthly for year-size ranges
            let grouped: Record<string, number> = {};
            let curr = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            while (curr <= endDate) {
                grouped[`${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`] = 0;
                curr.setMonth(curr.getMonth() + 1);
            }
            filteredTransactions.forEach(t => {
                const d = new Date(t.transactionDate);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (grouped[monthKey] !== undefined) {
                    grouped[monthKey] += t.amount / 100;
                }
            });

            const keys = Object.keys(grouped).sort();
            return keys.map((key) => {
                const [year, month] = key.split('-');
                const d = new Date(parseInt(year), parseInt(month) - 1, 1);
                return {
                    value: grouped[key],
                    label: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
                    tooltipLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    labelComponent: () => (
                        <View style={{ width: 40, marginLeft: -10, marginTop: 0 }}>
                            <Text style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 9, fontWeight: 'bold', textAlign: 'center' }}>
                                {d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                            </Text>
                            <Text style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 9, fontWeight: 'bold', textAlign: 'center' }}>
                                {year.slice(2)}
                            </Text>
                        </View>
                    )
                };
            });
        }
    }, [filteredTransactions, startDate, endDate, isDarkMode]);

    const categorySpending = useMemo(() => {
        const currentMap: Record<string, number> = {};
        filteredTransactions.forEach((t: Transaction) => {
            currentMap[t.categoryUuid] = (currentMap[t.categoryUuid] || 0) + t.amount;
        });

        const prevMap: Record<string, number> = {};
        prevTransactions.forEach((t: Transaction) => {
            prevMap[t.categoryUuid] = (prevMap[t.categoryUuid] || 0) + t.amount;
        });

        const counts: Record<string, number> = {};
        filteredTransactions.forEach((t: Transaction) => {
            counts[t.categoryUuid] = (counts[t.categoryUuid] || 0) + 1;
        });

        return Object.entries(currentMap)
            .map(([uuid, amount]) => {
                const prevAmount = prevMap[uuid] || 0;
                const pctChange = prevAmount === 0 ? (amount > 0 ? 100 : 0) : Math.round(((amount - prevAmount) / prevAmount) * 100);
                return {
                    category: categories.find((c: Category) => c.uuid === uuid),
                    amount,
                    count: counts[uuid],
                    pctOfTotal: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
                    pctChange
                };
            })
            .filter((c) => c.category)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3); // top 3 for analytics home
    }, [filteredTransactions, prevTransactions, categories, totalSpent]);

    const formatPctBadge = (val: number) => {
        if (val === 0) return '0%';
        if (val > 0) return `+${val}%`;
        return `${val}%`;
    };

    const getTrendBadgeStyle = (pctChange: number) => {
        if (pctChange > 0) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: 'trending-up', color: isDarkMode ? '#ef4444' : '#dc2626' };
        if (pctChange < 0) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: 'trending-down', color: isDarkMode ? '#4ade80' : '#16a34a' };
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', icon: 'minus', color: isDarkMode ? '#9ca3af' : '#6b7280' };
    };

    const topTransactions = useMemo(() => {
        return [...filteredTransactions]
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
            .map(t => ({
                ...t,
                category: categories.find(c => c.uuid === t.categoryUuid)
            }));
    }, [filteredTransactions, categories]);

    function formatAmount(cents: number): string {
        const dollars = (cents / 100).toFixed(2);
        return dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    const formatDollars = (cents: number) => formatAmount(cents).split('.')[0];
    const formatCents = (cents: number) => formatAmount(cents).split('.')[1];

    function formatDate(dateStr: string): string {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 100;

    return (
        <View className="flex-1 bg-[#F6F8F6] dark:bg-[#030712]">
            <ScrollView contentContainerStyle={{ padding: 24, paddingTop: Platform.OS === 'web' ? 24 : 60, paddingBottom: 120 }}>
                <View className="flex-row items-center justify-between pb-4">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm">
                        <Feather name="arrow-left" size={20} color={isDarkMode ? '#FFFFFF' : '#111827'} />
                    </TouchableOpacity>
                </View>
                <View className="mb-6 mt-4">
                    <Text className="text-[11px] font-bold tracking-[0.15em] text-[#9CA3AF]">FINANCIAL OVERVIEW</Text>
                    <Text className="text-4xl font-black tracking-tight text-[#111827] dark:text-white mt-1">Analysis</Text>
                </View>

                {/* Range Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8" contentContainerStyle={{ paddingRight: 24 }}>
                    {ranges.map(range => (
                        <TouchableOpacity
                            key={range}
                            onPress={() => {
                                if (range === 'Custom') setShowCustomModal(true);
                                setSelectedRange(range);
                            }}
                            className={`px-4 py-2 rounded-full mr-3 ${selectedRange === range ? 'bg-[#5B6B7A]' : 'bg-gray-200 dark:bg-gray-800'}`}
                        >
                            <Text className={`font-semibold text-sm ${selectedRange === range ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                {range}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Spending Trend Card */}
                <View className="rounded-[32px] bg-white p-6 shadow-sm shadow-gray-200/50 dark:bg-gray-900 dark:shadow-none mb-8">
                    <View className="flex-row justify-between items-start mb-6">
                        <View>
                            <Text className="text-base font-bold text-[#111827] dark:text-white">Spending Trend</Text>
                            <Text className="text-xs font-medium text-[#9CA3AF] mt-1">
                                {selectedRange === 'This Month' ? `Daily activity for ${startDate.toLocaleDateString('en-US', { month: 'short' })}` : `Activity for selected range`}
                            </Text>
                        </View>
                        <Text className="text-xl font-black text-[#10B981]">
                            +{currencySymbol}{formatAmount(totalSpent)}
                        </Text>
                    </View>

                    <View className="w-full items-center justify-center">
                        {chartData.length > 0 ? (
                            <LineChart
                                data={chartData}
                                width={chartWidth}
                                height={150}
                                thickness={3}
                                color={isDarkMode ? '#60A5FA' : '#718096'}
                                hideDataPoints
                                hideYAxisText
                                hideRules
                                xAxisThickness={0}
                                yAxisThickness={0}
                                xAxisLabelsHeight={40}
                                xAxisLabelsVerticalShift={40}
                                spacing={(chartWidth - 20) / Math.max(chartData.length - 1, 1)}
                                maxValue={maxValue * 1.25}
                                curved
                                curvature={0.2}
                                isAnimated
                                initialSpacing={10}
                                endSpacing={10}
                                focusEnabled
                                showTextOnFocus
                                adjustToWidth
                                overflowTop={20}
                                overflowBottom={10}
                                textFontSize={10}
                                textColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                                pointerConfig={{
                                    pointerStripHeight: 150,
                                    pointerStripColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                                    pointerStripWidth: 2,
                                    pointerColor: isDarkMode ? '#60A5FA' : '#718096',
                                    radius: 6,
                                    pointerLabelWidth: 100,
                                    pointerLabelHeight: 45,
                                    activatePointersOnLongPress: false,
                                    autoAdjustPointerLabelPosition: true,
                                    pointerLabelComponent: (items: any) => {
                                        return (
                                            <View className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 items-center justify-center -ml-12 mt-2">
                                                <Text className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                                                    {items[0].tooltipLabel}
                                                </Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {currencySymbol}{(items[0].value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                </Text>
                                            </View>
                                        );
                                    },
                                }}
                            />
                        ) : (
                            <Text className="text-sm text-gray-400">No data for this range</Text>
                        )}
                    </View>
                </View>

                {/* Category Analysis */}
                <View className="flex-row items-center justify-between mb-5">
                    <Text className="text-lg font-bold text-[#111827] dark:text-white">Category Analysis</Text>
                    <TouchableOpacity onPress={() => { router.push({ pathname: '/(app)/spending-analysis', params: { range: selectedRange, start: startDate.toISOString(), end: endDate.toISOString() } }) }}>
                        <Text className="text-sm font-bold text-[#5B6B7A]">View All</Text>
                    </TouchableOpacity>
                </View>

                <View className="space-y-4">
                    {categorySpending.length > 0 ? categorySpending.map((item) => (
                        <View key={item.category!.uuid} className="rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm shadow-gray-200/30 dark:shadow-none mb-4">
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="flex-row items-center">
                                    <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? item.category!.themeBgDark : item.category!.themeBgLight }}>
                                        <CategoryIcon icon={item.category!.icon} iconType={item.category!.iconType} size={18} color={isDarkMode ? item.category!.themeFgDark : item.category!.themeFgLight} />
                                    </View>
                                    <View className="ml-3">
                                        <Text className="text-base font-bold text-[#111827] dark:text-white">{item.category!.name}</Text>
                                        <Text className="text-[11px] font-medium text-[#9CA3AF] mt-0.5">{item.count} Transactions</Text>
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
                                    <Text className="text-[10px] font-bold text-[#9CA3AF] mt-0.5">{item.pctOfTotal}% of total spend</Text>
                                </View>
                            </View>
                            <View className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                <View className="h-full rounded-full" style={{ width: `${item.pctOfTotal}%`, backgroundColor: isDarkMode ? item.category!.themeFgDark : item.category!.themeFgLight }} />
                            </View>
                        </View>
                    )) : (
                        <Text className="text-sm text-gray-500">No spending data.</Text>
                    )}
                </View>

                {/* Top Transactions */}
                <View className="mt-4 flex-row items-center justify-between mb-5">
                    <Text className="text-lg font-bold text-[#111827] dark:text-white">Top Transactions</Text>
                </View>

                {topTransactions.length > 0 ? (
                    <View className="space-y-4">
                        {topTransactions.map((item) => (
                            <View key={item.uuid} className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center flex-1 pr-4">
                                    <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                        <CategoryIcon icon={item.category?.icon || 'help-circle'} iconType={item.category?.iconType || 'feather'} size={20} color={isDarkMode ? (item.category?.themeFgDark || '#10B981') : (item.category?.themeFgLight || '#10B981')} />
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text className="text-[15px] font-semibold text-[#111827] dark:text-white" numberOfLines={1}>
                                            {item.note || item.category?.name || 'Transaction'}
                                        </Text>
                                        <Text className="text-[11px] font-medium text-[#9CA3AF] mt-1">
                                            {item.category?.name} • {formatDate(item.transactionDate)}
                                        </Text>
                                    </View>
                                </View>
                                <Text className="text-[15px] font-bold text-[#111827] dark:text-white whitespace-nowrap">
                                    -{currencySymbol}{formatAmount(item.amount)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text className="text-sm text-gray-500">No top transactions.</Text>
                )}
            </ScrollView>

            <Modal visible={showCustomModal} transparent animationType="fade">
                <View className="flex-1 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white dark:bg-gray-900 p-6 rounded-3xl w-full">
                        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Custom Range</Text>

                        <View className="space-y-4">
                            <View>
                                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Start Date</Text>
                                {Platform.OS === 'ios' ? (
                                    <DateTimePicker value={customStartDate} mode="date" display="default" onChange={(e, d) => d && setCustomStartDate(d)} />
                                ) : (
                                    <>
                                        <TouchableOpacity onPress={() => setShowStartPicker(true)} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                            <Text className="text-gray-900 dark:text-white">{customStartDate.toLocaleDateString()}</Text>
                                        </TouchableOpacity>
                                        {showStartPicker && <DateTimePicker value={customStartDate} mode="date" display="default" onChange={(e, d) => { setShowStartPicker(false); d && setCustomStartDate(d); }} />}
                                    </>
                                )}
                            </View>

                            <View>
                                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 mt-2">End Date</Text>
                                {Platform.OS === 'ios' ? (
                                    <DateTimePicker value={customEndDate} mode="date" display="default" onChange={(e, d) => d && setCustomEndDate(d)} />
                                ) : (
                                    <>
                                        <TouchableOpacity onPress={() => setShowEndPicker(true)} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                            <Text className="text-gray-900 dark:text-white">{customEndDate.toLocaleDateString()}</Text>
                                        </TouchableOpacity>
                                        {showEndPicker && <DateTimePicker value={customEndDate} mode="date" display="default" onChange={(e, d) => { setShowEndPicker(false); d && setCustomEndDate(d); }} />}
                                    </>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity onPress={() => setShowCustomModal(false)} className="mt-8 bg-[#10B981] p-4 rounded-xl items-center">
                            <Text className="text-white font-bold text-center text-base">Apply Custom Range</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
