import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InfortisaService } from './infortisa.service';
import { InfortisaController } from './infortisa.controller';
import { InfortisaSyncService } from './infortisa.sync';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [InfortisaController],
  providers: [
    InfortisaService,
    InfortisaSyncService,
    PrismaService,
    ProductsService,
  ],
  exports: [InfortisaService, InfortisaSyncService],
})
export class InfortisaModule {}
