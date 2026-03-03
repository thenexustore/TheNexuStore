import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const hasProxy = existsSync(resolve(root, 'proxy.ts'));
const hasMiddleware = existsSync(resolve(root, 'middleware.ts'));

if (hasProxy && hasMiddleware) {
  console.error(
    'Invalid Next.js runtime routing setup: both proxy.ts and middleware.ts exist. Remove middleware.ts when proxy.ts is present.',
  );
  process.exit(1);
}

if (!hasProxy && !hasMiddleware) {
  console.error(
    'Invalid Next.js runtime routing setup: one of proxy.ts or middleware.ts must exist.',
  );
  process.exit(1);
}

console.log('Runtime routing guard passed.');
