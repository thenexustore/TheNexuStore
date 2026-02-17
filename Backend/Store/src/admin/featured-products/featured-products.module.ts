import { Module } from '@nestjs/common';
import { FeaturedProductsService } from './featured-products.service';
import { FeaturedProductsController } from './featured-products.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { AdminGuard } from '../admin.guard';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [FeaturedProductsController],
  providers: [
    FeaturedProductsService,
    PrismaService,
    AdminGuard,
  ],
})
export class FeaturedProductsModule {}
