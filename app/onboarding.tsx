import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../stores/useAppStore';
import { generateUUID, bulkInsertCategories } from '../lib/db';
import { apiPost } from '../lib/api';
import { loadDataIntoStore } from '../lib/sync';

const PRESET_EXPENSES = [
    { name: 'Food', icon: 'food', type: 'expense', themeBgLight: '#DCFCE7', themeBgDark: '#064E3B', themeFgLight: '#16A34A', themeFgDark: '#4ADE80' },
    { name: 'Travel', icon: 'bus', type: 'expense', themeBgLight: '#DBEAFE', themeBgDark: '#1E3A8A', themeFgLight: '#2563EB', themeFgDark: '#60A5FA' },
    { name: 'Entertainment', icon: 'movie', type: 'expense', themeBgLight: '#FFEDD5', themeBgDark: '#7C2D12', themeFgLight: '#EA580C', themeFgDark: '#FB923C' },
    { name: 'Health', icon: 'heart', type: 'expense', themeBgLight: '#FEE2E2', themeBgDark: '#7F1D1D', themeFgLight: '#DC2626', themeFgDark: '#F87171' },
    { name: 'Shopping', icon: 'cart', type: 'expense', themeBgLight: '#F3E8FF', themeBgDark: '#581C87', themeFgLight: '#9333EA', themeFgDark: '#C084FC' },
];

const PRESET_ASSETS = [
    { name: 'Stocks', icon: 'chart-line', type: 'asset', themeBgLight: '#CFFAFE', themeBgDark: '#164E63', themeFgLight: '#0891B2', themeFgDark: '#22D3EE' },
    { name: 'Mutual Fund', icon: 'hand-coin', type: 'asset', themeBgLight: '#E0E7FF', themeBgDark: '#312E81', themeFgLight: '#4338CA', themeFgDark: '#818CF8' },
    { name: 'Bank Account', icon: 'bank', type: 'asset', themeBgLight: '#CCFBF1', themeBgDark: '#134E4A', themeFgLight: '#0D9488', themeFgDark: '#2DD4BF' },
    { name: 'FD', icon: 'safe', type: 'asset', themeBgLight: '#FEF3C7', themeBgDark: '#78350F', themeFgLight: '#D97706', themeFgDark: '#FBBF24' },
];

const OTHERS_CATEGORY = { name: 'Others', icon: 'dots-horizontal', type: 'expense', themeBgLight: '#F3F4F6', themeBgDark: '#374151', themeFgLight: '#4B5563', themeFgDark: '#D1D5DB' };

