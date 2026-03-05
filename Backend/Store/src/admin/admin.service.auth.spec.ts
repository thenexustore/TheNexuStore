import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AdminService } from './admin.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockedBcrypt = jest.requireMock('bcrypt') as {
  compare: jest.Mock;
  hash: jest.Mock;
};

describe('AdminService auth', () => {
  const prisma = {
    staff: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
    adminAuditLog: {
      findMany: jest.fn(),
    },
    brand: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const jwt = { sign: jest.fn().mockReturnValue('token') } as any;
  const categoriesService = {} as any;

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(jwt, prisma, categoriesService);
  });

  it('returns staff token payload on valid credentials', async () => {
    (prisma.staff.findUnique as jest.Mock).mockResolvedValue({
      id: 's1',
      email: 'admin@test.com',
      role: 'ADMIN',
      warehouse_id: null,
      is_active: true,
      password_hash: 'hash',
    });
    mockedBcrypt.compare.mockResolvedValue(true);

    const result = await service.login('Admin@Test.com', 'secret');

    expect(prisma.staff.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@test.com' },
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'STAFF', role: 'ADMIN', sub: 's1' }),
    );
    expect(result.user.permissions).toEqual(['full_access']);
  });

  it('throws unauthorized when credentials are invalid', async () => {
    (prisma.staff.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.login('missing@test.com', 'secret')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('creates default admin if missing on module init', async () => {
    (prisma.staff.findUnique as jest.Mock).mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-default-password');

    await service.onModuleInit();

    expect(prisma.staff.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'admin@thenexusstore.com',
        password_hash: 'hashed-default-password',
        role: 'ADMIN',
        is_active: true,
      }),
    });
  });

  it('reactivates existing default admin when inactive', async () => {
    (prisma.staff.findUnique as jest.Mock).mockResolvedValue({
      id: 'staff-1',
      email: 'admin@thenexusstore.com',
      role: 'ADMIN',
      is_active: false,
    });
    mockedBcrypt.hash.mockResolvedValue('rehashed-default-password');

    await service.onModuleInit();

    expect(prisma.staff.update).toHaveBeenCalledWith({
      where: { id: 'staff-1' },
      data: {
        is_active: true,
        password_hash: 'rehashed-default-password',
      },
    });
    expect(prisma.staff.create).not.toHaveBeenCalled();
  });

  it('synchronizes role and password when default admin exists', async () => {
    (prisma.staff.findUnique as jest.Mock).mockResolvedValue({
      id: 'staff-2',
      email: 'admin@thenexusstore.com',
      role: 'WAREHOUSE',
      is_active: true,
    });
    mockedBcrypt.hash.mockResolvedValue('updated-default-password');

    await service.onModuleInit();

    expect(prisma.staff.update).toHaveBeenCalledWith({
      where: { id: 'staff-2' },
      data: {
        role: 'ADMIN',
        password_hash: 'updated-default-password',
      },
    });
  });

  it('self-heals default admin account during login with default credentials', async () => {
    (prisma.staff.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'staff-3',
        email: 'admin@thenexusstore.com',
        role: 'ADMIN',
        warehouse_id: null,
        is_active: true,
        password_hash: 'rehash',
      });
    mockedBcrypt.hash.mockResolvedValue('rehash');
    mockedBcrypt.compare.mockResolvedValue(true);

    const result = await service.login('admin@thenexusstore.com', 'Suraj@123');

    expect(prisma.staff.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'admin@thenexusstore.com',
        role: 'ADMIN',
      }),
    });
    expect(result.user.email).toBe('admin@thenexusstore.com');
  });
});
