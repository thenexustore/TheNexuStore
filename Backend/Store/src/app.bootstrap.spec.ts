import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('Application bootstrap dependency graph', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret';
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
      return;
    }

    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('compiles AppModule without UnknownDependenciesException', async () => {
    await expect(
      Test.createTestingModule({
        imports: [AppModule],
      }).compile(),
    ).resolves.toBeDefined();
  });
});
