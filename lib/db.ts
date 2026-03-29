import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { logger } from './logger';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Higher-order function to wrap DB operations with automatic remote error logging.
 */
async function withErrorLogging<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (e) {
        logger.error(`Database Error: ${operationName}`, e);
        throw e;
    }
}

// Setup SQLite Instance
export const getDB = async () => {
    dbPromise = SQLite.openDatabaseAsync('ledger.db');
    return dbPromise;
};

export const initDB = async () => {
    return withErrorLogging('initDB', async () => {
        const db = await getDB();
        await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS categories (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT NOT NULL,
        iconType TEXT NOT NULL DEFAULT 'feather',
        themeBgLight TEXT NOT NULL DEFAULT '#D1FAE5',
        themeBgDark TEXT NOT NULL DEFAULT '#064E3B',
        themeFgLight TEXT NOT NULL DEFAULT '#059669',
        themeFgDark TEXT NOT NULL DEFAULT '#34D399',
        isDefault INTEGER DEFAULT 0,
        isDeleted INTEGER DEFAULT 0,
        isSynced INTEGER DEFAULT 0,
        serverUpdatedAt INTEGER DEFAULT 0,
        createdAt INTEGER DEFAULT 0,
        updatedAt INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS transactions (
        uuid TEXT PRIMARY KEY,
        categoryUuid TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        transactionDate TEXT NOT NULL,
        note TEXT,
        isDeleted INTEGER DEFAULT 0,
        isSynced INTEGER DEFAULT 0,
        serverUpdatedAt INTEGER DEFAULT 0,
        createdAt INTEGER DEFAULT 0,
        updatedAt INTEGER DEFAULT 0,
        FOREIGN KEY (categoryUuid) REFERENCES categories(uuid)
      );
    `);

        const now = Date.now();

        // Migration: Categories
        const catInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(categories)`);
        if (!catInfo.find(col => col.name === 'createdAt')) {
            await db.execAsync(`ALTER TABLE categories ADD COLUMN createdAt INTEGER DEFAULT ${now}`);
        }
        if (!catInfo.find(col => col.name === 'updatedAt')) {
            await db.execAsync(`ALTER TABLE categories ADD COLUMN updatedAt INTEGER DEFAULT ${now}`);
        }

        // Migration: Transactions
        const txnInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(transactions)`);
        if (!txnInfo.find(col => col.name === 'createdAt')) {
            await db.execAsync(`ALTER TABLE transactions ADD COLUMN createdAt INTEGER DEFAULT ${now}`);
        }
        if (!txnInfo.find(col => col.name === 'updatedAt')) {
            await db.execAsync(`ALTER TABLE transactions ADD COLUMN updatedAt INTEGER DEFAULT ${now}`);
        }

        console.log("Database initialized");
    });
};

// Generate V4 UUID
export const generateUUID = () => {
    return Crypto.randomUUID();
};

// ─── Category Helpers ───────────────────────────────────────────────

export async function getCategories(type?: 'expense' | 'asset') {
    return withErrorLogging('getCategories', async () => {
        const db = await getDB();
        if (type) {
            return db.getAllAsync(
                `SELECT * FROM categories WHERE isDeleted = 0 AND type = ? ORDER BY createdAt ASC, name ASC`,
                [type]
            );
        }
        return db.getAllAsync(`SELECT * FROM categories WHERE isDeleted = 0 ORDER BY createdAt ASC, name ASC`);
    });
}

export async function insertCategory(cat: {
    uuid: string; name: string; type: string; icon: string; iconType: string;
    themeBgLight: string; themeBgDark: string; themeFgLight: string; themeFgDark: string;
    createdAt?: number;
}) {
    return withErrorLogging('insertCategory', async () => {
        const db = await getDB();
        const now = Date.now();
        const createdAt = cat.createdAt || now;
        const updatedAt = now;
        const params = [
            cat.uuid, cat.name, cat.type, cat.icon, cat.iconType,
            cat.themeBgLight, cat.themeBgDark, cat.themeFgLight, cat.themeFgDark,
            createdAt, updatedAt
        ].map(val => val === undefined ? null : val);
        await db.runAsync(`INSERT INTO categories (uuid, name, type, icon, iconType, themeBgLight, themeBgDark, themeFgLight, themeFgDark, isSynced, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`, params);
    });
}

export async function bulkInsertCategories(categories: {
    uuid: string; name: string; type: string; icon: string; iconType: string;
    themeBgLight: string; themeBgDark: string; themeFgLight: string; themeFgDark: string;
    createdAt?: number;
}[]) {
    return withErrorLogging('bulkInsertCategories', async () => {
        const db = await getDB();
        await db.withTransactionAsync(async () => {
            let now = Date.now();
            for (const cat of categories) {
                now = now + 100;
                const timestamp = cat.createdAt || now++;
                const updatedAt = timestamp;
                const params = [
                    cat.uuid, cat.name, cat.type, cat.icon, cat.iconType,
                    cat.themeBgLight, cat.themeBgDark, cat.themeFgLight, cat.themeFgDark,
                    timestamp, updatedAt
                ].map(val => val === undefined ? null : val);
                await db.runAsync(`INSERT INTO categories (uuid, name, type, icon, iconType, themeBgLight, themeBgDark, themeFgLight, themeFgDark, isSynced, createdAt, updatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`, params);
            }
        });
    });
}

export async function softDeleteCategory(uuid: string) {
    return withErrorLogging('softDeleteCategory', async () => {
        const db = await getDB();
        await db.runAsync(
            `UPDATE categories SET isDeleted = 1, isSynced = 0 WHERE uuid = ?`,
            [uuid]
        );
    });
}

export async function updateCategory(cat: {
    uuid: string; name: string; type: string; icon: string; iconType: string;
    themeBgLight: string; themeBgDark: string; themeFgLight: string; themeFgDark: string;
}) {
    return withErrorLogging('updateCategory', async () => {
        const db = await getDB();
        const updatedAt = Date.now();
        const params = [
            cat.name, cat.type, cat.icon, cat.iconType,
            cat.themeBgLight, cat.themeBgDark, cat.themeFgLight, cat.themeFgDark,
            updatedAt, cat.uuid
        ].map(val => val === undefined ? null : val);
        await db.runAsync(
            `UPDATE categories 
             SET name = ?, type = ?, icon = ?, iconType = ?, 
                 themeBgLight = ?, themeBgDark = ?, themeFgLight = ?, themeFgDark = ?,
                 isSynced = 0, updatedAt = ?
             WHERE uuid = ?`,
            params
        );
    });
}

// ─── Transaction Helpers ────────────────────────────────────────────

export async function getTransactions(month?: Date) {
    return withErrorLogging('getTransactions', async () => {
        const db = await getDB();
        if (month) {
            const year = month.getFullYear();
            const m = String(month.getMonth() + 1).padStart(2, '0');
            const startDate = `${year}-${m}-01`;
            const endMonth = month.getMonth() + 2 > 12 ? 1 : month.getMonth() + 2;
            const endYear = endMonth === 1 ? year + 1 : year;
            const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
            return db.getAllAsync(
                `SELECT * FROM transactions WHERE isDeleted = 0
                 AND transactionDate >= ? AND transactionDate < ?
                 ORDER BY transactionDate DESC`,
                [startDate, endDate]
            );
        }
        return db.getAllAsync(
            `SELECT * FROM transactions WHERE isDeleted = 0 ORDER BY transactionDate DESC`
        );
    });
}

export async function insertTransaction(txn: {
    uuid: string; categoryUuid: string; type: string; amount: number;
    transactionDate: string; note: string;
}) {
    return withErrorLogging('insertTransaction', async () => {
        const db = await getDB();
        const now = Date.now();
        await db.runAsync(
            `INSERT INTO transactions (uuid, categoryUuid, type, amount, transactionDate, note, isSynced, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [txn.uuid, txn.categoryUuid, txn.type, txn.amount, txn.transactionDate, txn.note, now, now]
        );
    });
}

export async function updateTransaction(txn: {
    uuid: string; categoryUuid: string; type: string; amount: number;
    transactionDate: string; note: string;
}) {
    return withErrorLogging('updateTransaction', async () => {
        const db = await getDB();
        const now = Date.now();
        await db.runAsync(
            `UPDATE transactions 
             SET categoryUuid = ?, type = ?, amount = ?, transactionDate = ?, note = ?, isSynced = 0, updatedAt = ?
             WHERE uuid = ?`,
            [txn.categoryUuid, txn.type, txn.amount, txn.transactionDate, txn.note, now, txn.uuid]
        );
    });
}

export async function softDeleteTransaction(uuid: string) {
    return withErrorLogging('softDeleteTransaction', async () => {
        const db = await getDB();
        await db.runAsync(
            `UPDATE transactions SET isDeleted = 1, isSynced = 0 WHERE uuid = ?`,
            [uuid]
        );
    });
}

// ─── Sync & Reset Helpers ───────────────────────────────────────────

export async function hasUnsyncedData(): Promise<boolean> {
    return withErrorLogging('hasUnsyncedData', async () => {
        const db = await getDB();
        const categories = await db.getAllAsync('SELECT uuid FROM categories WHERE isSynced = 0');
        const transactions = await db.getAllAsync('SELECT uuid FROM transactions WHERE isSynced = 0');
        return categories.length > 0 || transactions.length > 0;
    });
}

export async function resetDB() {
    return withErrorLogging('resetDB', async () => {
        const db = await getDB();
        await db.execAsync(`
            DELETE FROM transactions;
            DELETE FROM categories;
        `);
        console.log("Database reset");
    });
}
