import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return true;
    }

    const headerToken = req.get('x-csrf-token');
    const cookieToken = req.cookies?.csrf_token;

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      throw new BadRequestException('Invalid CSRF token');
    }

    return true;
  }
}
