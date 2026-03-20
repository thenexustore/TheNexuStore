import { Global, Module } from '@nestjs/common';
import { OrderTrackingGateway } from './order-tracking.gateway';
import { OrderTrackingEventsService } from './order-tracking-events.service';

@Global()
@Module({
  providers: [OrderTrackingGateway, OrderTrackingEventsService],
  exports: [OrderTrackingEventsService],
})
export class OrderTrackingModule {}
