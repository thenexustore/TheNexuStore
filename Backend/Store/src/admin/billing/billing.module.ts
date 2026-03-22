import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { MailModule } from '../../auth/mail/mail.module';
import { AdminGuard } from '../admin.guard';
import { AuditLogService } from '../audit-log.service';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [BillingController],
  providers: [BillingService, PrismaService, AdminGuard, AuditLogService],
  exports: [BillingService],
})
export class BillingModule {}
