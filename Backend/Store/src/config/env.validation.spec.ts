import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  const baseEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'test-secret',
  };

  it('does not throw with minimum required variables', () => {
    expect(() => validateEnvironment(baseEnv)).not.toThrow();
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnvironment({ JWT_SECRET: 'test-secret' })).toThrow(
      'Missing required environment variable: DATABASE_URL',
    );
  });

  it('throws when only one Google OAuth credential is provided', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnv,
        GOOGLE_CLIENT_ID: 'client-id',
      }),
    ).toThrow('Google OAuth misconfiguration');
  });

  it('throws when Google OAuth is enabled without callback url', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnv,
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
      }),
    ).toThrow('Missing required environment variable: GOOGLE_CALLBACK_URL');
  });

  it('throws when REDIS_URL is invalid', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnv,
        REDIS_URL: 'not-url',
      }),
    ).toThrow('Invalid environment variable: REDIS_URL');
  });

  it('throws when REDSYS_URL is invalid', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnv,
        REDSYS_URL: 'not-url',
      }),
    ).toThrow('Invalid environment variable: REDSYS_URL');
  });

  it('throws when REDSYS_NOTIFY_URL is invalid', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnv,
        REDSYS_NOTIFY_URL: 'not-url',
      }),
    ).toThrow('Invalid environment variable: REDSYS_NOTIFY_URL');
  });

  it('throws when REDSYS_ENV is invalid', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnv,
        REDSYS_ENV: 'staging',
      }),
    ).toThrow('Invalid environment variable: REDSYS_ENV');
  });

  it('throws when REDSYS production vars are missing in production', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnv,
        NODE_ENV: 'production',
      }),
    ).toThrow('Missing required environment variable: REDSYS_MERCHANT_CODE');
  });
});
