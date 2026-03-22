import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export async function saveBase64Image(base64: string, subDir = 'products') {
  const matches = base64.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid base64 image');

  const mimeType = matches[1].toLowerCase();
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!allowed.includes(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }

  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
  const buffer = Buffer.from(matches[2], 'base64');

  const maxBytes = 5 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error('Image must not exceed 5 MB');
  }

  const fileName = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), `public/uploads/${subDir}`);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  return `/uploads/${subDir}/${fileName}`;
}
