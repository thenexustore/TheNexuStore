import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { AdminGuard } from '../admin.guard';
import { AuditLogService } from '../audit-log.service';

@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [BillingService, PrismaService, AdminGuard, AuditLogService],
  exports: [BillingService],
})
export class BillingModule {}
