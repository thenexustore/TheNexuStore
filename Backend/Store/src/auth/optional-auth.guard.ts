import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.access_token;

    if (!token) {
      return true;
    }

    try {
      const payload: any = await this.jwtService.verifyAsync(token);
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

      if (customer?.is_active) {
        req.user = customer;
      }
    } catch {
      // Invalid/expired token is treated as anonymous for optional-auth endpoints.
    }

    return true;
  }
}
