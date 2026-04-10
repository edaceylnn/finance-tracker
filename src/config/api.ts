import { Platform } from 'react-native';

export const DEV_API_HOST = '';

const EMULATOR_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001'
    : 'http://127.0.0.1:3001';

function resolveOverride(): string | null {
  const host = typeof DEV_API_HOST === 'string' ? DEV_API_HOST.trim() : '';
  if (host !== '') {
    return `http://${host}:3001`;
  }
  return null;
}

export const API_BASE_URL = resolveOverride() ?? EMULATOR_BASE_URL;
