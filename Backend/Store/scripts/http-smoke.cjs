#!/usr/bin/env node

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');

const checks = [
  {
    name: 'health',
    path: '/health',
    validate: (json) =>
      typeof json === 'object' &&
      json !== null &&
      ['ok', 'degraded'].includes(json.app) &&
      typeof json.timestamp === 'string',
  },
  {
    name: 'admin-health',
    path: '/admin/health',
    validate: (json) =>
      typeof json === 'object' &&
      json !== null &&
      ['ok', 'degraded'].includes(json.app),
  },
  {
    name: 'admin-infortisa-health',
    path: '/admin/infortisa/health',
    validate: (json) =>
      typeof json === 'object' &&
      json !== null &&
      json.healthy === true &&
      typeof json.timestamp === 'string',
  },
];

async function run() {
  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    const response = await fetch(url, {
      headers: {
        'x-request-id': `smoke-${Date.now()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`${check.name}: expected HTTP 200, got ${response.status}`);
    }

    const responseRequestId = response.headers.get('x-request-id');
    if (!responseRequestId) {
      throw new Error(`${check.name}: missing x-request-id response header`);
    }

    const json = await response.json();
    if (!check.validate(json)) {
      throw new Error(`${check.name}: invalid response payload shape`);
    }

    console.log(`✅ ${check.name} -> ${url}`);
  }
}

run().catch((error) => {
  console.error(`❌ smoke failed: ${error.message}`);
  process.exit(1);
});
