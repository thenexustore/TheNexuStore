import { Module } from '@nestjs/common';
import { BrandingController } from './branding.controller';
import { AdminModule } from '../admin/admin.module';
import { BrandingService } from './branding.service';

@Module({
  imports: [AdminModule],
  controllers: [BrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}
