import { Test, TestingModule } from '@nestjs/testing';
import { InfortisaController } from './infortisa.controller';
import { InfortisaService, InfortisaHealthStatus } from './infortisa.service';
import { PrismaService } from '../common/prisma.service';
import { ProductsService } from '../user/products/products.service';
import { InfortisaSyncService } from './infortisa.sync';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

describe('InfortisaController', () => {
  let controller: InfortisaController;
  let infortisaService: { getHealthStatus: jest.Mock };

  beforeEach(async () => {
    infortisaService = {
      getHealthStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InfortisaController],
      providers: [
        {
          provide: InfortisaService,
          useValue: infortisaService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ProductsService,
          useValue: {},
        },
        {
          provide: InfortisaSyncService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(InfortisaController);
  });

  it('returns the real provider health payload when the upstream check succeeds', async () => {
    const health: InfortisaHealthStatus = {
      healthy: true,
      provider: 'infortisa',
      base_url: 'https://apiv2.infortisa.com',
      checked_at: '2026-03-19T10:00:00.000Z',
      auth_configured: true,
      latency_ms: 182,
    };
    infortisaService.getHealthStatus.mockResolvedValue(health);

    await expect(controller.checkHealth()).resolves.toEqual(health);
  });

  it('surfaces provider failures instead of returning a fixed success payload', async () => {
    const failedHealth: InfortisaHealthStatus = {
      healthy: false,
      provider: 'infortisa',
      base_url: 'https://apiv2.infortisa.com',
      checked_at: '2026-03-19T10:01:00.000Z',
      auth_configured: false,
      latency_ms: 21,
      error_summary: 'HTTP 401: invalid token',
    };
    infortisaService.getHealthStatus.mockResolvedValue(failedHealth);

    await expect(controller.checkHealth()).resolves.toEqual(failedHealth);
    expect(infortisaService.getHealthStatus).toHaveBeenCalledTimes(1);
  });
});
