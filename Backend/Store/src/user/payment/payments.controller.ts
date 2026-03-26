import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { RedsysNotification } from './redsys.service';
import { CreateRedsysPaymentDto } from './dto/create-redsys-payment.dto';
import { InitiatePaymentDto } from './dto/payment.dto';
import { OptionalAuthGuard } from '../../auth/optional-auth.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @UseGuards(AuthGuard, CsrfGuard, RateLimitGuard)
  async initiatePayment(
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentService.createPayment({
      orderId: dto.order_id,
      provider: dto.provider,
      returnUrl: dto.return_url,
      customerId: req.user?.id,
    });
  }

  @Post('redsys/create')
  @UseGuards(OptionalAuthGuard, CsrfGuard, RateLimitGuard)
  async createRedsysPayment(
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: CreateRedsysPaymentDto,
  ) {
    const payment = await this.paymentService.createRedsysPaymentForOrder({
      orderId: dto.order_id,
      returnUrl: dto.return_url,
      trackingToken: dto.tracking_token,
      customerId: req.user?.id,
      customerPhone: dto.phone,
      paymentMethod: dto.payment_method === 'BIZUM' ? 'BIZUM' : 'CARD',
    });

    return {
      payment_id: payment.paymentId,
      order_id: payment.orderId,
      provider: payment.provider,
      formUrl: payment.formData?.formUrl ?? payment.redirectUrl,
      Ds_SignatureVersion: payment.formData?.Ds_SignatureVersion,
      Ds_MerchantParameters: payment.formData?.Ds_MerchantParameters,
      Ds_Signature: payment.formData?.Ds_Signature,
      formData: payment.formData,
    };
  }

  @Post('redsys/notify')
  @HttpCode(HttpStatus.OK)
  async handleRedsysNotification(
    @Body() notification: RedsysNotification,
    @Res() res: Response,
  ) {
    await this.paymentService.handleRedsysNotification(notification);
    res.status(HttpStatus.OK).send('OK');
  }

  @Post('redsys/notification')
  @HttpCode(HttpStatus.OK)
  async handleRedsysNotificationAlias(
    @Body() notification: RedsysNotification,
    @Res() res: Response,
  ) {
    await this.paymentService.handleRedsysNotification(notification);
    res.status(HttpStatus.OK).send('OK');
  }

  @Get('redsys/ok')
  async redsysOk(
    @Query('orderRef') orderRef: string | undefined,
    @Query('Ds_Order') dsOrder: string | undefined,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.paymentService.resolveRedsysReturn(
      'success',
      orderRef || dsOrder,
    );
    res.redirect(302, redirectUrl);
  }

  @Get('redsys/ko')
  async redsysKo(
    @Query('orderRef') orderRef: string | undefined,
    @Query('Ds_Order') dsOrder: string | undefined,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.paymentService.resolveRedsysReturn(
      'failed',
      orderRef || dsOrder,
    );
    res.redirect(302, redirectUrl);
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
