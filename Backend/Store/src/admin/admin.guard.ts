// src/admin/admin.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from '../auth/staff-auth/roles.decorator';
import { StaffRole } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token);
      const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      const role = String(payload.role || '').toUpperCase();
      const isLegacyAdmin = payload.role === 'admin';
      const isStaffToken = payload.type === 'STAFF';

      if (!isStaffToken && !isLegacyAdmin) {
        throw new UnauthorizedException('Staff access required');
      }

      if (requiredRoles?.length) {
        if (!requiredRoles.includes(role as StaffRole)) {
          throw new ForbiddenException('Insufficient role permissions');
        }
      } else if (role !== StaffRole.ADMIN && !isLegacyAdmin) {
        throw new ForbiddenException('Admin access required');
      }

      request.user = {
        ...payload,
        role,
      };
      return true;
    } catch (error: unknown) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
