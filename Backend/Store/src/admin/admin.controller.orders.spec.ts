import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';

describe('AdminController orders flows', () => {
  const adminService = {
    getOrders: jest.fn(),
    addOrderNote: jest.fn(),
    bulkUpdateOrderStatus: jest.fn(),
  } as unknown as AdminService;

  const auditLogService = {
    logAction: jest.fn(),
  } as unknown as AuditLogService;

  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminController(adminService, auditLogService);
  });

  it('delegates orders list with validated query values', async () => {
    (adminService.getOrders as jest.Mock).mockResolvedValue({
      orders: [],
      total: 0,
    });

    await controller.getOrders({
      page: 2,
      limit: 15,
      status: 'PAID',
      search: 'john',
    });

    expect(adminService.getOrders).toHaveBeenCalledWith(2, 15, 'PAID', 'john');
  });

  it('throws bad request when note is blank', async () => {
    const req = {
      method: 'POST',
      originalUrl: '/admin/orders/o1/notes',
      ip: '127.0.0.1',
      get: jest.fn(),
      user: { id: 's1', email: 'admin@test.com' },
    } as any;

    await expect(
      controller.addOrderNote('o1', { note: '   ' }, req),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(adminService.addOrderNote).not.toHaveBeenCalled();
  });

  it('bulk updates order status and emits audit event', async () => {
    (adminService.bulkUpdateOrderStatus as jest.Mock).mockResolvedValue({
      affected: 2,
      ids: ['o1', 'o2'],
      status: 'PROCESSING',
    });

    const req = {
      method: 'PUT',
      originalUrl: '/admin/orders/bulk/status',
      ip: '127.0.0.1',
      get: jest.fn((h: string) => (h === 'x-request-id' ? 'req-1' : 'jest')),
      user: { id: 's1', email: 'admin@test.com' },
    } as any;

    const result = await controller.bulkUpdateOrderStatus(
      { ids: ['o1', 'o2'], status: 'PROCESSING' as any },
      req,
    );

    expect(adminService.bulkUpdateOrderStatus).toHaveBeenCalledWith(
      ['o1', 'o2'],
      'PROCESSING',
    );
    expect(auditLogService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ORDER_BULK_STATUS_UPDATED',
        requestId: 'req-1',
      }),
    );
    expect(result.success).toBe(true);
  });
});
