import { ServiceUnavailableException } from '@nestjs/common';
import { GoogleAuthGuard } from './google-auth.guard';

describe('GoogleAuthGuard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when Google OAuth is disabled', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    const guard = new GoogleAuthGuard();

    expect(() => guard.canActivate({} as any)).toThrow(
      ServiceUnavailableException,
    );
    expect(() => guard.canActivate({} as any)).toThrow(
      'Google OAuth is disabled in this environment.',
    );
  });
});
