import { useAppStore } from '../stores/useAppStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ledger-api.avctech.in';
const LOGGER_API_KEY = process.env.EXPO_PUBLIC_LOGGER_API_KEY || 'ledger_log_secret_123';
const ENV = __DEV__ ? 'development' : 'production';

export interface LogPayload {
    level: 'error' | 'warn' | 'info';
    message: string;
    stackTrace?: string;
    environment: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

/**
 * Sends a log entry to the remote ingestion API.
 * Fails silently to ensure app stability.
 */
async function sendToIngest(payload: LogPayload) {
    try {
        var res = await fetch(`https://logs-api.avctech.in/api/ingest`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOGGER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const result = await res.json().catch(() => ({}));
        if (__DEV__) {
            console.log('[Remote Log Response]:', result);
        }
    } catch (e) {
        // Silent catch: logging failure should not affect app
        if (__DEV__) {
            console.error('Failed to send log to ingest API:', e);
        }
    }
}

export const logger = {
    error: (message: string, error?: any, metadata?: Record<string, any>) => {
        const user = useAppStore.getState().user;
        const payload: LogPayload = {
            level: 'error',
            message,
            stackTrace: error instanceof Error ? error.stack : (typeof error === 'string' ? error : JSON.stringify(error)),
            environment: ENV,
            timestamp: new Date().toISOString(),
            metadata: {
                ...metadata,
                userId: user?.email || 'anonymous',
                userName: user?.name,
            },
        };

        if (__DEV__) {
            console.error(`[Remote Log - Error]: ${message}`, error, metadata);
        }
        sendToIngest(payload);
    },

    warn: (message: string, metadata?: Record<string, any>) => {
        const user = useAppStore.getState().user;
        const payload: LogPayload = {
            level: 'warn',
            message,
            environment: ENV,
            timestamp: new Date().toISOString(),
            metadata: {
                ...metadata,
                userId: user?.email || 'anonymous',
            },
        };

        if (__DEV__) {
            console.warn(`[Remote Log - Warn]: ${message}`, metadata);
        }
        sendToIngest(payload);
    },
};
