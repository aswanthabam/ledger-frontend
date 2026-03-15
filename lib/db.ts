import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
let dbInstance: SQLite.SQLiteDatabase | null = null;
// Setup SQLite Instance
export const getDB = async () => {
    if (!dbInstance) {
        dbInstance = await SQLite.openDatabaseAsync('ledger.db');
    }
    return dbInstance;
};

export const initDB = async () => {
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
        serverUpdatedAt INTEGER DEFAULT 0
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
        FOREIGN KEY (categoryUuid) REFERENCES categories(uuid)
      );
    `);
    console.log("Database initialized");
};

// Generate V4 UUID
export const generateUUID = () => {
    return Crypto.randomUUID();
};

// ─── Category Helpers ───────────────────────────────────────────────

export async function getCategories(type?: 'expense' | 'asset') {
    const db = await getDB();
    if (type) {
        return db.getAllAsync(
            `SELECT * FROM categories WHERE isDeleted = 0 AND type = ? ORDER BY name ASC`,
            [type]
        );
    }
    return db.getAllAsync(`SELECT * FROM categories WHERE isDeleted = 0 ORDER BY name ASC`);
}

export async function insertCategory(cat: {
    uuid: string; name: string; type: string; icon: string; iconType: string;
    themeBgLight: string; themeBgDark: string; themeFgLight: string; themeFgDark: string;
}) {
    const db = await getDB();
    const params = [
        cat.uuid, cat.name, cat.type, cat.icon, cat.iconType,
        cat.themeBgLight, cat.themeBgDark, cat.themeFgLight, cat.themeFgDark
    ].map(val => val === undefined ? null : val); // Convert undefined to null
    console.log("Params", params)
    await db.runAsync(`INSERT INTO categories (uuid, name, type, icon, iconType, themeBgLight, themeBgDark, themeFgLight, themeFgDark, isSynced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`, params);
}

export async function softDeleteCategory(uuid: string) {
    const db = await getDB();
    await db.runAsync(
        `UPDATE categories SET isDeleted = 1, isSynced = 0 WHERE uuid = ?`,
        [uuid]
    );
}

// ─── Transaction Helpers ────────────────────────────────────────────

export async function getTransactions(month?: Date) {
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
}

export async function insertTransaction(txn: {
    uuid: string; categoryUuid: string; type: string; amount: number;
    transactionDate: string; note: string;
}) {
    const db = await getDB();
    await db.runAsync(
        `INSERT INTO transactions (uuid, categoryUuid, type, amount, transactionDate, note, isSynced)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [txn.uuid, txn.categoryUuid, txn.type, txn.amount, txn.transactionDate, txn.note]
    );
}

export async function softDeleteTransaction(uuid: string) {
    const db = await getDB();
    await db.runAsync(
        `UPDATE transactions SET isDeleted = 1, isSynced = 0 WHERE uuid = ?`,
        [uuid]
    );
}
