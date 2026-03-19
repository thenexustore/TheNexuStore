import { corsOriginDelegate, isAllowedCorsOrigin } from './cors.util';

describe('cors.util', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      FRONTEND_URL: 'http://localhost:3000',
      ADMIN_URL: 'http://localhost:3001',
      CORS_ORIGINS: 'http://localhost:4000',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows configured localhost origins', () => {
    expect(isAllowedCorsOrigin('http://localhost:3001')).toBe(true);
  });

  it('allows private-network origins in development', () => {
    expect(isAllowedCorsOrigin('http://192.168.1.16:3001')).toBe(true);
    expect(isAllowedCorsOrigin('http://10.0.0.25:3000')).toBe(true);
  });

  it('rejects private-network origins in production unless configured', () => {
    process.env.NODE_ENV = 'production';

    expect(isAllowedCorsOrigin('http://192.168.1.16:3001')).toBe(false);
  });

  it('invokes the callback with an error for blocked origins', () => {
    const callback = jest.fn();

    corsOriginDelegate('https://malicious.example.com', callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(callback.mock.calls[0]?.[0]?.message).toContain(
      'https://malicious.example.com',
    );
  });
});
