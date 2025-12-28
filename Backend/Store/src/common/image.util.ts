import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export async function saveBase64Image(base64: string) {
  const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid base64 image');

  const ext = matches[1].split('/')[1];
  const buffer = Buffer.from(matches[2], 'base64');

  const fileName = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public/uploads/products');

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  return `/uploads/products/${fileName}`;
}
