import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { StaffAuthModule } from '../../auth/staff-auth/staff-auth.module';
import { PrismaService } from '../../common/prisma.service';
import { ShippingTaxModule } from '../../shipping-tax/shipping-tax.module';
import { ShippingTaxAdminController } from './shipping-tax-admin.controller';
import { ShippingTaxAdminService } from './shipping-tax-admin.service';

@Module({
  imports: [AuthModule, StaffAuthModule, ShippingTaxModule],
  controllers: [ShippingTaxAdminController],
  providers: [ShippingTaxAdminService, PrismaService],
})
export class ShippingTaxAdminModule {}
