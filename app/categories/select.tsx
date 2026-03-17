import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useAppStore, Category } from '../../stores/useAppStore';
import { useState, useMemo } from 'react';
import CategoryIcon from '../../components/CategoryIcon';

export default function SelectCategoryScreen() {
    const router = useRouter();
    const { type: passedType } = useLocalSearchParams<{ type?: string }>();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const categories = useAppStore((state) => state.categories);

    // Use the passed type filter, default to showing all
    const filterType = (passedType === 'expense' || passedType === 'asset') ? passedType : null;

    const [searchQuery, setSearchQuery] = useState('');

    const filteredCategories = useMemo(() => {
        let cats = categories;
        if (filterType) {
            cats = cats.filter((c: Category) => c.type === filterType);
        }
        if (searchQuery) {
            cats = cats.filter((c: Category) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return cats;
    }, [categories, filterType, searchQuery]);

    const handleSelect = (uuid: string) => {
        // Store the selected category UUID in Zustand for the Add Transaction screen to pick up
        useAppStore.getState().setPickedCategory(uuid);
        router.back();
    };

    const sectionTitle = filterType
        ? `${filterType.toUpperCase()} CATEGORIES`
        : 'ALL CATEGORIES';

    return (
        <View className="flex-1 bg-white dark:bg-[#030712]">

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <AntDesign name="arrow-left" size={24} color={isDarkMode ? 'white' : 'black'} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Select Category
                </Text>
                <View className="w-10" />
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                {/* Search */}
                <View className="flex-row items-center rounded-full bg-gray-50 px-4 dark:bg-gray-900/50">
                    <Feather name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        className="ml-3 flex-1 py-3 text-base text-gray-900 dark:text-gray-100"
                        placeholder="Search categories..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Section Label */}
                <Text className="mt-8 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {sectionTitle}
                </Text>

                {/* Categories List */}
                {filteredCategories.length > 0 ? (
                    <View className="mt-6">
                        {filteredCategories.map((cat: Category) => (
                            <TouchableOpacity
                                key={cat.uuid}
                                className="mb-5 flex-row items-center justify-between"
                                onPress={() => handleSelect(cat.uuid)}
                            >
                                <View className="flex-row items-center flex-1">
                                    <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? cat.themeBgDark : cat.themeBgLight }}>
                                        <CategoryIcon icon={cat.icon} iconType={cat.iconType} size={24} color={isDarkMode ? cat.themeFgDark : cat.themeFgLight} />
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text className="text-base font-bold text-gray-900 dark:text-gray-100">{cat.name}</Text>
                                    </View>
                                </View>
                                <Feather name="chevron-right" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View className="mt-16 items-center">
                        <Feather name="grid" size={48} color="#9CA3AF" />
                        <Text className="mt-4 text-base text-gray-400">
                            No {filterType || ''} categories found
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
