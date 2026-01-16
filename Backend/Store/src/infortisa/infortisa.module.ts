import { Module } from '@nestjs/common';
import { InfortisaService } from './infortisa.service';
import { InfortisaController } from './infortisa.controller';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';

@Module({
  controllers: [InfortisaController],
  providers: [InfortisaService, PrismaService, ProductsService],
})
export class InfortisaModule {}
