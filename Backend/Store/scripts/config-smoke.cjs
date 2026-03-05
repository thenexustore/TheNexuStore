require('ts-node/register/transpile-only');

const { validateEnvironment } = require('../src/config/env.validation');

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/nexustore',
  JWT_SECRET: 'smoke-secret',
};

const scenarios = [
  {
    name: 'minimal required env',
    env: baseEnv,
    shouldThrow: false,
  },
  {
    name: 'full integrations enabled',
    env: {
      ...baseEnv,
      REDIS_URL: 'redis://localhost:6379',
      RABBITMQ_URL: 'amqp://localhost:5672',
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_CALLBACK_URL: 'https://admin.thenexustore.com/auth/google/callback',
    },
    shouldThrow: false,
  },
  {
    name: 'google oauth disabled',
    env: {
      ...baseEnv,
      REDIS_URL: 'redis://localhost:6379',
      RABBITMQ_URL: 'amqp://localhost:5672',
    },
    shouldThrow: false,
  },
  {
    name: 'invalid oauth partial credentials',
    env: {
      ...baseEnv,
      GOOGLE_CLIENT_ID: 'client-id',
    },
    shouldThrow: true,
  },
];

let failed = false;

for (const scenario of scenarios) {
  try {
    validateEnvironment(scenario.env);
    if (scenario.shouldThrow) {
      console.error(`❌ ${scenario.name}: expected failure but passed`);
      failed = true;
    } else {
      console.log(`✅ ${scenario.name}`);
    }
  } catch (error) {
    if (scenario.shouldThrow) {
      console.log(`✅ ${scenario.name} (failed as expected: ${error.message})`);
    } else {
      console.error(`❌ ${scenario.name}: ${error.message}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
