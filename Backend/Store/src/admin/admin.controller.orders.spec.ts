import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';

describe('AdminController orders flows', () => {
  const adminService = {
    getOrders: jest.fn(),
    addOrderNote: jest.fn(),
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
    (adminService.getOrders as jest.Mock).mockResolvedValue({ orders: [], total: 0 });

    await controller.getOrders({ page: 2, limit: 15, status: 'PAID', search: 'john' });

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

    await expect(controller.addOrderNote('o1', { note: '   ' }, req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(adminService.addOrderNote).not.toHaveBeenCalled();
  });
});
