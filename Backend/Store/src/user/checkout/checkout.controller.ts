import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateOrderDto } from './dto/checkout.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { OptionalAuthGuard } from '../../auth/optional-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('create-order')
  @UseGuards(OptionalAuthGuard, CsrfGuard, RateLimitGuard)
  async createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    const customerId = req.user?.id;
    const sessionId =
      (req.headers['x-session-id'] as string | undefined) ?? undefined;
    return this.checkoutService.createOrder(customerId, sessionId, dto);
  }

  @Get('orders')
  @UseGuards(AuthGuard)
  async getOrders(@Request() req) {
    return this.checkoutService.getCustomerOrders(req.user.id);
  }

  @Get('order/:id')
  @UseGuards(AuthGuard)
  async getOrder(@Request() req, @Param('id') orderId: string) {
    return this.checkoutService.getOrder(orderId, req.user.id);
  }

  @Get('track/:token')
  async trackOrder(@Param('token') token: string) {
    return this.checkoutService.getOrderByTrackingToken(token);
  }
}
