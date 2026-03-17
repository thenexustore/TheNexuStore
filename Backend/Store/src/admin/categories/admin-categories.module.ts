import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [AdminCategoriesController],
  providers: [AdminCategoriesService, PrismaService],
  exports: [AdminCategoriesService],
})
export class AdminCategoriesModule {}
