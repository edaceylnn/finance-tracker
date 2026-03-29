import { API_BASE_URL } from '../config/api';

const BASE_URL = API_BASE_URL;

// Module-level token — set by AuthContext
let _token = null;
export const setAuthToken = (token) => { _token = token; };

const getHeaders = (contentType = true) => ({
  ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
});

const NETWORK_HINT =
  'Sunucuya ulaşılamıyor. Ayrı bir terminalde backend\'i çalıştırın: cd backend && node index.js (port 3001, MongoDB açık olmalı).';

function isNetworkFailure(err) {
  const m = String(err?.message || '');
  return (
    m.includes('Network request failed') ||
    m.includes('The network connection was lost') ||
    m.includes('Failed to connect') ||
    m.includes('Could not connect')
  );
}

async function fetchOrThrow(url, init) {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (isNetworkFailure(e)) {
      throw new Error(NETWORK_HINT);
    }
    throw e;
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const register = async ({ name, email, password }) => {
  const res = await fetchOrThrow(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Kayıt oluşturulamadı');
  return data;
};

export const login = async ({ email, password }) => {
  const res = await fetchOrThrow(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı');
  return data;
};

export const fetchMe = async () => {
  const res = await fetchOrThrow(`${BASE_URL}/auth/me`, {
    headers: getHeaders(false),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Session invalid');
  return data;
};

// ─── Records ─────────────────────────────────────────────────────────────────

export const getRecords = async (type = null) => {
  const url = type
    ? `${BASE_URL}/records?type=${encodeURIComponent(type)}`
    : `${BASE_URL}/records`;
  const res = await fetchOrThrow(url, { headers: getHeaders(false) });
  if (!res.ok) throw new Error('Kayıtlar alınamadı');
  return res.json();
};

export const addRecord = async record => {
  const res = await fetchOrThrow(`${BASE_URL}/records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Kayıt eklenemedi');
  return res.json();
};

export const updateRecord = async (id, record) => {
  const res = await fetchOrThrow(`${BASE_URL}/records/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Kayıt güncellenemedi');
  return res.json();
};

export const deleteRecord = async id => {
  const res = await fetchOrThrow(`${BASE_URL}/records/${id}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error('Kayıt silinemedi');
  return res.json();
};
