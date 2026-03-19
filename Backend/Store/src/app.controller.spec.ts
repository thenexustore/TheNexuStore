import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHealth: jest.fn().mockResolvedValue({
              app: 'ok',
              timestamp: '2026-03-05T00:00:00.000Z',
              uptimeSeconds: 120,
              db: 'ok',
              redis: 'disabled',
              rabbit: 'disabled',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get(AppController);
  });

  it('returns health status', async () => {
    await expect(controller.health()).resolves.toEqual({
      app: 'ok',
      timestamp: '2026-03-05T00:00:00.000Z',
      uptimeSeconds: 120,
      db: 'ok',
      redis: 'disabled',
      rabbit: 'disabled',
    });
  });
  it('returns admin health alias', async () => {
    await expect(controller.adminHealth()).resolves.toEqual({
      app: 'ok',
      timestamp: '2026-03-05T00:00:00.000Z',
      uptimeSeconds: 120,
      db: 'ok',
      redis: 'disabled',
      rabbit: 'disabled',
    });
  });
});
