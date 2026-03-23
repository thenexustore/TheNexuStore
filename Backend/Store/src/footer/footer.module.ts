import { Module } from '@nestjs/common';
import { FooterController } from './footer.controller';
import { FooterService } from './footer.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [FooterController],
  providers: [FooterService],
  exports: [FooterService],
})
export class FooterModule {}
