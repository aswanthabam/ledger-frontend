import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../../stores/useAppStore';
import { generateUUID, insertCategory } from '../../lib/db';
import { apiPost } from '../../lib/api';
import { loadDataIntoStore } from '../../lib/sync';
import { QUICK_PICK_ICONS } from '../../lib/icons';

const COLORS = [
    { bgLight: '#D1FAE5', bgDark: '#064E3B', fgLight: '#059669', fgDark: '#34D399', value: 'green' },
    { bgLight: '#DBEAFE', bgDark: '#1E3A8A', fgLight: '#2563EB', fgDark: '#60A5FA', value: 'blue' },
    { bgLight: '#F3E8FF', bgDark: '#581C87', fgLight: '#9333EA', fgDark: '#C084FC', value: 'purple' },
    { bgLight: '#FFEDD5', bgDark: '#7C2D12', fgLight: '#EA580C', fgDark: '#FB923C', value: 'orange' },
    { bgLight: '#FEE2E2', bgDark: '#7F1D1D', fgLight: '#DC2626', fgDark: '#F87171', value: 'red' },
    { bgLight: '#FCE7F3', bgDark: '#831843', fgLight: '#DB2777', fgDark: '#F472B6', value: 'pink' },
    { bgLight: '#CCFBF1', bgDark: '#134E4A', fgLight: '#0D9488', fgDark: '#2DD4BF', value: 'teal' },
];

export default function AddCategoryScreen() {
    const router = useRouter();
    const pickedIcon = useAppStore((state) => state.pickedIcon);
    const setPickedIcon = useAppStore((state) => state.setPickedIcon);

    const [name, setName] = useState('');
    const [type, setType] = useState<'expense' | 'asset'>('expense');
    const [selectedIcon, setSelectedIcon] = useState(QUICK_PICK_ICONS[0]);
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [submitting, setSubmitting] = useState(false);

    const isDarkMode = useAppStore((state) => state.isDarkMode);

    // Receive icon selection from the icon picker page via store
    useEffect(() => {
        if (pickedIcon) {
            setSelectedIcon(pickedIcon);
            setPickedIcon(null); // Clear it after consuming
        }
    }, [pickedIcon]);

    async function handleCreate() {
        if (!name.trim()) {
            Alert.alert('Missing Name', 'Please enter a category name.');
            return;
        }

        setSubmitting(true);
        const uuid = generateUUID();

        // Local DB uses flat theme fields
        const localCatData = {
            uuid, name: name.trim(), type, icon: selectedIcon, iconType: 'material',
            themeBgLight: selectedColor.bgLight, themeBgDark: selectedColor.bgDark,
            themeFgLight: selectedColor.fgLight, themeFgDark: selectedColor.fgDark,
        };

        // API uses nested theme object + boolean fields
        const apiCatData = {
            uuid, name: name.trim(), type, icon: selectedIcon, iconType: 'material',
            theme: {
                bgLight: selectedColor.bgLight,
                bgDark: selectedColor.bgDark,
                fgLight: selectedColor.fgLight,
                fgDark: selectedColor.fgDark,
            },
            isDefault: false,
        };

        try {
            console.info(localCatData);
            await insertCategory(localCatData);
            console.info("2");
            await loadDataIntoStore();
            console.info("3");

            try {
                await apiPost('/api/categories', apiCatData);
            } catch (e) {
                console.warn('Server push failed, will sync later:', e);
            }

            router.back();
        } catch (e: any) {
            console.error('Failed to create category:', e);
            Alert.alert('Error', e.message || 'Failed to create category.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white dark:bg-[#030712]"
        >
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <AntDesign name="arrow-left" size={24} color={isDarkMode ? 'white' : 'black'} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Category</Text>
                <View className="w-10" />
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 100 }}>

                {/* Preview */}
                <View className="items-center mb-4">
                    <View
                        className="h-20 w-20 items-center justify-center rounded-full"
                        style={{ backgroundColor: isDarkMode ? selectedColor.bgDark : selectedColor.bgLight }}
                    >
                        <MaterialCommunityIcons
                            name={selectedIcon as any}
                            size={36}
                            color={isDarkMode ? selectedColor.fgDark : selectedColor.fgLight}
                        />
                    </View>
                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {name.trim() || 'New Category'}
                    </Text>
                </View>

                {/* Name */}
                <View>
                    <Text className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">Category Name</Text>
                    <View className="mt-4 rounded-3xl bg-gray-50 px-6 py-4 dark:bg-gray-900/50">
                        <TextInput
                            className="text-lg text-gray-900 dark:text-gray-100"
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Groceries"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Type */}
                <View className="mt-8">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">Category Type</Text>
                    <View className="mt-4 flex-row rounded-full bg-gray-50 p-1 dark:bg-gray-900/50">
                        <TouchableOpacity
                            className={`flex-1 items-center justify-center rounded-full py-3 ${type === 'expense' ? 'bg-white shadow-sm dark:bg-gray-800' : ''}`}
                            onPress={() => setType('expense')}
                        >
                            <Text className={`font-semibold ${type === 'expense' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 items-center justify-center rounded-full py-3 ${type === 'asset' ? 'bg-white shadow-sm dark:bg-gray-800' : ''}`}
                            onPress={() => setType('asset')}
                        >
                            <Text className={`font-semibold ${type === 'asset' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>Asset</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Icon Selection */}
                <View className="mt-10">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">Select Icon</Text>
                        <TouchableOpacity
                            className="rounded-full bg-green-50 px-3 py-1 dark:bg-green-900/30"
                            onPress={() => router.push('/categories/icons')}
                        >
                            <Text className="text-xs font-bold text-green-600 dark:text-green-500">View All</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mt-6 flex-row flex-wrap gap-y-4" style={{ gap: 12 }}>
                        {QUICK_PICK_ICONS.slice(0, 12).map((icon) => (
                            <TouchableOpacity
                                key={icon}
                                onPress={() => setSelectedIcon(icon)}
                                // Layout stays in className
                                className="h-14 w-14 items-center justify-center rounded-2xl"
                                // Conditional logic stays in standard React Native styles
                                style={{
                                    backgroundColor: selectedIcon === icon
                                        ? '#10B981' // Green-500
                                        : (isDarkMode ? 'rgba(17, 24, 39, 0.5)' : '#F9FAFB')
                                }}
                            >
                                <MaterialCommunityIcons
                                    name={icon as any}
                                    size={26}
                                    color={selectedIcon === icon ? 'white' : isDarkMode ? '#D1D5DB' : '#374151'}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Color Theme */}
                <View className="mt-12">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">Color Theme</Text>
                    <View className="mt-6 flex-row flex-wrap gap-4">
                        {COLORS.map((c) => (
                            <TouchableOpacity
                                key={c.value}
                                onPress={() => setSelectedColor(c)}
                                className="h-12 w-12 rounded-full items-center justify-center"
                                style={{
                                    backgroundColor: c.fgLight,
                                    borderWidth: selectedColor.value === c.value ? 4 : 0,
                                    borderColor: c.bgLight,
                                }}
                            />
                        ))}
                    </View>
                </View>

            </ScrollView>

            {/* Submit */}
            <View className="absolute bottom-10 left-6 right-6">
                <TouchableOpacity
                    className="items-center justify-center rounded-full bg-black py-4 shadow-sm dark:bg-white"
                    onPress={handleCreate}
                    disabled={submitting}
                >
                    <Text className="text-lg font-bold text-white dark:text-black">
                        {submitting ? 'Creating...' : 'Create Category'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
