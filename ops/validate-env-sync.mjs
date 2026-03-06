#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const files = {
  sync: path.join(repoRoot, 'ops/env.sync.example'),
  backend: path.join(repoRoot, 'Backend/Store/.env.example'),
  storefront: path.join(repoRoot, 'Frontend/Store/.env.example'),
  admin: path.join(repoRoot, 'Frontend/admin/.env.example'),
};

const REQUIRED_BY_SERVICE = {
  backend: ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL', 'ADMIN_URL', 'CORS_ORIGINS'],
  storefront: ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SITE_URL'],
  admin: ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SITE_URL'],
};

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const map = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!key) continue;
    map.set(key, value.replace(/^"|"$/g, ''));
  }

  return map;
}

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${path.relative(repoRoot, filePath)}`);
  }
}

function ensureKeysExist(sourceName, sourceMap, keys) {
  const missing = keys.filter((key) => !sourceMap.has(key));
  if (missing.length > 0) {
    throw new Error(
      `${sourceName} is missing required keys: ${missing.join(', ')}`,
    );
  }
}

function compareSharedKey(syncMap, targetMap, serviceName, key) {
  const syncValue = syncMap.get(key);
  const targetValue = targetMap.get(key);

  if (syncValue !== targetValue) {
    throw new Error(
      `${serviceName} key ${key} is out of sync. ` +
        `sync=${JSON.stringify(syncValue)} target=${JSON.stringify(targetValue)}`,
    );
  }
}

try {
  Object.values(files).forEach(assertFileExists);

  const syncEnv = parseEnv(files.sync);
  const backendEnv = parseEnv(files.backend);
  const storefrontEnv = parseEnv(files.storefront);
  const adminEnv = parseEnv(files.admin);

  ensureKeysExist('ops/env.sync.example', syncEnv, [
    ...REQUIRED_BY_SERVICE.backend,
    ...REQUIRED_BY_SERVICE.storefront,
  ]);

  ensureKeysExist('Backend/Store/.env.example', backendEnv, REQUIRED_BY_SERVICE.backend);
  ensureKeysExist('Frontend/Store/.env.example', storefrontEnv, REQUIRED_BY_SERVICE.storefront);
  ensureKeysExist('Frontend/admin/.env.example', adminEnv, REQUIRED_BY_SERVICE.admin);

  const syncPairs = [
    ['backend', backendEnv, 'FRONTEND_URL'],
    ['backend', backendEnv, 'ADMIN_URL'],
    ['backend', backendEnv, 'CORS_ORIGINS'],
    ['storefront', storefrontEnv, 'NEXT_PUBLIC_API_URL'],
    ['storefront', storefrontEnv, 'NEXT_PUBLIC_SITE_URL'],
    ['admin', adminEnv, 'NEXT_PUBLIC_API_URL'],
    ['admin', adminEnv, 'NEXT_PUBLIC_SITE_URL'],
  ];

  for (const [serviceName, serviceEnv, key] of syncPairs) {
    compareSharedKey(syncEnv, serviceEnv, serviceName, key);
  }

  console.log('✅ Environment sync validation passed.');
} catch (error) {
  console.error(`❌ Environment sync validation failed: ${(error).message}`);
  process.exitCode = 1;
}
