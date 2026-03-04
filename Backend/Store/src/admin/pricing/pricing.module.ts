import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PricingService } from '../../pricing/pricing.service';
import { PricingAdminController } from './pricing.controller';
import { PricingAdminService } from './pricing.service';

@Module({
  controllers: [PricingAdminController],
  providers: [PricingAdminService, PricingService, PrismaService],
  exports: [PricingAdminService],
})
export class PricingAdminModule {}
