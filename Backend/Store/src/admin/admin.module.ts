import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { ProductsController } from './products/products.controller';
import { AdminService } from './admin.service';
import { DashboardService } from './dashboard/dashboard.service';
import { ProductsService } from './products/products.service';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../common/prisma.service';
import { BannersModule } from './banners/banners.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      signOptions: { expiresIn: '8h' },
    }),
    BannersModule,
  ],
  controllers: [AdminController, DashboardController, ProductsController],
  providers: [
    AdminService,
    DashboardService,
    ProductsService,
    AdminGuard,
    PrismaService,
  ],
  exports: [AdminGuard],
})
export class AdminModule {}
