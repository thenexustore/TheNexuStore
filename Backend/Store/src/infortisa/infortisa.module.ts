import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { InfortisaService } from './infortisa.service';
import { InfortisaController } from './infortisa.controller';
import { InfortisaSyncService } from './infortisa.sync';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  controllers: [InfortisaController],
  providers: [
    InfortisaService,
    InfortisaSyncService,
    PrismaService,
    ProductsService,
    AdminGuard,
  ],
  exports: [InfortisaService, InfortisaSyncService],
})
export class InfortisaModule {}
