import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../../auth/auth.module';
import { CouponModule } from '../coupon/coupon.module';

import { ShippingTaxModule } from '../../shipping-tax/shipping-tax.module';

@Module({
  imports: [CommonModule, AuthModule, CouponModule, ShippingTaxModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
