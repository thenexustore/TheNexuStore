import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const auth = {
    login: jest.fn(),
    verifyOtp: jest.fn(),
    register: jest.fn(),
    resendOtp: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    getMe: jest.fn(),
    updateProfile: jest.fn(),
    googleLogin: jest.fn(),
  } as any;

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(auth);
  });

  afterEach(() => {
    delete process.env.COOKIE_DOMAIN;
    delete process.env.NODE_ENV;
  });

  it('sets the auth cookie on login using production-safe options', async () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_DOMAIN = '.thenexustore.com';

    auth.login.mockResolvedValue({
      accessToken: 'token-value',
      user: { id: 'customer-1', email: 'customer@example.com' },
    });

    const res = {
      cookie: jest.fn(),
    } as any;

    const result = await controller.login(
      { email: 'customer@example.com', password: 'secret123' } as any,
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'token-value',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.thenexustore.com',
        path: '/',
      }),
    );
    expect(result).toEqual({
      success: true,
      user: { id: 'customer-1', email: 'customer@example.com' },
    });
  });

  it('sets the auth cookie when otp verification succeeds', async () => {
    auth.verifyOtp.mockResolvedValue({
      success: true,
      accessToken: 'otp-token',
      user: { id: 'customer-2', email: 'verify@example.com' },
    });

    const res = {
      cookie: jest.fn(),
    } as any;

    const result = await controller.verifyOtp(
      { email: 'verify@example.com', otp: '123456' } as any,
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'otp-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    );
    expect(result).toEqual({
      success: true,
      user: { id: 'customer-2', email: 'verify@example.com' },
    });
  });

  it('clears auth and csrf cookies on logout', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_DOMAIN = '.thenexustore.com';

    const res = {
      clearCookie: jest.fn(),
    } as any;

    const result = controller.logout(res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.thenexustore.com',
        path: '/',
      }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.objectContaining({
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        domain: '.thenexustore.com',
        path: '/',
      }),
    );
    expect(result).toEqual({ success: true });
  });
});
