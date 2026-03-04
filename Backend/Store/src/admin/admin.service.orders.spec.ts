import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../common/prisma.service';

describe('AdminService orders behavior', () => {
  const prisma = {
    order: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const jwt = { sign: jest.fn() } as any;
  const categoriesService = {} as any;

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(jwt, prisma, categoriesService);
  });

  it('throws NotFoundException when adding note to missing order', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.addOrderNote('missing', 'note')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when order detail does not exist', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getOrderById('missing')).rejects.toBeInstanceOf(NotFoundException);
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
});
