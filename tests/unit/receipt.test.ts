import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { normalizeReceipt } from '../../apps/api/src/modules/loans/receipt.service';
import { RECEIPT_MAX_BYTES } from '@miniledger/contracts';

describe('receipt processing', () => {
  it('decodes an actual image and stores only a normalized JPEG', async () => {
    const input = await sharp({
      create: { width: 1800, height: 900, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    const output = await normalizeReceipt(input);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(1600);
    expect(meta.exif).toBeUndefined();
  });
  it('rejects disguised files', async () => {
    await expect(normalizeReceipt(Buffer.from('<script>alert(1)</script>'))).rejects.toMatchObject({
      code: 'INVALID_RECEIPT',
    });
  });
  it('rejects oversized uploads before decoding', async () => {
    await expect(normalizeReceipt(Buffer.alloc(RECEIPT_MAX_BYTES + 1))).rejects.toMatchObject({
      status: 413,
    });
  });
});
