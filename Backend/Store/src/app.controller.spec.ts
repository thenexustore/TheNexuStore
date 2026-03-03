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
              db: 'ok',
              redis: 'fail',
              rabbit: 'fail',
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
      db: 'ok',
      redis: 'fail',
      rabbit: 'fail',
    });
  });
});
