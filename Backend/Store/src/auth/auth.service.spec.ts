import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockedBcrypt = jest.requireMock('bcrypt') as {
  compare: jest.Mock;
  hash: jest.Mock;
};

describe('AuthService', () => {
  const prisma = {
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    customerAddress: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const jwt = { sign: jest.fn().mockReturnValue('signed-token') } as any;
  const mail = { sendOtp: jest.fn() } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwt, mail);
  });

  it('normalizes email during login and returns a session payload', async () => {
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
      id: 'customer-1',
      email: 'customer@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
      password_hash: 'stored-hash',
      role: 'CUSTOMER',
      profile_image: null,
      created_at: new Date('2026-03-01T00:00:00.000Z'),
      is_active: true,
    });
    mockedBcrypt.compare.mockResolvedValue(true);

    const result = await service.login({
      email: '  CUSTOMER@EXAMPLE.COM  ',
      password: 'secret123',
    });

    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: { email: 'customer@example.com' },
    });
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'customer-1',
      role: 'CUSTOMER',
    });
    expect(result).toEqual({
      accessToken: 'signed-token',
      user: expect.objectContaining({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    });
  });

  it('activates a verified user and returns a new auth session', async () => {
    const createdAt = new Date('2026-03-02T00:00:00.000Z');
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
      id: 'customer-2',
      email: 'verify@example.com',
      first_name: 'Veri',
      last_name: 'Fy',
      role: 'CUSTOMER',
      profile_image: null,
      created_at: createdAt,
      otp_code: '123456',
      otp_expires_at: new Date(Date.now() + 60_000),
    });
    (prisma.customer.update as jest.Mock).mockResolvedValue({
      id: 'customer-2',
      email: 'verify@example.com',
      first_name: 'Veri',
      last_name: 'Fy',
      role: 'CUSTOMER',
      profile_image: null,
      created_at: createdAt,
      is_active: true,
      otp_code: null,
      otp_expires_at: null,
    });

    const result = await service.verifyOtp(' VERIFY@example.com ', '123456');

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { email: 'verify@example.com' },
      data: {
        is_active: true,
        otp_code: null,
        otp_expires_at: null,
      },
    });
    expect(result).toEqual({
      success: true,
      accessToken: 'signed-token',
      user: expect.objectContaining({
        id: 'customer-2',
        email: 'verify@example.com',
      }),
    });
  });

  it('reactivates existing Google users and clears stale otp state', async () => {
    const createdAt = new Date('2026-03-03T00:00:00.000Z');
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
      id: 'customer-3',
      email: 'google@example.com',
      first_name: '',
      last_name: '',
      role: 'CUSTOMER',
      profile_image: null,
      created_at: createdAt,
      is_active: false,
      otp_code: '654321',
      otp_expires_at: new Date(Date.now() + 60_000),
    });
    (prisma.customer.update as jest.Mock).mockResolvedValue({
      id: 'customer-3',
      email: 'google@example.com',
      first_name: 'Go',
      last_name: 'Ogle',
      role: 'CUSTOMER',
      profile_image: 'https://example.com/avatar.png',
      created_at: createdAt,
      is_active: true,
      otp_code: null,
      otp_expires_at: null,
    });

    const result = await service.googleLogin({
      email: ' GOOGLE@example.com ',
      firstName: 'Go',
      lastName: 'Ogle',
      picture: 'https://example.com/avatar.png',
    });

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-3' },
      data: {
        is_active: true,
        otp_code: null,
        otp_expires_at: null,
        first_name: 'Go',
        last_name: 'Ogle',
        profile_image: 'https://example.com/avatar.png',
      },
    });
    expect(result.user.email).toBe('google@example.com');
  });

  it('rejects invalid login credentials', async () => {
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'secret123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired otp codes', async () => {
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
      id: 'customer-4',
      email: 'expired@example.com',
      otp_code: '000000',
      otp_expires_at: new Date(Date.now() - 60_000),
    });

    await expect(
      service.verifyOtp('expired@example.com', '000000'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
