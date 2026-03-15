import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useAppStore, Category } from '../../stores/useAppStore';
import { useState, useMemo } from 'react';
import CategoryIcon from '../../components/CategoryIcon';

export default function SelectCategoryScreen() {
    const router = useRouter();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const categories = useAppStore((state) => state.categories);

    const [type, setType] = useState<'expense' | 'asset'>('expense');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCategories = useMemo(() => {
        let cats = categories.filter((c: Category) => c.type === type);
        if (searchQuery) {
            cats = cats.filter((c: Category) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return cats;
    }, [categories, type, searchQuery]);

    const handleSelect = (uuid: string) => {
        // Pass selection back — the add transaction screen will read from params
        router.back();
    };

    return (
        <View className="flex-1 bg-white dark:bg-[#030712]">

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <AntDesign name="arrow-left" size={24} color={isDarkMode ? 'white' : 'black'} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">All Categories</Text>
                <TouchableOpacity
                    className="h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20"
                    onPress={() => router.push('/categories/add')}
                >
                    <AntDesign name="plus" size={20} color="#10B981" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                {/* Search */}
                <View className="flex-row items-center rounded-full bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
                    <Feather name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        className="ml-3 flex-1 text-base text-gray-900 dark:text-gray-100"
                        placeholder="Search your categories..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Type Filter */}
                <View className="mt-6 flex-row border-b border-gray-100 dark:border-gray-900">
                    <TouchableOpacity
                        className={`pb-4 pr-6 ${type === 'expense' ? 'border-b-2 border-green-500' : ''}`}
                        onPress={() => setType('expense')}
                    >
                        <Text className={`font-semibold ${type === 'expense' ? 'text-green-600 dark:text-green-500' : 'text-gray-400'}`}>
                            Expense
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`pb-4 px-6 ${type === 'asset' ? 'border-b-2 border-green-500' : ''}`}
                        onPress={() => setType('asset')}
                    >
                        <Text className={`font-semibold ${type === 'asset' ? 'text-green-600 dark:text-green-500' : 'text-gray-400'}`}>
                            Asset
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text className="mt-8 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {type.toUpperCase()} CATEGORIES
                </Text>

                {/* Categories List */}
                {filteredCategories.length > 0 ? (
                    <View className="mt-6 space-y-6">
                        {filteredCategories.map((cat: Category) => (
                            <TouchableOpacity
                                key={cat.uuid}
                                className="flex-row items-center justify-between"
                                onPress={() => handleSelect(cat.uuid)}
                            >
                                <View className="flex-row items-center flex-1">
                                    <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? cat.themeBgDark : cat.themeBgLight }}>
                                        <CategoryIcon icon={cat.icon} iconType={cat.iconType} size={24} color={isDarkMode ? cat.themeFgDark : cat.themeFgLight} />
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text className="text-base font-bold text-gray-900 dark:text-gray-100">{cat.name}</Text>
                                        <Text className="text-xs text-gray-500 dark:text-gray-400">{cat.type}</Text>
                                    </View>
                                </View>
                                <Feather name="chevron-right" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View className="mt-16 items-center">
                        <Feather name="grid" size={48} color="#9CA3AF" />
                        <Text className="mt-4 text-base text-gray-400">No {type} categories</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
