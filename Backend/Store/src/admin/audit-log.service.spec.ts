import { PrismaService } from '../common/prisma.service';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  const prisma = {
    adminAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: AuditLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditLogService(prisma);
  });

  it('creates an audit log entry', async () => {
    await service.logAction({
      action: 'PRODUCT_CREATED',
      resource: 'PRODUCT',
      actor: { id: 'staff-1', email: 'admin@test.com', role: 'ADMIN' },
    });

    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PRODUCT_CREATED',
        resource: 'PRODUCT',
        actor_id: 'staff-1',
      }),
    });
  });

  it('lists logs with pagination', async () => {
    (prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([{ id: '1' }]);
    (prisma.adminAuditLog.count as jest.Mock).mockResolvedValue(1);

    const result = await service.list({ page: 1, limit: 20 });

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalled();
    expect(result.total).toBe(1);
    expect(result.items).toEqual([{ id: '1' }]);
  });
});
