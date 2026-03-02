import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { ShippingTaxService } from './shipping-tax.service';

@Module({
  imports: [ConfigModule],
  providers: [ShippingTaxService, PrismaService],
  exports: [ShippingTaxService],
})
export class ShippingTaxModule {}
