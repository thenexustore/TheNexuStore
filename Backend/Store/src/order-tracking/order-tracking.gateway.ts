import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from '../common/prisma.service';
import { corsOriginDelegate } from '../common/cors.util';

@WebSocketGateway({
  path: '/order-tracking-ws',
  cors: {
    origin: corsOriginDelegate,
    credentials: true,
  },
})
@Injectable()
export class OrderTrackingGateway {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(OrderTrackingGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  @SubscribeMessage('join_order_tracking')
  async handleJoinOrderTracking(
    @ConnectedSocket() client: any,
    @MessageBody() data: { trackingToken?: string },
  ) {
    const trackingToken = String(data?.trackingToken || '').trim();
    if (!trackingToken) {
      return { success: false };
    }

    const order = await this.prisma.order.findUnique({
      where: { tracking_token: trackingToken },
      select: { id: true },
    });

    if (!order) {
      return { success: false };
    }

    await client.join(this.getRoom(trackingToken));
    return { success: true };
  }

  @SubscribeMessage('leave_order_tracking')
  async handleLeaveOrderTracking(
    @ConnectedSocket() client: any,
    @MessageBody() data: { trackingToken?: string },
  ) {
    const trackingToken = String(data?.trackingToken || '').trim();
    if (!trackingToken) {
      return { success: false };
    }

    await client.leave(this.getRoom(trackingToken));
    return { success: true };
  }

  emitTrackingUpdate(
    trackingToken: string,
    payload: {
      reason: string;
      orderId?: string;
      orderStatus?: string;
      shipmentId?: string;
      emittedAt?: string;
    },
  ) {
    const token = trackingToken.trim();
    if (!token) {
      return;
    }

    this.server.to(this.getRoom(token)).emit('order_tracking_updated', {
      trackingToken: token,
      reason: payload.reason,
      orderId: payload.orderId,
      orderStatus: payload.orderStatus,
      shipmentId: payload.shipmentId,
      emittedAt: payload.emittedAt || new Date().toISOString(),
    });

    this.logger.debug(
      `Emitted tracking update for ${token} (${payload.reason})`,
    );
  }

  private getRoom(trackingToken: string) {
    return `order-track:${trackingToken}`;
  }
}
