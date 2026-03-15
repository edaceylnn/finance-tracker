import { Platform } from 'react-native';

const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

// Module-level token — set by AuthContext
let _token = null;
export const setAuthToken = (token) => { _token = token; };

const getHeaders = (contentType = true) => ({
  ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export const register = async ({ name, email, password }) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kayıt oluşturulamadı');
  return data;
};

export const login = async ({ email, password }) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı');
  return data;
};

// ─── Records ─────────────────────────────────────────────────────────────────

export const getRecords = async (type = null) => {
  const url = type
    ? `${BASE_URL}/records?type=${encodeURIComponent(type)}`
    : `${BASE_URL}/records`;
  const res = await fetch(url, { headers: getHeaders(false) });
  if (!res.ok) throw new Error('Kayıtlar alınamadı');
  return res.json();
};

export const addRecord = async record => {
  const res = await fetch(`${BASE_URL}/records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Kayıt eklenemedi');
  return res.json();
};

export const updateRecord = async (id, record) => {
  const res = await fetch(`${BASE_URL}/records/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Kayıt güncellenemedi');
  return res.json();
};

export const deleteRecord = async id => {
  const res = await fetch(`${BASE_URL}/records/${id}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error('Kayıt silinemedi');
  return res.json();
};
