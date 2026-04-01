import { create } from 'zustand';
import { getCurrencySymbol } from '../lib/currencies';

export interface Category {
    uuid: string;
    name: string;
    type: 'expense' | 'asset';
    icon: string;
    iconType: string;
    themeBgLight: string;
    themeBgDark: string;
    themeFgLight: string;
    themeFgDark: string;
    isDefault: number;
    isDeleted: number;
    isSynced: number;
    serverUpdatedAt: number;
}

export interface Transaction {
    uuid: string;
    categoryUuid: string;
    type: 'expense' | 'asset';
    amount: number;
    transactionDate: string;
    note: string;
    isDeleted: number;
    isSynced: number;
    serverUpdatedAt: number;
}

export interface User {
    name: string;
    email: string;
    profilePicture?: string;
}

interface AppState {
    // UI
    isDarkMode: boolean;
    setDarkMode: (isDark: boolean) => void;
    toggleDarkMode: () => void;

    // Sync
    syncing: boolean;
    setSyncing: (syncing: boolean) => void;

    // Auth state transition
    isAuthenticating: boolean;
    setAuthenticating: (isAuthenticating: boolean) => void;

    // Date filter
    currentMonth: Date;
    setCurrentMonth: (date: Date) => void;

    // User
    user: User | null;
    setUser: (user: User | null) => void;

    // Currency preference
    currency: string;
    currencySymbol: string;
    currencyChangedAt: string | null;
    setCurrency: (code: string, changedAt?: string | null) => void;

    // Data
    categories: Category[];
    setCategories: (categories: Category[]) => void;
    transactions: Transaction[];
    setTransactions: (transactions: Transaction[]) => void;

    // Selection Pickers
    pickedIcon: string | null;
    setPickedIcon: (icon: string | null) => void;
    pickedCategoryUuid: string | null;
    setPickedCategory: (uuid: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // UI
    isDarkMode: false,
    setDarkMode: (isDark: boolean) => set({ isDarkMode: isDark }),
    toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

    // Sync
    syncing: false,
    setSyncing: (syncing) => set({ syncing }),

    // Auth state transition
    isAuthenticating: false,
    setAuthenticating: (isAuthenticating) => set({ isAuthenticating }),

    // Date filter
    currentMonth: new Date(),
    setCurrentMonth: (date) => set({ currentMonth: date }),

    // User
    user: null,
    setUser: (user) => set({ user }),

    // Currency preference
    currency: 'INR',
    currencySymbol: '₹',
    currencyChangedAt: null,
    setCurrency: (code, changedAt) => set({
        currency: code,
        currencySymbol: getCurrencySymbol(code),
        currencyChangedAt: changedAt !== undefined ? changedAt : new Date().toISOString(),
    }),

    // Data
    categories: [],
    setCategories: (categories) => set({ categories }),
    transactions: [],
    setTransactions: (transactions) => set({ transactions }),

    // Selection Pickers
    pickedIcon: null,
    setPickedIcon: (pickedIcon) => set({ pickedIcon }),
    pickedCategoryUuid: null,
    setPickedCategory: (pickedCategoryUuid) => set({ pickedCategoryUuid }),
}));
