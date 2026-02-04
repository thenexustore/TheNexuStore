import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CommonModule } from '../../common/common.module';
import { CartModule } from '../cart/cart.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [CommonModule, CartModule, AuthModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
