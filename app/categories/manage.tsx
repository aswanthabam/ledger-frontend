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

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
                {/* Search */}
                <View className="flex-row items-center rounded-full bg-gray-50 px-4 dark:bg-gray-900/50">
                    <Feather name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        className="ml-3 flex-1 py-3 text-base text-gray-900 dark:text-gray-100"
                        placeholder="Search your categories..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Type Tabs */}
                <View className="mt-6 flex-row border-b border-gray-100 dark:border-gray-800">
                    <TouchableOpacity
                        className="pb-4 pr-6"
                        style={type === 'expense' ? { borderBottomWidth: 2, borderBottomColor: '#10B981' } : undefined}
                        onPress={() => setType('expense')}
                    >
                        <Text
                            className="font-semibold"
                            style={{ color: type === 'expense' ? '#10B981' : '#9CA3AF' }}
                        >
                            Expense
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="pb-4 px-6"
                        style={type === 'asset' ? { borderBottomWidth: 2, borderBottomColor: '#10B981' } : undefined}
                        onPress={() => setType('asset')}
                    >
                        <Text
                            className="font-semibold"
                            style={{ color: type === 'asset' ? '#10B981' : '#9CA3AF' }}
                        >
                            Asset
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Section Label */}
                <Text className="mt-8 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {type.toUpperCase()} CATEGORIES
                </Text>

                {/* Categories List */}
                {filteredCategories.length > 0 ? (
                    <View className="mt-6">
                        {filteredCategories.map((cat: Category) => (
                            <View key={cat.uuid} className="mb-5 flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? cat.themeBgDark : cat.themeBgLight }}>
                                        <CategoryIcon icon={cat.icon} iconType={cat.iconType} size={24} color={isDarkMode ? cat.themeFgDark : cat.themeFgLight} />
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text className="text-base font-bold text-gray-900 dark:text-gray-100">{cat.name}</Text>
                                    </View>
                                </View>

                                {/* Actions */}
                                <View className="flex-row items-center">
                                    <TouchableOpacity
                                        className="p-2"
                                        onPress={() => router.push({ pathname: '/categories/add', params: { editUuid: cat.uuid } })}
                                    >
                                        <Feather name="edit-2" size={18} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="p-2 ml-2"
                                        onPress={() => handleDelete(cat.uuid, cat.name)}
                                    >
                                        <Feather name="trash-2" size={18} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="mt-16 items-center">
                        <Feather name="grid" size={48} color="#9CA3AF" />
                        <Text className="mt-4 text-base text-gray-400">No {type} categories</Text>
                        <TouchableOpacity
                            className="mt-4 rounded-full bg-green-500 px-6 py-2"
                            onPress={() => router.push('/categories/add')}
                        >
                            <Text className="font-semibold text-white">Create One</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Floating Add Button */}
            <TouchableOpacity
                className="absolute bottom-8 right-6 h-16 w-16 items-center justify-center rounded-full bg-[#10B981] shadow-lg"
                style={{ elevation: 8, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                onPress={() => router.push('/categories/add')}
            >
                <AntDesign name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}
