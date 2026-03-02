import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.coupon.findMany({
      orderBy: [{ created_at: 'desc' }],
    });
  }

  async create(dto: CreateCouponDto) {
    this.validateDateWindow(dto.starts_at, dto.ends_at);

    try {
      return await this.prisma.coupon.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          type: dto.type,
          value: dto.value,
          min_order_amount: dto.min_order_amount,
          starts_at: dto.starts_at ? new Date(dto.starts_at) : null,
          ends_at: dto.ends_at ? new Date(dto.ends_at) : null,
          usage_limit: dto.usage_limit,
          is_active: dto.is_active ?? true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Coupon code already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findById(id);
    this.validateDateWindow(dto.starts_at ?? undefined, dto.ends_at ?? undefined);

    return this.prisma.coupon.update({
      where: { id },
      data: {
        type: dto.type,
        value: dto.value,
        min_order_amount: dto.min_order_amount,
        starts_at:
          dto.starts_at === null
            ? null
            : dto.starts_at
              ? new Date(dto.starts_at)
              : undefined,
        ends_at:
          dto.ends_at === null
            ? null
            : dto.ends_at
              ? new Date(dto.ends_at)
              : undefined,
        usage_limit: dto.usage_limit,
        is_active: dto.is_active,
      },
    });
  }

  async disable(id: string) {
    await this.findById(id);
    return this.prisma.coupon.update({
      where: { id },
      data: { is_active: false },
    });
  }

  private async findById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  private validateDateWindow(startsAt?: string | null, endsAt?: string | null) {
    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      throw new BadRequestException('starts_at must be before ends_at');
    }
  }
}
