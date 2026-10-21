import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Session } from '@miniledger/contracts';
const KEY = 'miniledger.session';
export async function readSession(): Promise<Session | null> {
  const raw =
    Platform.OS === 'web' ? sessionStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Session>;
    return typeof value.token === 'string' &&
      typeof value.user?.id === 'string' &&
      typeof value.user?.phone === 'string'
      ? (value as Session)
      : null;
  } catch {
    return null;
  }
}
export async function writeSession(session: Session | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
    else sessionStorage.removeItem(KEY);
  } else if (session) await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(KEY);
}
