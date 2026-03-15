import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useAppStore, Category } from '../../stores/useAppStore';
import { softDeleteCategory } from '../../lib/db';
import CategoryIcon from '../../components/CategoryIcon';
import { apiDelete } from '../../lib/api';
import { loadDataIntoStore } from '../../lib/sync';
import { useState, useMemo } from 'react';

export default function ManageCategoriesScreen() {
    const router = useRouter();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const categories = useAppStore((state) => state.categories);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCategories = useMemo(() => {
        if (!searchQuery) return categories;
        return categories.filter((c: Category) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [categories, searchQuery]);

    const handleDelete = (uuid: string, name: string) => {
        Alert.alert(
            "Delete Category",
            `Are you sure you want to delete "${name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: async () => {
                        try {
                            // Local soft delete
                            await softDeleteCategory(uuid);
                            await loadDataIntoStore();
                            // Server delete
                            try { await apiDelete(`/api/categories/${uuid}`); }
                            catch (e) { console.warn('Server delete will sync later'); }
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View className="flex-1 bg-white dark:bg-[#030712]">

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-16 pb-4 border-b border-gray-100 dark:border-gray-900">
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

                {/* Categories List */}
                {filteredCategories.length > 0 ? (
                    <View className="mt-8 space-y-6">
                        {filteredCategories.map((cat: Category) => (
                            <View key={cat.uuid} className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? cat.themeBgDark : cat.themeBgLight }}>
                                        <CategoryIcon icon={cat.icon} iconType={cat.iconType} size={24} color={isDarkMode ? cat.themeFgDark : cat.themeFgLight} />
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text className="text-base font-bold text-gray-900 dark:text-gray-100">{cat.name}</Text>
                                        <Text className="text-xs text-gray-500 dark:text-gray-400">{cat.type}</Text>
                                    </View>
                                </View>

                                {/* Actions */}
                                <View className="flex-row items-center ml-4 space-x-4">
                                    <TouchableOpacity onPress={() => handleDelete(cat.uuid, cat.name)}>
                                        <Feather name="trash-2" size={18} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="mt-16 items-center">
                        <Feather name="grid" size={48} color="#9CA3AF" />
                        <Text className="mt-4 text-base text-gray-400">No categories yet</Text>
                        <TouchableOpacity
                            className="mt-4 rounded-full bg-green-500 px-6 py-2"
                            onPress={() => router.push('/categories/add')}
                        >
                            <Text className="font-semibold text-white">Create One</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
