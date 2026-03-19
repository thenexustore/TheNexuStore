import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

@Controller('admin/coupons')
@UseGuards(AdminGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  async listCoupons() {
    const coupons = await this.couponsService.list();
    return { success: true, data: coupons };
  }

  @Post()
  async createCoupon(@Body() dto: CreateCouponDto) {
    const coupon = await this.couponsService.create(dto);
    return {
      success: true,
      data: coupon,
      message: 'Coupon created successfully',
    };
  }

  @Patch(':id')
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    const coupon = await this.couponsService.update(id, dto);
    return {
      success: true,
      data: coupon,
      message: 'Coupon updated successfully',
    };
  }

  @Patch(':id/disable')
  async disableCoupon(@Param('id') id: string) {
    const coupon = await this.couponsService.disable(id);
    return {
      success: true,
      data: coupon,
      message: 'Coupon disabled successfully',
    };
  }
}
