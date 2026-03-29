import React from 'react';
import { requestWidgetUpdate, WidgetTaskHandlerProps, WidgetInfo } from 'react-native-android-widget';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { SmallWidget } from './components/SmallWidget';

export async function getWidgetData() {
  let db: SQLite.SQLiteDatabase | null = null;
  try {
    db = await SQLite.openDatabaseAsync('ledger.db');
  } catch (error) {
    console.error('Failed to open database in widget task:', error);
  }

  // Get Currency Symbol
  let currencySymbol = '₹';
  try {
      const savedCurrency = await SecureStore.getItemAsync('currency');
      if (savedCurrency === 'USD') currencySymbol = '$';
      else if (savedCurrency === 'EUR') currencySymbol = '€';
      else if (savedCurrency === 'GBP') currencySymbol = '£';
  } catch (e) {}

  const now = new Date();
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const currentMonthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const nextMonthStart = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const prevMonthStart = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  let currentTotal = 0;
  let prevTotal = 0;
  let currentInvested = 0;
  let prevInvested = 0;
  let categoryStats: any[] = [];

  if (db) {
    const currentTxns: any[] = await db.getAllAsync(
      'SELECT * FROM transactions WHERE isDeleted = 0 AND transactionDate >= ? AND transactionDate < ?',
      [currentMonthStart, nextMonthStart]
    );
    const prevTxns: any[] = await db.getAllAsync(
      'SELECT * FROM transactions WHERE isDeleted = 0 AND transactionDate >= ? AND transactionDate < ?',
      [prevMonthStart, currentMonthStart]
    );

    currentTotal = currentTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    prevTotal = prevTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    currentInvested = currentTxns.filter(t => t.type === 'asset').reduce((sum, t) => sum + t.amount, 0);
    prevInvested = prevTxns.filter(t => t.type === 'asset').reduce((sum, t) => sum + t.amount, 0);

    const categories: any[] = await db.getAllAsync('SELECT * FROM categories WHERE isDeleted = 0');
    const currentMap: Record<string, number> = {};
    currentTxns.filter(t => t.type === 'expense').forEach((t) => {
      currentMap[t.categoryUuid] = (currentMap[t.categoryUuid] || 0) + t.amount;
    });

    const prevMap: Record<string, number> = {};
    prevTxns.filter(t => t.type === 'expense').forEach((t) => {
      prevMap[t.categoryUuid] = (prevMap[t.categoryUuid] || 0) + t.amount;
    });

    categoryStats = Object.entries(currentMap)
      .map(([uuid, amount]) => {
        const cat = categories.find((c) => c.uuid === uuid);
        const prevAmount = prevMap[uuid] || 0;
        const pctChange = prevAmount === 0 ? 0 : Math.round(((amount - prevAmount) / prevAmount) * 100);
        return {
          name: cat?.name || 'Other',
          icon: cat?.icon || 'circle',
          percentage: currentTotal > 0 ? Math.round((amount / currentTotal) * 100) : 0,
          pctChange,
          color: cat?.themeFgLight || '#059669',
          bgColor: cat?.themeBgLight || '#D1FAE5',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  const formatAmount = (cents: number) => {
    const dollars = (cents / 100).toFixed(0);
    return dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const totalPctChange = prevTotal === 0 ? 0 : Math.round(((currentTotal - prevTotal) / prevTotal) * 100);
  const investPctChange = prevInvested === 0 ? 0 : Math.round(((currentInvested - prevInvested) / prevInvested) * 100);
  const lastUpdated = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return {
    totalSpent: formatAmount(currentTotal),
    spendPctChange: totalPctChange,
    totalInvested: formatAmount(currentInvested),
    investPctChange,
    categoryStats,
    lastUpdated,
    currencySymbol,
  };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, renderWidget } = props;
  const { widgetName } = widgetInfo;
  const data = await getWidgetData();

  if (widgetName === 'SmallWidget') {
    renderWidget(<SmallWidget totalSpent={data.totalSpent} currencySymbol={data.currencySymbol} />);
  }
}
