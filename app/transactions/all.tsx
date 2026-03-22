import { View, Text, TouchableOpacity, SectionList, Platform, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useAppStore, Transaction, Category } from '../../stores/useAppStore';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { getWidgetData } from '../../widget';
import { SmallWidget } from '../../widget/components/SmallWidget';
import { MediumWidget } from '../../widget/components/MediumWidget';
import { useMemo, useState } from 'react';
import CategoryIcon from '../../components/CategoryIcon';
import { softDeleteTransaction } from '../../lib/db';
import { apiDelete } from '../../lib/api';
import { loadDataIntoStore } from '../../lib/sync';
import { Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type TimeRange = 'This Month' | 'Previous Month' | 'Last 6 Months' | 'Custom';

export default function AllTransactionsScreen() {
    const router = useRouter();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const currencySymbol = useAppStore((state) => state.currencySymbol);
    const transactions = useAppStore((state) => state.transactions);
    const categories = useAppStore((state) => state.categories);

    const [selectedTransaction, setSelectedTransaction] = useState<(Transaction & { category?: Category }) | null>(null);

    const [selectedRange, setSelectedRange] = useState<TimeRange>('This Month');
    const ranges: TimeRange[] = ['This Month', 'Previous Month', 'Last 6 Months', 'Custom'];

    const [customStartDate, setCustomStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);

    const { startDate, endDate } = useMemo(() => {
        const today = new Date();
        let start = new Date(today.getFullYear(), today.getMonth(), 1);
        let end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

        switch (selectedRange) {
            case 'This Month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'Previous Month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'Last 6 Months':
                start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
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
            const d = new Date(t.transactionDate);
            return d >= startDate && d <= endDate;
        });
    }, [transactions, startDate, endDate]);

    // Group transactions by date
    const sections = useMemo(() => {
        const groups: Record<string, { items: (Transaction & { category?: Category })[], total: number }> = {};
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        for (const t of filteredTransactions) {
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
    }, [filteredTransactions, categories]);

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

                            // Update widgets
                            if (Platform.OS === 'android') {
                                requestWidgetUpdate({
                                    widgetName: 'SmallWidget',
                                    renderWidget: async () => {
                                        const data = await getWidgetData();
                                        return <SmallWidget totalSpent={data.totalSpent} currencySymbol={data.currencySymbol} />;
                                    }
                                });
                                requestWidgetUpdate({
                                    widgetName: 'MediumWidget',
                                    renderWidget: async () => {
                                        const data = await getWidgetData();
                                        return (
                                            <MediumWidget
                                                totalSpent={data.totalSpent}
                                                spendPctChange={data.spendPctChange}
                                                totalInvested={data.totalInvested}
                                                investPctChange={data.investPctChange}
                                                categories={data.categoryStats}
                                                lastUpdated={data.lastUpdated}
                                                currencySymbol={data.currencySymbol}
                                            />
                                        );
                                    }
                                });
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
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedTransaction(item)}
                className="mb-6 flex-row items-center justify-between"
            >
                <View className="flex-row items-center flex-1 pr-4">
                    <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? (item.category?.themeBgDark || '#064E3B') : (item.category?.themeBgLight || '#D1FAE5') }}>
                        <CategoryIcon icon={item.category?.icon || 'circle'} iconType={item.category?.iconType} size={20} color={isDarkMode ? (item.category?.themeFgDark || '#34D399') : (item.category?.themeFgLight || '#059669')} />
                    </View>
                    <View className="ml-4 flex-1">
                        <Text className="text-[15px] font-semibold text-[#111827] dark:text-white" numberOfLines={1}>
                            {item.note || item.category?.name || 'Transaction'}
                        </Text>
                        <Text className="text-[11px] font-medium text-[#9CA3AF] mt-1">
                            {item.category?.name || ''}
                        </Text>
                    </View>
                </View>
                <Text className="text-[15px] font-bold text-[#111827] dark:text-white whitespace-nowrap">
                    {item.type === 'expense' ? '-' : '+'}{currencySymbol}{formatAmount(item.amount)}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-[#F9FAFB] dark:bg-[#030712]">

            {/* Header */}
            <View
                className="flex-row items-center justify-between px-6 pb-4"
                style={{ paddingTop: Platform.OS === 'web' ? 24 : 64 }}
            >
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <AntDesign name="arrow-left" size={24} color={isDarkMode ? 'white' : 'black'} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Transactions</Text>
                <View className="w-10" />
            </View>

            {/* Range Selector */}
            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6" contentContainerStyle={{ paddingRight: 48 }}>
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
            </View>

            <View className="px-6 flex-1 mt-1">
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

            {/* Transaction Detail Modal */}
            <Modal visible={!!selectedTransaction} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/50">
                    <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setSelectedTransaction(null)} />
                    <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-12 w-full shadow-lg">
                        {selectedTransaction && (
                            <>
                                <View className="items-center mb-6">
                                    <View className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 mb-6" />
                                    <View className="h-16 w-16 mb-4 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? (selectedTransaction.category?.themeBgDark || '#064E3B') : (selectedTransaction.category?.themeBgLight || '#D1FAE5') }}>
                                        <CategoryIcon icon={selectedTransaction.category?.icon || 'circle'} iconType={selectedTransaction.category?.iconType} size={32} color={isDarkMode ? (selectedTransaction.category?.themeFgDark || '#34D399') : (selectedTransaction.category?.themeFgLight || '#059669')} />
                                    </View>
                                    <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                                        {selectedTransaction.note || selectedTransaction.category?.name || 'Transaction'}
                                    </Text>
                                    <Text className={`mt-2 text-3xl font-black ${selectedTransaction.type === 'expense' ? 'text-gray-900 dark:text-white' : 'text-green-600 dark:text-green-400'}`}>
                                        {selectedTransaction.type === 'expense' ? '-' : '+'}{currencySymbol}{formatAmount(selectedTransaction.amount)}
                                    </Text>
                                </View>

                                <View className="space-y-4 mb-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</Text>
                                        <Text className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTransaction.category?.name || 'Uncategorized'}</Text>
                                    </View>
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</Text>
                                        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {new Date(selectedTransaction.transactionDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    {selectedTransaction.note ? (
                                        <View>
                                            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1">Notes</Text>
                                            <Text className="text-sm font-medium text-gray-900 dark:text-white">{selectedTransaction.note}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View className="flex-row justify-between">
                                    <TouchableOpacity
                                        onPress={() => {
                                            const t = selectedTransaction;
                                            setSelectedTransaction(null);
                                            router.push({ pathname: '/transactions/add', params: { editUuid: t.uuid } });
                                        }}
                                        className="flex-1 flex-row items-center justify-center rounded-2xl bg-blue-50 py-4 dark:bg-blue-900/20 mr-2"
                                    >
                                        <Feather name="edit-2" size={18} color="#3B82F6" />
                                        <Text className="ml-2 text-base font-bold text-blue-600 dark:text-blue-400">Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            const t = selectedTransaction;
                                            setSelectedTransaction(null);
                                            handleDelete(t.uuid, t.note);
                                        }}
                                        className="flex-1 flex-row items-center justify-center rounded-2xl bg-red-50 py-4 dark:bg-red-900/20 ml-2"
                                    >
                                        <Feather name="trash-2" size={18} color="#EF4444" />
                                        <Text className="ml-2 text-base font-bold text-red-600 dark:text-red-400">Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
