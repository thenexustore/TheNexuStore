import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma.service';

describe('DashboardService alerts', () => {
  const prisma = {
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    syncLog: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(prisma);

    (prisma.order.count as jest.Mock)
      .mockResolvedValueOnce(3) // todayOrders
      .mockResolvedValueOnce(2); // pendingOrdersCount
    (prisma.order.aggregate as jest.Mock).mockResolvedValue({
      _sum: { total_amount: 100 },
    });
    (prisma.product.count as jest.Mock)
      .mockResolvedValueOnce(120) // total products
      .mockResolvedValueOnce(100); // active products
    (prisma.customer.count as jest.Mock).mockResolvedValue(50);
    (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('adds stale import warning when latest sync is older than 24h', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    (prisma.syncLog.findMany as jest.Mock).mockResolvedValue([
      { type: 'manual_stock', last_sync: oldDate, details: 'ok' },
    ]);

    const result = await service.getDashboardStats();

    expect(result.alerts.some((a: any) => a.id === 'imports-stale')).toBe(true);
  });

  it('adds error alert when import details indicate failure', async () => {
    const recent = new Date();
    (prisma.syncLog.findMany as jest.Mock).mockResolvedValue([
      {
        type: 'manual_full',
        last_sync: recent,
        details: 'FAILED at supplier endpoint',
      },
    ]);

    const result = await service.getDashboardStats();

    expect(result.alerts.some((a: any) => a.id === 'imports-failed')).toBe(
      true,
    );
  });
});
