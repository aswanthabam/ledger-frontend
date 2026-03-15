import { View, Platform } from 'react-native';
import { ReactNode } from 'react';

interface ResponsiveWrapperProps {
    children: ReactNode;
}

export default function ResponsiveWrapper({ children }: ResponsiveWrapperProps) {
    if (Platform.OS === 'web') {
        return (
            <View className="flex-1 bg-gray-100 dark:bg-black items-center">
                {/* Constrain max width for desktop web to simulate mobile experience */}
                <View className="w-full max-w-[480px] flex-1 bg-white dark:bg-[#030712] shadow-2xl overflow-hidden relative">
                    {children}
                </View>
            </View>
        );
    }

    // Native stays as is
    return <View className="flex-1 bg-white dark:bg-[#030712]">{children}</View>;
}
