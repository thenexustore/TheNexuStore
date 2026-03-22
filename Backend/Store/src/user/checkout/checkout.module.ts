import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CommonModule } from '../../common/common.module';
import { CartModule } from '../cart/cart.module';
import { AuthModule } from '../../auth/auth.module';
import { CouponModule } from '../coupon/coupon.module';
import { MailModule } from '../../auth/mail/mail.module';
import { RedsysService } from '../payment/redsys.service';
import { ShippingTaxModule } from '../../shipping-tax/shipping-tax.module';
import { BillingModule } from '../../admin/billing/billing.module';

@Module({
  imports: [
    CommonModule,
    CartModule,
    AuthModule,
    CouponModule,
    MailModule,
    ShippingTaxModule,
    BillingModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, RedsysService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
