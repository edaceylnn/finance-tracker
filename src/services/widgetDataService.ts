/**
 * Prepares summary data for optional iOS/Android home screen widgets.
 * Writes JSON to AsyncStorage under WIDGET_DATA_KEY for native extensions to read.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinanceRecord } from '../types/record';

const WIDGET_DATA_KEY = 'widget_data';

export type WidgetData = {
  netBalance: number;
  income: number;
  expense: number;
  investment: number;
  recentRecords: Array<{
    title: string;
    amount: number;
    type: string;
    currency: string;
  }>;
  lastUpdated: string;
};

export async function refreshWidgetData(records: FinanceRecord[] = []): Promise<WidgetData | null> {
  try {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonth = records.filter(r => new Date(r.date as string | number | Date) >= monthStart);

    const income     = thisMonth.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
    const expense    = thisMonth.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const investment = thisMonth.filter(r => r.type === 'investment').reduce((s, r) => s + r.amount, 0);
    const netBalance = income - expense - investment;

    const recentRecords = [...records]
      .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())
      .slice(0, 3)
      .map(r => ({
        title:    r.title ?? '',
        amount:   r.amount,
        type:     r.type ?? '',
        currency: r.currency || 'TRY',
      }));

    const widgetData: WidgetData = {
      netBalance,
      income,
      expense,
      investment,
      recentRecords,
      lastUpdated: new Date().toISOString(),
    };

    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(widgetData));
    return widgetData;
  } catch (err) {
    console.warn('[widgetDataService] refreshWidgetData failed:', err);
    return null;
  }
}

export async function getWidgetData(): Promise<WidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? (JSON.parse(raw) as WidgetData) : null;
  } catch {
    return null;
  }
}
