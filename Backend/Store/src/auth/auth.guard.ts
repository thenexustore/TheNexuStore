import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    let payload: any;

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        profile_image: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!customer || !customer.is_active) {
      throw new UnauthorizedException('Account inactive');
    }

    req.user = customer;
    return true;
  }
}
