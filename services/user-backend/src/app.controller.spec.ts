import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get(AppController);
  });

  it('returns health status', () => {
    const res = controller.health();
    expect(res).toMatchObject({
      status: 'ok',
      service: 'commerce-core',
    });
    expect(res.time instanceof Date).toBe(true);
  });
});
