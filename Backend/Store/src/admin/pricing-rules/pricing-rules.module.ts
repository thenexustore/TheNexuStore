import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PricingService } from '../../pricing/pricing.service';
import { PricingRulesController } from './pricing-rules.controller';
import { PricingRulesService } from './pricing-rules.service';

@Module({
  controllers: [PricingRulesController],
  providers: [PricingRulesService, PrismaService, PricingService],
})
export class PricingRulesModule {}
