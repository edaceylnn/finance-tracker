import type { FinanceRecord } from './record';

export type AppNavigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
};

export type RecordDetailRouteParams = {
  category?: string;
  type?: string;
  title?: string;
  icon?: string;
  bg?: string;
  color?: string;
};

export type AddExpenseRouteParams = {
  record?: FinanceRecord;
};
