import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PricingService } from './pricing.service';

@Global()
@Module({
  providers: [PricingService, PrismaService],
  exports: [PricingService],
})
export class PricingModule {}
