import { Module } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
