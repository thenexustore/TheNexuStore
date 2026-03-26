import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../common/prisma.service';
import { OrderStatus } from '@prisma/client';

describe('AdminService orders behavior', () => {
  const prisma = {
    order: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
    orderAdminNote: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    adminAuditLog: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const jwt = { sign: jest.fn() } as any;
  const categoriesService = {} as any;
  const orderTrackingEvents = {
    notifyByOrderIds: jest.fn(),
    notifyByOrderId: jest.fn(),
  } as any;

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(
      jwt,
      prisma,
      categoriesService,
      orderTrackingEvents,
    );
  });

  it('throws NotFoundException when adding note to missing order', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.addOrderNote('missing', 'note'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when order detail does not exist', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getOrderById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('persists an order admin note', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'o1' });
    (prisma.orderAdminNote.create as jest.Mock).mockResolvedValue({
      id: 'note-1',
    });

    const result = await service.addOrderNote('o1', 'packaging delayed', {
      staffId: 'staff-1',
      staffEmail: 'ops@example.com',
    });

    expect(prisma.orderAdminNote.create).toHaveBeenCalledWith({
      data: {
        order_id: 'o1',
        note: 'packaging delayed',
        author_staff_id: 'staff-1',
        author_staff_email: 'ops@example.com',
      },
    });
    expect(result.persisted_note_id).toBe('note-1');
  });

  it('bulk updates order status with deduplicated ids', async () => {
    (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

    const result = await service.bulkUpdateOrderStatus(
      ['o1', 'o2', 'o1'],
      'PROCESSING' as any,
    );

    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['o1', 'o2'] } },
      data: { status: 'PROCESSING' },
    });
    expect(result).toEqual({
      affected: 2,
      ids: ['o1', 'o2'],
      status: 'PROCESSING',
    });
  });

  it('prevents releasing hold when order is not ON_HOLD', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'o2',
      status: OrderStatus.PAID,
      shipments: [],
    });

    await expect(
      service.performOrderAction('o2', { action: 'RELEASE_HOLD' as any }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