export default function OnboardingScreen() {
    const router = useRouter();
    const appDarkMode = useAppStore((state) => state.isDarkMode);
    const [selectedExpenses, setSelectedExpenses] = useState<string[]>(PRESET_EXPENSES.map(e => e.name));
    const [selectedAssets, setSelectedAssets] = useState<string[]>(PRESET_ASSETS.map(a => a.name));
    const [loading, setLoading] = useState(false);

    const toggleExpense = (name: string) => {
        setSelectedExpenses(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    };

    const toggleAsset = (name: string) => {
        setSelectedAssets(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    };

    const handleGetStarted = async () => {
        setLoading(true);
        try {
            const selected = [
                ...PRESET_EXPENSES.filter(e => selectedExpenses.includes(e.name)),
                ...PRESET_ASSETS.filter(a => selectedAssets.includes(a.name)),
                OTHERS_CATEGORY
            ];

            const categoriesToCreate = selected.map(preset => ({
                ...preset,
                uuid: generateUUID(),
                iconType: 'material',
            }));

            // 1. Bulk insert into local DB
            await bulkInsertCategories(categoriesToCreate as any);

            // 2. Load into store
            await loadDataIntoStore();

            // 3. Push to API in background (sequential for now as sync doesn't handle full push yet)
            try {
                for (const cat of categoriesToCreate) {
                    await apiPost('/api/categories', {
                        uuid: cat.uuid,
                        name: cat.name,
                        type: cat.type,
                        icon: cat.icon,
                        iconType: 'material',
                        theme: {
                            bgLight: cat.themeBgLight,
                            bgDark: cat.themeBgDark,
                            fgLight: cat.themeFgLight,
                            fgDark: cat.themeFgDark,
                        },
                        isDefault: false,
                    });
                }
            } catch (e) {
                console.warn('API push failed during onboarding, sync will handle it:', e);
            }

            // 4. Redirect to app
            router.replace('/(app)');
        } catch (error) {
            console.error('Failed to complete onboarding:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderCategory = (cat: any, isSelected: boolean, onPress: () => void) => (
        <TouchableOpacity
            key={cat.name}
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                width: '48%',
                aspectRatio: 0.9,
                backgroundColor: isSelected 
                    ? (appDarkMode ? cat.themeBgDark : cat.themeBgLight)
                    : (appDarkMode ? '#111827' : '#FFFFFF'),
                borderColor: isSelected 
                    ? (appDarkMode ? cat.themeFgDark : cat.themeFgLight)
                    : (appDarkMode ? '#374151' : '#F1F5F9'),
                borderWidth: isSelected ? 2 : 1,
            }}
            className="mb-4 rounded-[24px] p-5 justify-between relative"
        >
            <View className="flex-row justify-between items-start">
                <View 
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ 
                        backgroundColor: isSelected 
                            ? (appDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)') 
                            : (appDarkMode ? '#1F2937' : '#F8FAFC')
                    }}
                >
                    <MaterialCommunityIcons 
                        name={cat.icon as any} 
                        size={24} 
                        color={isSelected 
                            ? (appDarkMode ? cat.themeFgDark : cat.themeFgLight) 
                            : (appDarkMode ? '#9CA3AF' : '#94A3B8')} 
                    />
                </View>
                {isSelected && (
                    <MaterialCommunityIcons 
                        name="check-circle" 
                        size={22} 
                        color={appDarkMode ? cat.themeFgDark : cat.themeFgLight} 
                    />
                )}
            </View>
            <Text 
                className="text-lg font-bold"
                style={{ 
                    color: isSelected 
                        ? (appDarkMode ? 'white' : cat.themeFgLight) 
                        : (appDarkMode ? '#9CA3AF' : '#64748B') 
                }}
            >
                {cat.name}
            </Text>
        </TouchableOpacity>
    );

    const renderAssetCategory = (cat: any, isSelected: boolean, onPress: () => void) => (
        <TouchableOpacity
            key={cat.name}
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                backgroundColor: isSelected 
                    ? (appDarkMode ? cat.themeBgDark : cat.themeBgLight)
                    : (appDarkMode ? '#111827' : '#F1F5F9'),
                borderColor: isSelected 
                    ? (appDarkMode ? cat.themeFgDark : cat.themeFgLight)
                    : 'transparent',
                borderWidth: isSelected ? 1.5 : 0,
            }}
            className="flex-row items-center px-5 py-3 rounded-full mr-2 mb-3"
        >
            <MaterialCommunityIcons 
                name={cat.icon as any} 
                size={20} 
                color={isSelected 
                    ? (appDarkMode ? cat.themeFgDark : cat.themeFgLight) 
                    : (appDarkMode ? '#9CA3AF' : '#475569')} 
                style={{ marginRight: 8 }}
            />
            <Text 
                className="text-[15px] font-semibold"
                style={{ 
                    color: isSelected 
                        ? (appDarkMode ? 'white' : cat.themeFgLight) 
                        : (appDarkMode ? '#D1D5DB' : '#1E293B') 
                }}
            >
                {cat.name}
            </Text>
            {isSelected && (
                <MaterialCommunityIcons 
                    name="check" 
                    size={16} 
                    color={appDarkMode ? cat.themeFgDark : cat.themeFgLight} 
                    style={{ marginLeft: 6 }}
                />
            )}
        </TouchableOpacity>
    );

    const SectionHeader = ({ title, badge }: { title: string, badge: string }) => (
        <View className="flex-row items-center justify-between mb-5">
            <Text className="text-[11px] font-black uppercase tracking-[2px] text-gray-400 dark:text-gray-500">{title}</Text>
            <View className="bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{badge}</Text>
            </View>
        </View>
    );

    return (
        <View 
            className="flex-1 bg-[#F8FAFC] dark:bg-[#030712]"
            style={{ paddingTop: Platform.OS === 'web' ? 24 : 48 }}
        >
            <View className="px-6 pb-2 flex-row justify-end">
                <TouchableOpacity onPress={() => router.replace('/(app)')}>
                    <View className="flex-row items-center">
                        <Text className="text-gray-500 dark:text-gray-400 font-semibold mr-1">Skip</Text>
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#9CA3AF" />
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ padding: 24, paddingTop: 10, paddingBottom: 150 }}
            >
                <Text className="text-[40px] font-bold text-gray-900 dark:text-gray-100 leading-[48px]">Tailor Your Tracking</Text>
                <Text className="mt-4 text-[17px] text-gray-500 dark:text-gray-400 leading-6 font-medium">
                    Select the categories you'd like to start with. You can always add more later.
                </Text>

                <View className="mt-10">
                    <SectionHeader title="Expense Categories" badge="01" />
                    <View className="flex-row flex-wrap justify-between">
                        {PRESET_EXPENSES.map((cat) => renderCategory(cat, selectedExpenses.includes(cat.name), () => toggleExpense(cat.name)))}
                    </View>
                </View>

                <View className="mt-8">
                    <SectionHeader title="Asset Categories" badge="02" />
                    <View className="flex-row flex-wrap">
                        {PRESET_ASSETS.map((cat) => renderAssetCategory(cat, selectedAssets.includes(cat.name), () => toggleAsset(cat.name)))}
                    </View>
                </View>
            </ScrollView>

            <View className="absolute bottom-10 left-6 right-6">
                <TouchableOpacity
                    disabled={loading}
                    onPress={handleGetStarted}
                    activeOpacity={0.8}
                    className="flex-row items-center justify-center rounded-[24px] py-6 bg-[#0F172A] dark:bg-white shadow-2xl"
                >
                    <Text className="text-lg font-black text-white dark:text-[#0F172A] mr-2">
                        {loading ? 'Setting up...' : 'Start Tracking'}
                    </Text>
                    {!loading && <MaterialCommunityIcons name="arrow-right" size={24} color={appDarkMode ? '#0F172A' : '#FFFFFF'} />}
                </TouchableOpacity>
            </View>
        </View>
    );
}
