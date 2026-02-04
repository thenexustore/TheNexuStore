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

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('create-order')
  @UseGuards(AuthGuard)
  async createOrder(
    @Request() req,
    @Body() dto: CreateOrderDto,
  ) {
    return this.checkoutService.createOrder(req.user.id, dto);
  }

  @Get('orders')
  @UseGuards(AuthGuard)
  async getOrders(@Request() req) {
    return this.checkoutService.getCustomerOrders(req.user.id);
  }

  @Get('order/:id')
  @UseGuards(AuthGuard)
  async getOrder(
    @Request() req,
    @Param('id') orderId: string,
  ) {
    return this.checkoutService.getOrder(orderId, req.user.id);
  }
}