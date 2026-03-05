import { AppService } from './app.service';

describe('AppService health', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('returns disabled for optional services when urls are not set', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue(1) } as any;
    const service = new AppService(prisma);

    delete process.env.REDIS_URL;
    delete process.env.RABBITMQ_URL;

    const health = await service.getHealth();

    expect(health.app).toBe('ok');
    expect(health.db).toBe('ok');
    expect(health.redis).toBe('disabled');
    expect(health.rabbit).toBe('disabled');
    expect(typeof health.timestamp).toBe('string');
    expect(typeof health.uptimeSeconds).toBe('number');
  });

  it('returns degraded when a required dependency fails', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('db down')) } as any;
    const service = new AppService(prisma);

    const health = await service.getHealth();

    expect(health.app).toBe('degraded');
    expect(health.db).toBe('fail');
  });
});
