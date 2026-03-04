import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AdminService } from './admin.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockedBcrypt = jest.requireMock('bcrypt') as { compare: jest.Mock };

describe('AdminService auth', () => {
  const prisma = {
    staff: {
      findUnique: jest.fn(),
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
});
