import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { StaffRole } from '@prisma/client';
import { ROLES_KEY } from '../auth/staff-auth/roles.decorator';
import { PERMISSIONS_KEY } from '../auth/staff-auth/permissions.decorator';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const getContext = (authorization?: string): ExecutionContext => {
    const request = {
      headers: {
        ...(authorization ? { authorization } : {}),
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  const jwtService = {
    verify: jest.fn(),
  } as unknown as JwtService;

  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  let guard: AdminGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AdminGuard(jwtService, reflector);
  });

  it('allows legacy admin token when no role metadata is present', () => {
    const context = getContext('Bearer legacy-token');

    (jwtService.verify as jest.Mock).mockReturnValue({ role: 'admin' });
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects non-staff token when not a legacy admin token', () => {
    const context = getContext('Bearer bad-token');

    (jwtService.verify as jest.Mock).mockReturnValue({ role: 'customer' });
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('enforces class/route role metadata', () => {
    const context = getContext('Bearer warehouse-token');

    (jwtService.verify as jest.Mock).mockReturnValue({
      role: StaffRole.WAREHOUSE,
      type: 'STAFF',
    });
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === ROLES_KEY) {
        return [StaffRole.ADMIN];
      }

      return undefined;
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows matching staff roles when metadata is present', () => {
    const context = getContext('Bearer admin-token');

    (jwtService.verify as jest.Mock).mockReturnValue({
      role: StaffRole.ADMIN,
      type: 'STAFF',
    });
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === ROLES_KEY) {
        return [StaffRole.ADMIN];
      }

      return undefined;
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('enforces permissions metadata when present', () => {
    const context = getContext('Bearer warehouse-token');

    (jwtService.verify as jest.Mock).mockReturnValue({
      role: StaffRole.WAREHOUSE,
      type: 'STAFF',
      permissions: ['orders:read'],
    });
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return ['orders:bulk_update'];
      }

      return undefined;
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows permission-protected route when token has full_access', () => {
    const context = getContext('Bearer admin-token');

    (jwtService.verify as jest.Mock).mockReturnValue({
      role: StaffRole.ADMIN,
      type: 'STAFF',
      permissions: ['full_access'],
    });
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return ['imports:retry'];
      }

      return undefined;
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
