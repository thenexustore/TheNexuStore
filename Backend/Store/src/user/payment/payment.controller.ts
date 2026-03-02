import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService, CreatePaymentDto } from './payment.service';
import { RedsysNotification } from './redsys.service';
import { AuthGuard } from '../../auth/auth.guard';

class InitiatePaymentDto {
  order_id: string = '';
  provider: 'REDSYS' | 'COD' = 'REDSYS';
  return_url?: string;
}

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @UseGuards(AuthGuard)
  async initiatePayment(@Body() dto: InitiatePaymentDto) {
    return this.paymentService.createPayment({
      orderId: dto.order_id,
      provider: dto.provider,
      returnUrl: dto.return_url,
    });
  }

  @Post('redsys/notification')
  @HttpCode(HttpStatus.OK)
  async handleRedsysNotification(@Body() notification: RedsysNotification) {
    await this.paymentService.handleRedsysNotification(notification);
    return 'OK';
  }

  @Post('cod/confirm/:orderId')
  @UseGuards(AuthGuard)
  async confirmCODPayment(@Param('orderId') orderId: string) {
    await this.paymentService.confirmCODDelivery(orderId);
    return { success: true, message: 'COD payment confirmed' };
  }

  @Get('status/:orderId')
  @UseGuards(AuthGuard)
  async getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(orderId);
  }
}
