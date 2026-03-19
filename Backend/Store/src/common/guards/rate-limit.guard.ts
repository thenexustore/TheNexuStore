import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimitService } from '../security/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const route = req.route?.path ?? req.path;
    const key = `${req.ip}:${req.method}:${route}`;

    const sensitiveAuthRoutes = [
      'login',
      'register',
      'verify-otp',
      'resend-otp',
      'forgot-password',
      'reset-password',
    ];
    const isSensitiveRoute =
      sensitiveAuthRoutes.some((segment) => route.includes(segment)) &&
      req.method === 'POST';
    const isCheckoutCreate =
      route.includes('create-order') && req.method === 'POST';

    const limit = isSensitiveRoute ? 5 : isCheckoutCreate ? 10 : 30;
    const windowMs = 60_000;

    const accepted = this.rateLimitService.consume(key, limit, windowMs);
    if (!accepted) {
      throw new HttpException(
        'Rate limit exceeded. Please wait a minute before retrying.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
