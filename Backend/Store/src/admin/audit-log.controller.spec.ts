import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

describe('AuditLogController', () => {
  const auditLogService = {
    list: jest.fn(),
    logAction: jest.fn(),
  } as unknown as AuditLogService;

  let controller: AuditLogController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuditLogController(auditLogService);
  });

  it('forwards validated query filters and writes audit trail', async () => {
    (auditLogService.list as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    const req = {
      user: { id: 'staff-1', email: 'admin@test.com', role: 'ADMIN' },
      method: 'GET',
      originalUrl: '/admin/audit-logs',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('jest'),
    } as any;

    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-01-31T23:59:59.999Z');

    await controller.getAuditLogs(req, {
      page: 2,
      limit: 25,
      actorEmail: 'admin@',
      action: 'PRODUCT_CREATED',
      resource: 'PRODUCT',
      from,
      to,
    });

    expect(auditLogService.list).toHaveBeenCalledWith({
      page: 2,
      limit: 25,
      actorEmail: 'admin@',
      action: 'PRODUCT_CREATED',
      resource: 'PRODUCT',
      from,
      to,
    });

    expect(auditLogService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUDIT_LOGS_VIEWED',
        resource: 'ADMIN_AUDIT_LOG',
        metadata: { page: 2, limit: 25 },
      }),
    );
  });
});
