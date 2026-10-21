import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'miniledger.onboarding.v1';

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value =
    Platform.OS === 'web' ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  return value === 'done';
}

export async function saveOnboardingCompletion(): Promise<void> {
  if (Platform.OS === 'web') localStorage.setItem(KEY, 'done');
  else await SecureStore.setItemAsync(KEY, 'done');
}
