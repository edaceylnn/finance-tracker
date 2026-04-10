export type RecordType = 'expense' | 'income' | 'investment';

export type FinanceRecord = {
  _id?: string;
  id?: string;
  title?: string;
  amount: number;
  category?: string;
  type?: string;
  currency?: string;
  date?: string | Date;
};

export type RecurringRecordItem = {
  _id: string;
  title: string;
  amount: number;
  category: string;
  type?: string;
  currency?: string;
  frequency: string;
  nextDate?: string | Date;
  isActive?: boolean;
};
