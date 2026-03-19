import { Module } from '@nestjs/common';
import { HomepageSectionsController } from './homepage-sections.controller';
import { CarouselsController } from './carousels.controller';
import { HomepageSectionsService } from './homepage-sections.service';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';
import { BannersService } from '../admin/banners/banners.service';
import { AdminModule } from '../admin/admin.module';
import { HomepagePreviewEventsService } from './homepage-preview-events.service';

@Module({
  imports: [AdminModule],
  controllers: [HomepageSectionsController, CarouselsController],
  providers: [
    HomepageSectionsService,
    HomepagePreviewEventsService,
    PrismaService,
    ProductsService,
    BannersService,
  ],
})
export class HomepageSectionsModule {}
