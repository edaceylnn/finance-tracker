import type { FinanceRecord } from '../types/record';

const DEFAULT_CCY = 'TRY';

const SYMBOL_PREFIX: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF ',
};

export function normalizeCurrency(currency: unknown): string {
  if (currency == null || String(currency).trim() === '') return DEFAULT_CCY;
  return String(currency).trim().toUpperCase();
}

export function formatMoney(
  amount: unknown,
  currency: string = DEFAULT_CCY,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {},
): string {
  const c = normalizeCurrency(currency);
  const n = Number(amount);
  const isJpy = c === 'JPY';
  const minF = options.minimumFractionDigits ?? (isJpy ? 0 : 2);
  const maxF = options.maximumFractionDigits ?? (isJpy ? 0 : 2);
  const formatted = (Number.isNaN(n) ? 0 : n).toLocaleString('tr-TR', {
    minimumFractionDigits: minF,
    maximumFractionDigits: maxF,
  });
  const sym = SYMBOL_PREFIX[c];
  if (sym) return `${sym}${formatted}`;
  return `${formatted} ${c}`;
}

export function formatMixedTotal(amount: unknown, records: FinanceRecord[] | undefined): string {
  if (!records || records.length === 0) {
    return formatMoney(amount, DEFAULT_CCY);
  }
  const currs = [...new Set(records.map(r => normalizeCurrency(r.currency)))];
  if (currs.length === 1) {
    return formatMoney(amount, currs[0]);
  }
  const n = Number(amount);
  const s = Number.isNaN(n)
    ? (0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${s} (karışık)`;
}
