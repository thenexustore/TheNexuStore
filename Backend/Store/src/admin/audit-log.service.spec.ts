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
    (prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([
      { id: '1' },
    ]);
    (prisma.adminAuditLog.count as jest.Mock).mockResolvedValue(1);

    const result = await service.list({ page: 1, limit: 20 });

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalled();
    expect(result.total).toBe(1);
    expect(result.items).toEqual([{ id: '1' }]);
  });

  it('filters logs by requestId when provided', async () => {
    (prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.adminAuditLog.count as jest.Mock).mockResolvedValue(0);

    await service.list({ page: 1, limit: 20, requestId: 'req-42' });

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ request_id: 'req-42' }),
      }),
    );
  });

  it('adds requestId and shallow diff metadata when before/after provided', async () => {
    await service.logAction({
      action: 'PRICING_RULE_STATUS_CHANGED',
      resource: 'PRICING_RULE',
      requestId: 'req-123',
      before: { approval_status: 'PENDING' },
      after: { approval_status: 'APPROVED' },
      metadata: { from_status: 'PENDING', to_status: 'APPROVED' },
    });

    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PRICING_RULE_STATUS_CHANGED',
        request_id: 'req-123',
        metadata_json: expect.objectContaining({
          requestId: 'req-123',
          diff: {
            approval_status: {
              before: 'PENDING',
              after: 'APPROVED',
            },
          },
        }),
      }),
    });
  });
});
