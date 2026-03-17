import { View, Text, TouchableOpacity, TextInput, FlatList, SectionList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../../stores/useAppStore';
import { useState, useMemo } from 'react';
import { ICON_SECTIONS, ALL_ICONS } from '../../lib/icons';

export default function IconPickerScreen() {
    const router = useRouter();
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const setPickedIcon = useAppStore((state) => state.setPickedIcon);
    const [searchQuery, setSearchQuery] = useState('');

    // When searching, show a flat filtered list; otherwise show grouped sections
    const filteredIcons = useMemo(() => {
        if (!searchQuery) return null;
        return ALL_ICONS.filter((icon) =>
            icon.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    function handleSelect(icon: string) {
        setPickedIcon(icon);
        router.back();
    }

    const renderIcon = (icon: string) => (
        <TouchableOpacity
            key={icon}
            className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-900/50"
            style={{ width: '22%', aspectRatio: 1.3, margin: '1.5%' }}
            onPress={() => handleSelect(icon)}
        >
            <MaterialCommunityIcons
                name={icon as any}
                size={28}
                color={isDarkMode ? '#D1D5DB' : '#374151'}
            />
            <Text className="mt-1 text-center text-[9px] text-gray-500 dark:text-gray-400" numberOfLines={1}>
                {icon.replace(/-/g, ' ')}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white dark:bg-[#030712]">

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-16 pb-4 border-b border-gray-100 dark:border-gray-900">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <AntDesign name="arrow-left" size={24} color={isDarkMode ? 'white' : 'black'} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Select Icon</Text>
                <View className="w-10" />
            </View>

            {/* Search Bar */}
            <View className="mx-6 mt-4 flex-row items-center rounded-full bg-gray-50 px-4 dark:bg-gray-900/50">
                <MaterialCommunityIcons name="magnify" size={18} color="#9CA3AF" />
                <TextInput
                    className="ml-3 flex-1 text-base text-gray-900 dark:text-gray-100"
                    placeholder="Search icons..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <AntDesign name="close" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Icon Grid */}
            {filteredIcons ? (
                // Search results: flat grid
                <FlatList
                    data={filteredIcons}
                    numColumns={4}
                    keyExtractor={(item) => item}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
                    renderItem={({ item }) => renderIcon(item)}
                    ListEmptyComponent={
                        <View className="mt-16 items-center">
                            <MaterialCommunityIcons name="magnify-close" size={48} color="#9CA3AF" />
                            <Text className="mt-4 text-base text-gray-400">No icons match "{searchQuery}"</Text>
                        </View>
                    }
                />
            ) : (
                // Grouped sections
                <SectionList
                    sections={ICON_SECTIONS.map((s) => ({ title: s.title, data: [s.icons] }))}
                    keyExtractor={(_, index) => String(index)}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                    renderSectionHeader={({ section: { title } }) => (
                        <Text className="mt-6 mb-3 px-2 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {title}
                        </Text>
                    )}
                    renderItem={({ item: icons }) => (
                        <View className="flex-row flex-wrap items-start">
                            {icons.map((icon: string) => renderIcon(icon))}
                        </View>
                    )}
                />
            )}
        </View>
    );
}
