import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { RedsysNotification } from './redsys.service';
import { AuthGuard } from '../../auth/auth.guard';
import { InitiatePaymentDto } from './dto/payment.dto';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @UseGuards(AuthGuard, CsrfGuard, RateLimitGuard)
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
  @UseGuards(AuthGuard, CsrfGuard)
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
