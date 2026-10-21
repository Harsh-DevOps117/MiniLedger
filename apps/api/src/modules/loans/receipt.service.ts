import sharp from 'sharp';
import { RECEIPT_MAX_BYTES } from '@miniledger/contracts';
import { AppError } from '../../lib/errors';

export async function normalizeReceipt(buffer: Buffer): Promise<Buffer> {
  if (buffer.length > RECEIPT_MAX_BYTES)
    throw new AppError(413, 'RECEIPT_TOO_LARGE', 'Receipt must be 2 MB or smaller.');
  try {
    const image = sharp(buffer, { limitInputPixels: 12000000, animated: false });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? ''))
      throw new Error('Unsupported image');
    // Decode, rotate, downsize and re-encode: strips EXIF and rejects disguised files.
    return await image
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    throw new AppError(
      400,
      'INVALID_RECEIPT',
      'Choose a valid JPEG, PNG or WebP photo (up to 12 megapixels).',
    );
  }
}
