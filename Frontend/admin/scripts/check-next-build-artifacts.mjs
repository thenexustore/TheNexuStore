import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = process.cwd();
const buildIdPath = resolve(root, '.next/BUILD_ID');
const localeRouteRoot = resolve(root, '.next/server/app');

function walk(dir, matcher, hits = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, matcher, hits);
      continue;
    }
    if (matcher(fullPath)) {
      hits.push(fullPath);
    }
  }
  return hits;
}

if (!existsSync(buildIdPath)) {
  console.error(`Missing required Next build artifact: ${buildIdPath}`);
  process.exit(1);
}

if (!existsSync(localeRouteRoot) || !statSync(localeRouteRoot).isDirectory()) {
  console.error(`Missing Next app server output directory: ${localeRouteRoot}`);
  process.exit(1);
}

const manifests = walk(
  localeRouteRoot,
  (filePath) =>
    filePath.includes(`${join('app', '[locale]')}`) &&
    /client-reference-manifest/i.test(filePath),
);

if (manifests.length === 0) {
  console.error(
    'Missing client reference manifest for /[locale] route under .next/server/app/**/[locale]/**',
  );
  process.exit(1);
}

console.log('Next build artifact guard passed.');
