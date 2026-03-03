import { Module } from '@nestjs/common';
import { StaffAuthService } from './staff-auth.service';
import { StaffAuthController } from './staff-auth.controller';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../common/common.module';
import { JwtAuthModule } from '../jwt-auth.module';

@Module({
  imports: [CommonModule, ConfigModule, JwtAuthModule],
  controllers: [StaffAuthController],
  providers: [StaffAuthService],
})
export class StaffAuthModule {}
