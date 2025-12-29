import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

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

      return {
        todayOrders,
        todayRevenue: revenueData._sum.total_amount || 0,
        totalProducts,
        totalCustomers,
        pendingOrders: pendingOrdersCount,
        activeProducts,
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