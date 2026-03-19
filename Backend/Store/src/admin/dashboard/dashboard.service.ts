import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface DashboardAlert {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private buildSyncAlerts(
    syncLogs: Array<{ type: string; last_sync: Date; details?: string | null }>,
  ) {
    const alerts: DashboardAlert[] = [];

    if (syncLogs.length === 0) {
      alerts.push({
        id: 'imports-no-history',
        severity: 'warning',
        title: 'No import history available',
        description:
          'No synchronization jobs have been recorded yet. Run an initial import to validate supplier integration health.',
        ctaLabel: 'Open imports',
        ctaHref: '/imports',
      });
      return alerts;
    }

    const latestSync = [...syncLogs].sort(
      (a, b) => b.last_sync.getTime() - a.last_sync.getTime(),
    )[0];

    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (latestSync.last_sync.getTime() < twentyFourHoursAgo) {
      alerts.push({
        id: 'imports-stale',
        severity: 'warning',
        title: 'Import sync appears stale',
        description: `Last sync was at ${latestSync.last_sync.toISOString()}. Consider running a stock or full sync.`,
        ctaLabel: 'Run imports',
        ctaHref: '/imports',
      });
    }

    const failedLog = syncLogs.find((log) => {
      const details = String(log.details || '').toLowerCase();
      return (
        details.includes('fail') ||
        details.includes('error') ||
        details.includes('exception')
      );
    });

    if (failedLog) {
      alerts.push({
        id: 'imports-failed',
        severity: 'error',
        title: 'Recent import issues detected',
        description: `Import job "${failedLog.type}" reported an error in details. Review logs and rerun the job if needed.`,
        ctaLabel: 'Review imports',
        ctaHref: '/imports',
      });
    }

    return alerts;
  }

  async getDashboardStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        todayOrders,
        revenueData,
        totalProducts,
        totalCustomers,
        recentOrders,
        pendingOrdersCount,
        activeProducts,
        syncLogs,
      ] = await Promise.all([
        this.prisma.order.count({
          where: {
            created_at: { gte: today },
            status: 'PAID',
          },
        }),

        this.prisma.order.aggregate({
          where: {
            created_at: { gte: today },
            status: 'PAID',
          },
          _sum: { total_amount: true },
        }),

        this.prisma.product.count(),

        this.prisma.customer.count(),

        this.prisma.order.findMany({
          where: { status: 'PAID' },
          orderBy: { created_at: 'desc' },
          take: 5,
        }),

        this.prisma.order.count({
          where: { status: 'PENDING_PAYMENT' },
        }),

        this.prisma.product.count({
          where: { status: 'ACTIVE' },
        }),

        this.prisma.syncLog.findMany({
          orderBy: { last_sync: 'desc' },
          take: 10,
        }),
      ]);

      const alerts: DashboardAlert[] = [];
      const inactiveProducts = totalProducts - activeProducts;

      alerts.push(...this.buildSyncAlerts(syncLogs));

      if (pendingOrdersCount >= 20) {
        alerts.push({
          id: 'pending-orders-high',
          severity: 'error',
          title: 'High pending payments',
          description: `${pendingOrdersCount} orders are pending payment. Review payment issues and customer checkout flow.`,
          ctaLabel: 'Review orders',
          ctaHref: '/orders?status=PENDING_PAYMENT',
        });
      }

      if (inactiveProducts >= 50) {
        alerts.push({
          id: 'inactive-products-high',
          severity: 'warning',
          title: 'Many inactive products',
          description: `${inactiveProducts} products are not active and may impact catalog coverage.`,
          ctaLabel: 'Open products',
          ctaHref: '/products?status=ARCHIVED',
        });
      }

      if (todayOrders === 0) {
        alerts.push({
          id: 'no-orders-today',
          severity: 'info',
          title: 'No paid orders today',
          description:
            'No paid orders were registered today yet. Consider checking traffic, checkout and payment provider health.',
          ctaLabel: 'Open dashboard',
          ctaHref: '/dashboard',
        });
      }

      return {
        todayOrders,
        todayRevenue: revenueData._sum.total_amount || 0,
        totalProducts,
        totalCustomers,
        pendingOrders: pendingOrdersCount,
        activeProducts,
        alerts,
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          orderNumber: order.order_number || `ORD-${order.id}`,
          customer: order.email,
          amount: order.total_amount,
          status: order.status,
          date: order.created_at,
        })),
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }
}
