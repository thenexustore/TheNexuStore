import { Module } from '@nestjs/common';
import { RedsysService } from './redsys.service';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentsController } from './payments.controller';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [PaymentController, PaymentsController],
  providers: [RedsysService, PaymentService],
  exports: [RedsysService, PaymentService],
})
export class PaymentModule {}
