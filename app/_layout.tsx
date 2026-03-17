import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TextInput } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import { initDB } from '../lib/db';
import '../global.css';

// Set global default font for Text and TextInput
interface TextWithDefaultProps extends React.FC<any> {
    defaultProps?: { style?: any };
}
((Text as unknown) as TextWithDefaultProps).defaultProps = ((Text as unknown) as TextWithDefaultProps).defaultProps || {};
((Text as unknown) as TextWithDefaultProps).defaultProps!.style = { fontFamily: 'Inter_400Regular' };

((TextInput as unknown) as TextWithDefaultProps).defaultProps = ((TextInput as unknown) as TextWithDefaultProps).defaultProps || {};
((TextInput as unknown) as TextWithDefaultProps).defaultProps!.style = { fontFamily: 'Inter_400Regular' };

export default function RootLayout() {
    const [dbReady, setDbReady] = useState(false);
    
    let [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        Inter_900Black,
    });

    useEffect(() => {
        async function setup() {
            try {
                await initDB();
                setDbReady(true);
            } catch (e) {
                console.error('Failed to init DB', e);
            }
        }
        setup();
    }, []);

    if (!dbReady || !fontsLoaded) {
        return (
            <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
                <ActivityIndicator size="small" color="#10B981" />
            </View>
        );
    }

    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(app)" />
                <Stack.Screen name="index" />
                <Stack.Screen name="splash" />
                <Stack.Screen name="sign-in" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="categories/add" />
                <Stack.Screen name="categories/icons" />
                <Stack.Screen name="categories/manage" />
                <Stack.Screen name="categories/select" />
                <Stack.Screen name="transactions/add" />
                <Stack.Screen name="transactions/all" />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}
