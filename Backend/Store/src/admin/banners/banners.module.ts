// Backend/Store/src/admin/banners/banners.module.ts
import { Module } from '@nestjs/common';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
