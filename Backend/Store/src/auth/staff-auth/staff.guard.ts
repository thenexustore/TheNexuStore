import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader) return false;

    const token = authHeader.replace('Bearer ', '');

    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'STAFF') return false;

      req.staff = payload; // 👈 yahin attach
      return true;
    } catch {
      return false;
    }
  }
}
