import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class StaffAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { email },
      include: { warehouse: true },
    });

    if (!staff || !staff.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, staff.password_hash);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: staff.id,
      role: staff.role, // ADMIN / WAREHOUSE
      warehouseId: staff.warehouse_id,
      type: 'STAFF',
    };

    return {
      access_token: this.jwtService.sign(payload),
      staff: {
        id: staff.id,
        email: staff.email,
        role: staff.role,
        warehouse: staff.warehouse,
      },
    };
  }
}
