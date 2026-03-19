import { Logger } from '@nestjs/common';

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const;

function assertValidUrl(name: string, value: string) {
  try {
    new URL(value);
  } catch {
    throw new Error(
      `Invalid environment variable: ${name} must be a valid URL. Received "${value}".`,
    );
  }
}

export function validateEnvironment(env = process.env) {
  const logger = new Logger('Bootstrap');

  for (const key of REQUIRED_ENV_VARS) {
    if (!env[key]) {
      throw new Error(
        `Missing required environment variable: ${key}. Please set ${key} before starting the backend.`,
      );
    }
  }

  if (env.DATABASE_URL) {
    assertValidUrl('DATABASE_URL', env.DATABASE_URL);
  }

  if (env.REDIS_URL) {
    assertValidUrl('REDIS_URL', env.REDIS_URL);
  } else {
    logger.warn(
      'REDIS_URL is not configured. Redis-backed features are disabled.',
    );
  }

  if (env.RABBITMQ_URL) {
    assertValidUrl('RABBITMQ_URL', env.RABBITMQ_URL);
  } else {
    logger.warn(
      'RABBITMQ_URL is not configured. RabbitMQ-backed features are disabled.',
    );
  }

  if (env.REDSYS_URL) {
    assertValidUrl('REDSYS_URL', env.REDSYS_URL);
  }

  if (env.REDSYS_NOTIFY_URL) {
    assertValidUrl('REDSYS_NOTIFY_URL', env.REDSYS_NOTIFY_URL);
  }

  if (env.REDSYS_OK_URL) {
    assertValidUrl('REDSYS_OK_URL', env.REDSYS_OK_URL);
  }

  if (env.REDSYS_KO_URL) {
    assertValidUrl('REDSYS_KO_URL', env.REDSYS_KO_URL);
  }

  if (env.REDSYS_ENV) {
    const mode = env.REDSYS_ENV.toLowerCase();
    if (mode !== 'test' && mode !== 'prod') {
      throw new Error(
        `Invalid environment variable: REDSYS_ENV must be "test" or "prod". Received "${env.REDSYS_ENV}".`,
      );
    }
  }

  const isProduction = (env.NODE_ENV ?? '').toLowerCase() === 'production';
  if (isProduction) {
    const requiredRedsysVars = [
      'REDSYS_MERCHANT_CODE',
      'REDSYS_TERMINAL',
      'REDSYS_SECRET_KEY',
      'REDSYS_NOTIFY_URL',
      'REDSYS_OK_URL',
      'REDSYS_KO_URL',
    ] as const;

    for (const variableName of requiredRedsysVars) {
      if (!env[variableName]) {
        throw new Error(
          `Missing required environment variable: ${variableName}. Configure Redsys production values before enabling checkout payments.`,
        );
      }
    }
  }

  if (
    !env.REDSYS_MERCHANT_CODE ||
    !env.REDSYS_TERMINAL ||
    !env.REDSYS_SECRET_KEY
  ) {
    logger.warn(
      'REDSYS merchant configuration is incomplete. Set REDSYS_MERCHANT_CODE, REDSYS_TERMINAL and REDSYS_SECRET_KEY.',
    );
  }

  const hasGoogleClientId = Boolean(env.GOOGLE_CLIENT_ID);
  const hasGoogleClientSecret = Boolean(env.GOOGLE_CLIENT_SECRET);

  if (hasGoogleClientId !== hasGoogleClientSecret) {
    throw new Error(
      'Google OAuth misconfiguration: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together or left empty to disable Google auth.',
    );
  }

  const googleEnabled = hasGoogleClientId && hasGoogleClientSecret;

  if (!googleEnabled) {
    logger.warn(
      'Google OAuth is disabled because GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not configured.',
    );
  } else {
    if (!env.GOOGLE_CALLBACK_URL) {
      throw new Error(
        'Missing required environment variable: GOOGLE_CALLBACK_URL. Set it when Google OAuth is enabled.',
      );
    }

    assertValidUrl('GOOGLE_CALLBACK_URL', env.GOOGLE_CALLBACK_URL);
  }

  const hasMailUser = Boolean(env.MAIL_USER);
  const hasMailPass = Boolean(env.MAIL_PASS);
  if (hasMailUser !== hasMailPass) {
    throw new Error(
      'Mail misconfiguration: MAIL_USER and MAIL_PASS must be provided together or left empty to disable OTP/order emails.',
    );
  }

  if (!hasMailUser && !hasMailPass) {
    logger.warn(
      'SMTP mail is disabled because MAIL_USER/MAIL_PASS are not configured. OTP and order emails will fail.',
    );
    return;
  }

  if (env.MAIL_HOST !== undefined && !env.MAIL_HOST.trim()) {
    throw new Error(
      'Invalid environment variable: MAIL_HOST cannot be empty when provided.',
    );
  }

  if (env.MAIL_PORT !== undefined) {
    const mailPort = Number(env.MAIL_PORT);
    if (!Number.isInteger(mailPort) || mailPort < 1 || mailPort > 65535) {
      throw new Error(
        `Invalid environment variable: MAIL_PORT must be a valid TCP port (1-65535). Received "${env.MAIL_PORT}".`,
      );
    }
  }

  if (env.MAIL_SECURE !== undefined) {
    const normalized = env.MAIL_SECURE.toLowerCase();
    const allowed = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
    if (!allowed.includes(normalized)) {
      throw new Error(
        `Invalid environment variable: MAIL_SECURE must be a boolean-like value (true/false/1/0/yes/no/on/off). Received "${env.MAIL_SECURE}".`,
      );
    }
  }
}
