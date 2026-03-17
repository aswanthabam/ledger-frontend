import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
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
    const isDarkMode = useAppStore((state) => state.user === null); // Placeholder check, using dark mode from store is better
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
            style={{
                width: '31%',
                backgroundColor: isSelected 
                    ? (appDarkMode ? cat.themeBgDark : cat.themeBgLight)
                    : (appDarkMode ? '#111827' : '#F9FAFB'),
                borderColor: isSelected 
                    ? (appDarkMode ? cat.themeFgDark : cat.themeFgLight)
                    : 'transparent',
                borderWidth: 1.5,
            }}
            className="mb-3 items-center justify-center rounded-2xl p-3"
        >
            <View 
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ 
                    backgroundColor: appDarkMode ? cat.themeBgDark : cat.themeBgLight,
                    opacity: isSelected ? 1 : 0.5
                }}
            >
                <MaterialCommunityIcons 
                    name={cat.icon as any} 
                    size={20} 
                    color={appDarkMode ? cat.themeFgDark : cat.themeFgLight} 
                />
            </View>
            <Text 
                className="mt-2 text-center text-[11px] font-bold"
                numberOfLines={1}
                style={{ 
                    color: isSelected 
                        ? (appDarkMode ? 'white' : 'black') 
                        : (appDarkMode ? '#9CA3AF' : '#6B7280') 
                }}
            >
                {cat.name}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#030712]">
            <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40, paddingBottom: 150 }}>
                <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100">Quick Setup</Text>
                <Text className="mt-2 text-base text-gray-500 dark:text-gray-400">
                    Select categories you'd like to use. We've automatically added 'Others' for everything else.
                </Text>

                <View className="mt-8">
                    <Text className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Expense Categories</Text>
                    <View className="flex-row flex-wrap justify-start" style={{ gap: 8 }}>
                        {PRESET_EXPENSES.map((cat) => renderCategory(cat, selectedExpenses.includes(cat.name), () => toggleExpense(cat.name)))}
                    </View>
                </View>

                <View className="mt-8">
                    <Text className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Asset Categories</Text>
                    <View className="flex-row flex-wrap justify-start" style={{ gap: 8 }}>
                        {PRESET_ASSETS.map((cat) => renderCategory(cat, selectedAssets.includes(cat.name), () => toggleAsset(cat.name)))}
                    </View>
                </View>
            </ScrollView>

            <View className="absolute bottom-10 left-6 right-6">
                <TouchableOpacity
                    disabled={loading}
                    onPress={handleGetStarted}
                    className="items-center justify-center rounded-full py-5 bg-black dark:bg-white shadow-xl"
                >
                    <Text className="text-lg font-bold text-white dark:text-black">
                        {loading ? 'Setting up...' : 'Finish Setup'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
