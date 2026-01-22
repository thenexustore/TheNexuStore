import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FeaturedProductsService } from './featured-products.service';
import { FeaturedProductsController } from './featured-products.controller';
import { PrismaService } from '../../common/prisma.service';
import { AdminGuard } from '../admin.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [FeaturedProductsController],
  providers: [FeaturedProductsService, PrismaService, AdminGuard],
  exports: [FeaturedProductsService],
})
export class FeaturedProductsModule {}
