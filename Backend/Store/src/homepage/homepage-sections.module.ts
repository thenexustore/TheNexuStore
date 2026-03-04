import { Module } from '@nestjs/common';
import { HomepageSectionsController } from './homepage-sections.controller';
import { HomepageSectionsService } from './homepage-sections.service';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';
import { BannersService } from '../admin/banners/banners.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [HomepageSectionsController],
  providers: [
    HomepageSectionsService,
    PrismaService,
    ProductsService,
    BannersService,
  ],
})
export class HomepageSectionsModule {}
