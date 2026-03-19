import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PricingService } from '../../pricing/pricing.service';
import { PricingRulesController } from './pricing-rules.controller';
import { PricingRulesService } from './pricing-rules.service';
import { AuditLogService } from '../audit-log.service';

@Module({
  controllers: [PricingRulesController],
  providers: [
    PricingRulesService,
    PrismaService,
    PricingService,
    AuditLogService,
  ],
})
export class PricingRulesModule {}
