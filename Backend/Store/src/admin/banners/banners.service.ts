import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateBannerDto,
  UpdateBannerDto,
  ReorderBannersDto,
} from './dto/create-banner.dto';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async create(createBannerDto: CreateBannerDto) {
    const maxSort = await this.prisma.banner.aggregate({
      _max: { sort_order: true },
      where: { is_active: true },
    });

    return this.prisma.banner.create({
      data: {
        ...createBannerDto,
        sort_order: (maxSort._max.sort_order || 0) + 1,
      },
    });
  }

  async findAll() {
    return this.prisma.banner.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.banner.findMany({
      orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }],
    });
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto) {
    await this.findOne(id);
    return this.prisma.banner.update({
      where: { id },
      data: updateBannerDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.banner.delete({
      where: { id },
    });
  }

  async reorder(reorderBannersDto: ReorderBannersDto) {
    const transactions = reorderBannersDto.ids.map((id, index) =>
      this.prisma.banner.update({
        where: { id },
        data: { sort_order: index + 1 },
      }),
    );

    return this.prisma.$transaction(transactions);
  }
}
