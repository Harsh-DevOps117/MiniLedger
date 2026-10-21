import { Platform } from 'react-native';
import type { ApiErrorBody, CreateLoanInput, Loan, Session, Summary } from '@miniledger/contracts';
import type { ImagePickerAsset } from 'expo-image-picker';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
export class ApiClient {
  constructor(
    private token: string | null = null,
    private onUnauthorized: () => void = () => {},
  ) {}
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const headers = new Headers(options.headers);
      if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
      if (typeof options.body === 'string') headers.set('Content-Type', 'application/json');
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        if (response.status === 401 && this.token) this.onUnauthorized();
        const error = body as ApiErrorBody;
        throw new Error(
          error.error?.details?.map((detail) => detail.message).join('\n') ||
            error.error?.message ||
            'Request failed.',
        );
      }
      return body as T;
    } catch (error) {
      if (controller.signal.aborted)
        throw new Error('The request timed out. Refresh your ledger before retrying a save.', {
          cause: error,
        });
      if (error instanceof TypeError)
        throw new Error('Cannot reach MiniLedger. Check your connection and API URL.', {
          cause: error,
        });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  requestOtp(phone: string) {
    return this.request<{ retryAfterSeconds: number }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }
  verifyOtp(phone: string, otp: string) {
    return this.request<Session>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }
  list(offset = 0) {
    return this.request<{ entries: Loan[]; nextOffset: number | null }>(
      `/loans?limit=20&offset=${offset}`,
    );
  }
  summary() {
    return this.request<Summary>('/loans/summary');
  }
  repay(id: string) {
    return this.request<Loan>(`/loans/${id}/repay`, { method: 'PATCH' });
  }
  receipt(id: string) {
    return this.request<{ dataUri: string }>(`/loans/${id}/receipt`);
  }
  async create(input: CreateLoanInput, receipt: ImagePickerAsset | null) {
    if (!receipt)
      return this.request<Loan>('/loans', { method: 'POST', body: JSON.stringify(input) });
    const data = new FormData();
    Object.entries(input).forEach(([key, value]) => data.append(key, value));
    if (Platform.OS === 'web') {
      const blob = receipt.file ?? (await (await fetch(receipt.uri)).blob());
      data.append('receipt', blob, receipt.fileName ?? 'receipt.jpg');
    } else {
      // React Native's FormData accepts a URI descriptor instead of a browser Blob.
      data.append('receipt', {
        uri: receipt.uri,
        name: receipt.fileName ?? 'receipt.jpg',
        type: receipt.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
    }
    return this.request<Loan>('/loans', { method: 'POST', body: data });
  }
}
