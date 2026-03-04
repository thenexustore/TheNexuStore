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
      ]);

      const alerts: DashboardAlert[] = [];
      const inactiveProducts = totalProducts - activeProducts;

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
