import { getDB } from './db';
import { apiGet, apiPost, apiPatch } from './api';
import { useAppStore } from '../stores/useAppStore';
import * as SecureStore from './secure-store';
import { getCurrencySymbol } from './currencies';

// ─── Pull: Server → Local DB ───────────────────────────────────────
export async function syncPull() {
    console.log("Sync pull...");
    const db = await getDB();

    // 1. Get last sync timestamp from local storage
    const storedTimestamp = await SecureStore.getItemAsync('lastSyncTimestamp');
    const lastSyncTimestamp = storedTimestamp ? parseInt(storedTimestamp, 10) : 0;
    console.log("Last sync timestamp", lastSyncTimestamp);
    try {
        // 2. Check what has changed since last sync
        const check = await apiGet(
            `/api/sync/check?lastSyncTimestamp=${lastSyncTimestamp}`
        );
        console.log("Sync check", check);

        const changedCatUuids: string[] = check.categories || [];
        const changedTxnUuids: string[] = check.transactions || [];

        // Nothing changed
        if (changedCatUuids.length === 0 && changedTxnUuids.length === 0) {
            // Still save the new timestamp
            if (check.newSyncTimestamp) {
                await SecureStore.setItemAsync('lastSyncTimestamp', String(check.newSyncTimestamp));
            }
            return;
        }

        // 3. Pull full documents for the changed UUIDs
        const pulled = await apiPost('/api/sync/pull', {
            categories: changedCatUuids,
            transactions: changedTxnUuids,
        });

        // 4. Upsert categories (server uses nested theme object)
        if (pulled.categories?.length) {
            for (const cat of pulled.categories) {
                await db.runAsync(
                    `INSERT OR REPLACE INTO categories
                     (uuid, name, type, icon, iconType, themeBgLight, themeBgDark, themeFgLight, themeFgDark, isDefault, isDeleted, isSynced, serverUpdatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
                    [
                        cat.uuid, cat.name, cat.type, cat.icon, cat.iconType || 'feather',
                        cat.theme?.bgLight || '#D1FAE5', cat.theme?.bgDark || '#064E3B',
                        cat.theme?.fgLight || '#059669', cat.theme?.fgDark || '#34D399',
                        cat.isDefault ? 1 : 0, cat.isDeleted ? 1 : 0,
                        cat.serverUpdatedAt || 0,
                    ]
                );
            }
        }

        // 5. Upsert transactions
        if (pulled.transactions?.length) {
            for (const txn of pulled.transactions) {
                await db.runAsync(
                    `INSERT OR REPLACE INTO transactions
                     (uuid, categoryUuid, type, amount, transactionDate, note, isDeleted, isSynced, serverUpdatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
                    [
                        txn.uuid, txn.categoryUuid, txn.type, txn.amount,
                        txn.transactionDate, txn.note || '',
                        txn.isDeleted ? 1 : 0, txn.serverUpdatedAt || 0,
                    ]
                );
            }
        }

        // 6. Save the new sync timestamp
        if (check.newSyncTimestamp) {
            await SecureStore.setItemAsync('lastSyncTimestamp', String(check.newSyncTimestamp));
        }
    } catch (e: any) {
        if (e.message === 'UNAUTHORIZED') throw e;
        console.warn('Sync pull failed (offline?):', e.message);
        console.log(e);
    }
}

// ─── Push: Local DB → Server ────────────────────────────────────────
export async function syncPush() {
    console.log("Sync push...");
    const db = await getDB();

    const unsyncedCategories = await db.getAllAsync<any>(
        `SELECT * FROM categories WHERE isSynced = 0`
    );
    const unsyncedTransactions = await db.getAllAsync<any>(
        `SELECT * FROM transactions WHERE isSynced = 0`
    );
    console.log("Push Categories:", unsyncedCategories);
    console.log("Push Transactions:", unsyncedTransactions);
    if (unsyncedCategories.length === 0 && unsyncedTransactions.length === 0) return;

    try {
        // Transform local DB rows into API-compatible format
        const categoriesToPush = unsyncedCategories.map((cat: any) => ({
            uuid: cat.uuid,
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            iconType: cat.iconType || 'feather',
            theme: {
                bgLight: cat.themeBgLight,
                bgDark: cat.themeBgDark,
                fgLight: cat.themeFgLight,
                fgDark: cat.themeFgDark,
            },
            isDefault: cat.isDefault === 1 ? true : false,
            isDeleted: cat.isDeleted === 1 ? true : false,
        }));

        const transactionsToPush = unsyncedTransactions.map((txn: any) => ({
            uuid: txn.uuid,
            categoryUuid: txn.categoryUuid,
            type: txn.type,
            amount: txn.amount,
            transactionDate: ensureISODatetime(txn.transactionDate),
            note: txn.note || '',
            isDeleted: txn.isDeleted === 1 ? true : false,
        }));

        const result = await apiPost('/api/sync/push', {
            categories: categoriesToPush,
            transactions: transactionsToPush,
        });

        // Mark everything as synced
        if (result) {
            for (const cat of unsyncedCategories) {
                await db.runAsync(`UPDATE categories SET isSynced = 1 WHERE uuid = ?`, [cat.uuid]);
            }
            for (const txn of unsyncedTransactions) {
                await db.runAsync(`UPDATE transactions SET isSynced = 1 WHERE uuid = ?`, [txn.uuid]);
            }
            // Save the new sync timestamp
            if (result.newSyncTimestamp) {
                await SecureStore.setItemAsync('lastSyncTimestamp', String(result.newSyncTimestamp));
            }
        }
    } catch (e: any) {
        if (e.message === 'UNAUTHORIZED') throw e;
        console.warn('Sync push failed (offline?):', e.message);
        console.log(e);
    }
}

// ─── Full Sync: Pull then Push then Preferences ────────────────────
export async function runSync() {
    console.log("running sync")
    const store = useAppStore.getState();
    store.setSyncing(true);
    try {
        await syncPull();
        await syncPush();
        await syncPreferences();
        // Refresh in-memory state from DB
        await loadDataIntoStore();
    } catch (e: any) {
        console.error('Sync error:', e.message);
    } finally {
        store.setSyncing(false);
    }
}

// ─── Load local DB data into Zustand ────────────────────────────────
export async function loadDataIntoStore() {
    const db = await getDB();
    const store = useAppStore.getState();

    const categories = await db.getAllAsync(
        `SELECT * FROM categories WHERE isDeleted = 0 ORDER BY createdAt ASC, name ASC`
    );
    const transactions = await db.getAllAsync(
        `SELECT * FROM transactions WHERE isDeleted = 0 ORDER BY transactionDate DESC`
    );

    store.setCategories(categories as any[]);
    store.setTransactions(transactions as any[]);

    // Hydrate currency from SecureStore
    await loadPreferencesIntoStore();
}

// ─── Load preferences from SecureStore into Zustand ─────────────────
export async function loadPreferencesIntoStore() {
    const store = useAppStore.getState();
    const savedCurrency = await SecureStore.getItemAsync('currency');
    const savedChangedAt = await SecureStore.getItemAsync('currencyChangedAt');
    if (savedCurrency) {
        store.setCurrency(savedCurrency, savedChangedAt || null);
    }
}

// ─── Sync Preferences: Last-write-wins ──────────────────────────────
export async function syncPreferences() {
    try {
        const localCurrency = await SecureStore.getItemAsync('currency');
        const localChangedAt = await SecureStore.getItemAsync('currencyChangedAt');

        // Fetch remote preferences
        const response = await apiGet('/api/users/me');
        const remoteCurrency = response.data?.preferences?.currency || 'INR';
        const remoteUpdatedAt = response.data?.updatedAt;

        // If no local preference set, adopt remote
        if (!localCurrency) {
            await SecureStore.setItemAsync('currency', remoteCurrency);
            if (remoteUpdatedAt) {
                await SecureStore.setItemAsync('currencyChangedAt', remoteUpdatedAt);
            }
            return;
        }

        // Already in sync
        if (localCurrency === remoteCurrency) return;

        // Compare timestamps for last-write-wins
        const localTime = localChangedAt ? new Date(localChangedAt).getTime() : 0;
        const remoteTime = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() : 0;

        if (localTime > remoteTime) {
            // Local is newer → push to server
            await apiPatch('/api/users/me/preferences', {
                preferences: { currency: localCurrency },
            });
        } else {
            // Remote is newer → update local
            await SecureStore.setItemAsync('currency', remoteCurrency);
            if (remoteUpdatedAt) {
                await SecureStore.setItemAsync('currencyChangedAt', remoteUpdatedAt);
            }
        }
    } catch (e: any) {
        if (e.message === 'UNAUTHORIZED') throw e;
        console.warn('Preference sync failed (offline?):', e.message);
    }
}

// ─── Helpers ────────────────────────────────────────────────────────
// Ensure a date string is full ISO 8601 datetime (not just YYYY-MM-DD)
function ensureISODatetime(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();
    // Already has a T (ISO datetime)
    if (dateStr.includes('T')) return dateStr;
    // Just a date like "2026-03-15" → convert to full ISO
    return new Date(dateStr + 'T00:00:00Z').toISOString();
}
