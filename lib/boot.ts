import * as SecureStore from './secure-store';
import { useAppStore } from '../stores/useAppStore';
import { Appearance, Platform } from 'react-native';
import { runSync, loadDataIntoStore } from './sync';
import { logger } from './logger';

/**
 * bootApp performs all essential startup logic:
 * 1. Restores theme from storage or system preference.
 * 2. Restores user session and profile from SecureStore.
 * 3. Populates the Zustand store with local database data.
 * 4. Triggers a background synchronization with the server.
 */
export async function bootApp() {
    const store = useAppStore.getState();

    // 1. Initialize Theme
    try {
        const savedTheme = await SecureStore.getItemAsync('theme');
        if (savedTheme) {
            store.setDarkMode(savedTheme === 'dark');
        } else {
            // Default to system preference
            const systemTheme = Appearance.getColorScheme();
            store.setDarkMode(systemTheme === 'dark');
        }
    } catch (e) {
        logger.warn('Failed to load theme', { error: e });
    }

    // 2. Load basic local state regardless of auth (e.g. for local browsing if possible or just to have it ready)
    try {
        await loadDataIntoStore();
    } catch (e) {
        logger.warn('Initial data load failed', { error: e });
    }

    // 3. Restore User Info if token exists
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
        try {
            const userName = await SecureStore.getItemAsync('userName');
            const userEmail = await SecureStore.getItemAsync('userEmail');
            const userProfilePicture = await SecureStore.getItemAsync('userProfilePicture');
            
            if (userName || userEmail) {
                store.setUser({
                    name: userName || 'User',
                    email: userEmail || '',
                    profilePicture: userProfilePicture || undefined
                });
            }

            // 4. Run sync in background (idempotent)
            // We don't necessarily await this here to avoid blocking the first render
            // but for Splash screen we might want to await it. 
            // The Splash screen will manually call runSync if it needs to wait.
            runSync().catch(e => {
                if (e.message === 'UNAUTHORIZED') {
                    logger.warn('Session expired during boot sync');
                    // We don't redirect here, the screen should handle it or let splash handle it
                } else {
                    logger.warn('Background boot sync failed', { error: e.message });
                }
            });
        } catch (e) {
            logger.error('Failed to restore user session', e);
        }
    }
}
