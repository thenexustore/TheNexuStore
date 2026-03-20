import { Module } from '@nestjs/common';
import { DeployController } from './deploy.controller';
import { DeployService } from './deploy.service';
import { JwtAuthModule } from '../../auth/jwt-auth.module';

@Module({
  imports: [JwtAuthModule],
  controllers: [DeployController],
  providers: [DeployService],
})
export class DeployModule {}
