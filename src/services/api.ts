import { API_BASE_URL } from '../config/api';
import type { FinanceRecord } from '../types/record';

const BASE_URL = API_BASE_URL;

let _token: string | null = null;
export const setAuthToken = (token: string | null) => { _token = token; };

let _onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (cb: (() => void) | null) => { _onUnauthorized = cb; };

const getHeaders = (contentType = true): Record<string, string> => ({
  ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
});

const NETWORK_HINT =
  'Sunucuya ulaşılamıyor. Backend: cd backend && npm run build && npm start (port 3001, MongoDB açık olmalı).';

function isNetworkFailure(err: unknown): boolean {
  const m = String((err as Error)?.message || '');
  return (
    m.includes('Network request failed') ||
    m.includes('The network connection was lost') ||
    m.includes('Failed to connect') ||
    m.includes('Could not connect')
  );
}

async function fetchOrThrow(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (isNetworkFailure(e)) {
      throw new Error(NETWORK_HINT);
    }
    throw e;
  }
}

async function handleResponse(res: Response): Promise<Response> {
  if (res.status === 401 || res.status === 403) {
    _onUnauthorized?.();
    const data = await res.json().catch(() => ({}));
    const err = new Error((data as { error?: string }).error || 'Oturum süresi doldu, lütfen tekrar giriş yapın') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res;
}

async function handleAuthFormResponse(res: Response): Promise<Response> {
  if (res.status === 401 || res.status === 403) {
    const data = await res.json().catch(() => ({}));
    const err = new Error((data as { error?: string }).error || 'Giriş yapılamadı') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res;
}

export type GetRecordsOpts = {
  type?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: string | number;
  amountMax?: string | number;
  categories?: string | string[];
  currency?: string;
};

export const register = async (body: { name: string; email: string; password: string }) => {
  const res = await fetchOrThrow(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  await handleAuthFormResponse(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Kayıt oluşturulamadı');
  return data as { token: string; user: { id: string; name: string; email: string } };
};

export const login = async (body: { email: string; password: string }) => {
  const res = await fetchOrThrow(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  await handleAuthFormResponse(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Giriş yapılamadı');
  return data as { token: string; user: { id: string; name: string; email: string } };
};

export const fetchMe = async () => {
  const res = await fetchOrThrow(`${BASE_URL}/auth/me`, {
    headers: getHeaders(false),
  });
  await handleResponse(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Oturum geçersiz, lütfen tekrar giriş yapın');
  return data as { id: string; name: string; email: string };
};

export const getRecords = async (opts?: string | GetRecordsOpts): Promise<FinanceRecord[]> => {
  const o = typeof opts === 'string'
    ? (opts ? { type: opts } : {})
    : (opts && typeof opts === 'object' ? opts : {});
  const params = new URLSearchParams();
  if (o.type) params.set('type', o.type);
  if (o.q && String(o.q).trim()) params.set('q', String(o.q).trim());
  if (o.dateFrom) params.set('dateFrom', o.dateFrom);
  if (o.dateTo) params.set('dateTo', o.dateTo);
  if (o.amountMin != null && String(o.amountMin).trim() !== '') params.set('amountMin', String(o.amountMin).trim());
  if (o.amountMax != null && String(o.amountMax).trim() !== '') params.set('amountMax', String(o.amountMax).trim());
  if (o.categories) {
    const c = Array.isArray(o.categories) ? o.categories.filter(Boolean).join(',') : String(o.categories);
    if (c) params.set('categories', c);
  }
  if (o.currency) params.set('currency', o.currency);
  const qs = params.toString();
  const url = qs ? `${BASE_URL}/records?${qs}` : `${BASE_URL}/records`;
  const res = await fetchOrThrow(url, { headers: getHeaders(false) });
  await handleResponse(res);
  if (!res.ok) throw new Error('Kayıtlar alınamadı');
  return res.json() as Promise<FinanceRecord[]>;
};

export const addRecord = async (record: Record<string, unknown>) => {
  const res = await fetchOrThrow(`${BASE_URL}/records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(record),
  });
  await handleResponse(res);
  if (!res.ok) throw new Error('Kayıt eklenemedi');
  return res.json() as Promise<FinanceRecord>;
};

export const updateRecord = async (id: string, record: Record<string, unknown>) => {
  const res = await fetchOrThrow(`${BASE_URL}/records/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(record),
  });
  await handleResponse(res);
  if (!res.ok) throw new Error('Kayıt güncellenemedi');
  return res.json() as Promise<FinanceRecord>;
};

export const deleteRecord = async (id: string) => {
  const res = await fetchOrThrow(`${BASE_URL}/records/${id}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });
  await handleResponse(res);
  if (!res.ok) throw new Error('Kayıt silinemedi');
  return res.json();
};

export const getMetalSpot = async () => {
  const res = await fetchOrThrow(`${BASE_URL}/metals`, { headers: getHeaders(false) });
  await handleResponse(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Metal fiyatları alınamadı');
  return data as Record<string, unknown> & {
    goldTryPerGram?: number | null;
    silverTryPerGram?: number | null;
    fetchedAt?: string;
    cached?: boolean;
    stale?: boolean;
  };
};

export const getRecurringRecords = async () => {
  const res = await fetchOrThrow(`${BASE_URL}/recurring-records`, { headers: getHeaders(false) });
  await handleResponse(res);
  if (!res.ok) throw new Error('Tekrarlayan kayıtlar alınamadı');
  return res.json();
};

export const addRecurringRecord = async (record: Record<string, unknown>) => {
  const res = await fetchOrThrow(`${BASE_URL}/recurring-records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(record),
  });
  await handleResponse(res);
  if (!res.ok) throw new Error('Tekrarlayan kayıt oluşturulamadı');
  return res.json();
};

export const updateRecurringRecord = async (id: string, data: Record<string, unknown>) => {
  const res = await fetchOrThrow(`${BASE_URL}/recurring-records/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  await handleResponse(res);
  if (!res.ok) throw new Error('Tekrarlayan kayıt güncellenemedi');
  return res.json();
};

export const deleteRecurringRecord = async (id: string) => {
  const res = await fetchOrThrow(`${BASE_URL}/recurring-records/${id}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });
  await handleResponse(res);
  if (!res.ok) throw new Error('Tekrarlayan kayıt silinemedi');
  return res.json();
};

export const processRecurringRecords = async () => {
  const res = await fetchOrThrow(`${BASE_URL}/recurring-records/process`, {
    method: 'POST',
    headers: getHeaders(false),
  });
  await handleResponse(res);
  if (!res.ok) throw new Error('İşlem başarısız');
  return res.json();
};
