import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'FAFT_DEVICE_ID';

function generateId(): string {
  const chars = 'abcdef0123456789';
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedId = stored;
      return stored;
    }
  } catch {}
  const newId = generateId();
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  } catch {}
  cachedId = newId;
  return newId;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const deviceId = await getDeviceId();
  const headers: Record<string, string> = {
    'X-Device-ID': deviceId,
    ...(options?.headers as Record<string, string> || {}),
  };
  return fetch(`${BACKEND_URL}${path}`, { ...options, headers });
}
