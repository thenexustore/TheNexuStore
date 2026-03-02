import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateOrderDto } from './dto/checkout.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('create-order')
  async createOrder(
    @Request() req,
    @Body() dto: CreateOrderDto,
  ) {
    const customerId = req.user?.id;
    const sessionId =
      (req.headers['x-session-id'] as string | undefined) ?? undefined;
    return this.checkoutService.createOrder(customerId, sessionId, dto);
  }

  @Get('orders')
  async getOrders(@Request() req) {
    return this.checkoutService.getCustomerOrders(req.user.id);
  }

  @Get('order/:id')
  async getOrder(
    @Request() req,
    @Param('id') orderId: string,
  ) {
    return this.checkoutService.getOrder(orderId, req.user.id);
  }

  @Get('track/:token')
  async trackOrder(@Param('token') token: string) {
    return this.checkoutService.getOrderByTrackingToken(token);
  }
}