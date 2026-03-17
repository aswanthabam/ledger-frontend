import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../stores/useAppStore';
import { generateUUID, bulkInsertCategories } from '../lib/db';
import { apiPost } from '../lib/api';
import { loadDataIntoStore } from '../lib/sync';

const PRESET_CATEGORIES = [
    { name: 'Food & Drinks', icon: 'food', type: 'expense', themeBgLight: '#DCFCE7', themeBgDark: '#064E3B', themeFgLight: '#16A34A', themeFgDark: '#4ADE80' },
    { name: 'Transport', icon: 'bus', type: 'expense', themeBgLight: '#DBEAFE', themeBgDark: '#1E3A8A', themeFgLight: '#2563EB', themeFgDark: '#60A5FA' },
    { name: 'Shopping', icon: 'cart', type: 'expense', themeBgLight: '#F3E8FF', themeBgDark: '#581C87', themeFgLight: '#9333EA', themeFgDark: '#C084FC' },
    { name: 'Entertainment', icon: 'movie', type: 'expense', themeBgLight: '#FFEDD5', themeBgDark: '#7C2D12', themeFgLight: '#EA580C', themeFgDark: '#FB923C' },
    { name: 'Health', icon: 'heart', type: 'expense', themeBgLight: '#FEE2E2', themeBgDark: '#7F1D1D', themeFgLight: '#DC2626', themeFgDark: '#F87171' },
    { name: 'Rent', icon: 'home', type: 'expense', themeBgLight: '#E0E7FF', themeBgDark: '#312E81', themeFgLight: '#4338CA', themeFgDark: '#818CF8' },
    { name: 'Bills', icon: 'file-document', type: 'expense', themeBgLight: '#FEF3C7', themeBgDark: '#78350F', themeFgLight: '#D97706', themeFgDark: '#FBBF24' },
    { name: 'Salary', icon: 'cash', type: 'asset', themeBgLight: '#DCFCE7', themeBgDark: '#064E3B', themeFgLight: '#16A34A', themeFgDark: '#4ADE80' },
    { name: 'Investment', icon: 'chart-line', type: 'asset', themeBgLight: '#CFFAFE', themeBgDark: '#164E63', themeFgLight: '#0891B2', themeFgDark: '#22D3EE' },
    { name: 'Education', icon: 'school', type: 'expense', themeBgLight: '#FCE7F3', themeBgDark: '#831843', themeFgLight: '#DB2777', themeFgDark: '#F472B6' },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const [selectedIndices, setSelectedIndices] = useState<number[]>(PRESET_CATEGORIES.map((_, i) => i));
    const [loading, setLoading] = useState(false);

    const toggleSelection = (index: number) => {
        if (selectedIndices.includes(index)) {
            setSelectedIndices(selectedIndices.filter(i => i !== index));
        } else {
            setSelectedIndices([...selectedIndices, index]);
        }
    };

    const handleGetStarted = async () => {
        if (selectedIndices.length === 0) return;

        setLoading(true);
        try {
            const selectedCategories = selectedIndices.map(index => {
                const preset = PRESET_CATEGORIES[index];
                return {
                    ...preset,
                    uuid: generateUUID(),
                    iconType: 'material',
                };
            });

            // 1. Bulk insert into local DB
            await bulkInsertCategories(selectedCategories as any);

            // 2. Load into store
            await loadDataIntoStore();

            // 3. Optional: Push to API in background or individually (here we do individually for simplicity as we don't have bulk API yet)
            // But usually, sync will handle it. To be safe, let's try pushing them.
            try {
                for (const cat of selectedCategories) {
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

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#030712]">
            <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40, paddingBottom: 120 }}>
                <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome to Ledger!</Text>
                <Text className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                    Let's personalize your experience. Choose the categories you'd like to track.
                </Text>

                <View className="mt-10 flex-row flex-wrap justify-between" style={{ gap: 12 }}>
                    {PRESET_CATEGORIES.map((cat, index) => {
                        const isSelected = selectedIndices.includes(index);
                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => toggleSelection(index)}
                                style={{
                                    width: '48%',
                                    backgroundColor: isSelected 
                                        ? (isDarkMode ? cat.themeBgDark : cat.themeBgLight)
                                        : (isDarkMode ? '#111827' : '#F9FAFB'),
                                    borderColor: isSelected 
                                        ? (isDarkMode ? cat.themeFgDark : cat.themeFgLight)
                                        : 'transparent',
                                    borderWidth: 2,
                                }}
                                className="mb-4 items-center justify-center rounded-3xl p-6"
                            >
                                <View 
                                    className="h-12 w-12 items-center justify-center rounded-full"
                                    style={{ 
                                        backgroundColor: isDarkMode ? cat.themeBgDark : cat.themeBgLight,
                                        opacity: isSelected ? 1 : 0.5
                                    }}
                                >
                                    <MaterialCommunityIcons 
                                        name={cat.icon as any} 
                                        size={28} 
                                        color={isDarkMode ? cat.themeFgDark : cat.themeFgLight} 
                                    />
                                </View>
                                <Text 
                                    className="mt-3 text-center font-bold"
                                    style={{ 
                                        color: isSelected 
                                            ? (isDarkMode ? 'white' : 'black') 
                                            : (isDarkMode ? '#9CA3AF' : '#6B7280') 
                                    }}
                                >
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View className="absolute bottom-10 left-6 right-6">
                <TouchableOpacity
                    disabled={selectedIndices.length === 0 || loading}
                    onPress={handleGetStarted}
                    className={`items-center justify-center rounded-full py-5 shadow-lg ${selectedIndices.length === 0 ? 'bg-gray-300 dark:bg-gray-800' : 'bg-black dark:bg-white'}`}
                >
                    <Text className={`text-lg font-bold ${selectedIndices.length === 0 ? 'text-gray-500' : 'text-white dark:text-black'}`}>
                        {loading ? 'Setting things up...' : 'Get Started'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
