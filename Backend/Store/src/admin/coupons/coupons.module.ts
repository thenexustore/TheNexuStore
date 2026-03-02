import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { AdminGuard } from '../admin.guard';

@Module({
  imports: [AuthModule],
  controllers: [CouponsController],
  providers: [CouponsService, PrismaService, AdminGuard],
})
export class CouponsModule {}
