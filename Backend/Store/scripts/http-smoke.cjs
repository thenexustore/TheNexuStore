#!/usr/bin/env node

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');

function getPayload(json) {
  if (
    json &&
    typeof json === 'object' &&
    Object.prototype.hasOwnProperty.call(json, 'success')
  ) {
    return json.data;
  }

  return json;
}

const checks = [
  {
    name: 'health',
    path: '/health',
    validate: (json) => {
      const payload = getPayload(json);
      return (
        typeof json === 'object' &&
        json !== null &&
        typeof payload === 'object' &&
        payload !== null &&
        ['ok', 'degraded'].includes(payload.app) &&
        typeof payload.timestamp === 'string'
      );
    },
  },
  {
    name: 'admin-health',
    path: '/admin/health',
    validate: (json) => {
      const payload = getPayload(json);
      return (
        typeof payload === 'object' &&
        payload !== null &&
        ['ok', 'degraded'].includes(payload.app)
      );
    },
  },
  {
    name: 'admin-infortisa-health',
    path: '/admin/infortisa/health',
    validate: (json) => {
      const payload = getPayload(json);
      return (
        typeof payload === 'object' &&
        payload !== null &&
        payload.healthy === true &&
        typeof payload.timestamp === 'string'
      );
    },
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
