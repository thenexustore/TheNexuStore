import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OrderTrackingGateway } from './order-tracking.gateway';

@Injectable()
export class OrderTrackingEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrderTrackingGateway,
  ) {}

  async notifyByOrderId(
    orderId: string,
    reason: string,
    extra?: { shipmentId?: string },
  ) {
    if (!orderId) {
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        tracking_token: true,
      },
    });

    if (!order?.tracking_token) {
      return;
    }

    this.gateway.emitTrackingUpdate(order.tracking_token, {
      reason,
      orderId: order.id,
      orderStatus: order.status,
      shipmentId: extra?.shipmentId,
    });
  }

  async notifyByOrderIds(orderIds: string[], reason: string) {
    const ids = Array.from(new Set(orderIds.filter(Boolean)));
    if (ids.length === 0) {
      return;
    }

    const orders = await this.prisma.order.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        tracking_token: true,
      },
    });

    for (const order of orders) {
      if (!order.tracking_token) {
        continue;
      }

      this.gateway.emitTrackingUpdate(order.tracking_token, {
        reason,
        orderId: order.id,
        orderStatus: order.status,
      });
    }
  }
}
