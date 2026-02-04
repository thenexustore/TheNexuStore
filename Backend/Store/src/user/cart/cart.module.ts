import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
