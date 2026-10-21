import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ApiClient } from '../../apps/mobile/src/lib/api';
// Exercise the installed SDK's real encoder: browser FormData alone misses this native bug.
import { installFormDataPatch } from '../../node_modules/expo/src/winter/FormData';
import { convertFormDataAsync } from '../../node_modules/expo/src/winter/fetch/convertFormData';

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-file-system', () => ({
  // Only OS file access is mocked; the Expo FormData patch and multipart encoder are real.
  File: class {
    name = 'receipt.png';
    type = 'image/png';
    constructor(public uri: string) {}
    async bytes() {
      return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    }
  },
}));

const BrowserFormData = globalThis.FormData;
const input = { friendName: 'Aditi', amount: '1250.50', dueDate: '2026-10-24' };
const receipt: ImagePickerAsset = {
  uri: 'file:///cache/receipt.png',
  width: 1,
  height: 1,
  mimeType: 'image/png',
  fileName: 'receipt.png',
};

beforeEach(() => {
  Platform.OS = 'android';
  class NativeFormData {
    _parts: [string, unknown][] = [];
  }
  vi.stubGlobal('FormData', installFormDataPatch(NativeFormData as unknown as typeof FormData));
});
afterEach(() => vi.unstubAllGlobals());

describe('mobile receipt uploads with Expo 57', () => {
  it('serializes native file bytes and loan fields with the actual Expo multipart encoder', async () => {
    let decoded: FormData | undefined;
    const request = vi.fn(async (_url: string, options: RequestInit) => {
      expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-token');
      // fetch must set the boundary; setting application/json or multipart here breaks uploads.
      expect(new Headers(options.headers).has('Content-Type')).toBe(false);
      const { body, boundary } = await convertFormDataAsync(options.body as FormData);
      decoded = await new Response(body, {
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      }).formData();
      return Response.json({ id: 'saved-loan', hasReceipt: true });
    });
    vi.stubGlobal('fetch', request);

    await expect(new ApiClient('test-token').create(input, receipt)).resolves.toMatchObject({
      id: 'saved-loan',
      hasReceipt: true,
    });
    expect(request).toHaveBeenCalledTimes(1);
    for (const [name, value] of Object.entries(input)) expect(decoded?.get(name)).toBe(value);
    const uploaded = decoded?.get('receipt') as File;
    expect(uploaded.name).toBe('receipt.png');
    expect(uploaded.type).toBe('image/png');
    expect(new Uint8Array(await uploaded.arrayBuffer())).toEqual(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    );
  });

  it('confirms the old URI-only part reproduces the reported error', async () => {
    const data = new FormData();
    data.append('receipt', {
      uri: receipt.uri,
      name: 'receipt.png',
      type: 'image/png',
    } as unknown as Blob);
    await expect(convertFormDataAsync(data)).rejects.toThrow(
      'Unsupported FormDataPart implementation',
    );
  });

  it('still sends JSON when no receipt is attached', async () => {
    const request = vi.fn(async (_url: string, options: RequestInit) => {
      expect(new Headers(options.headers).get('Content-Type')).toBe('application/json');
      expect(JSON.parse(options.body as string)).toEqual(input);
      return Response.json({ id: 'saved-loan', hasReceipt: false });
    });
    vi.stubGlobal('fetch', request);
    await expect(new ApiClient('test-token').create(input, null)).resolves.toMatchObject({
      hasReceipt: false,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('keeps browser file uploads compatible with standard FormData', async () => {
    Platform.OS = 'web';
    vi.stubGlobal('FormData', BrowserFormData);
    const file = new File(['browser receipt'], 'browser.png', { type: 'image/png' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options: RequestInit) => {
        const data = options.body as FormData;
        expect(data.get('friendName')).toBe(input.friendName);
        expect(await (data.get('receipt') as File).text()).toBe('browser receipt');
        return Response.json({ id: 'saved-loan', hasReceipt: true });
      }),
    );
    await expect(new ApiClient().create(input, { ...receipt, file })).resolves.toMatchObject({
      hasReceipt: true,
    });
  });
});
