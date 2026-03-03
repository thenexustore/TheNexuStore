import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('Application bootstrap dependency graph', () => {
  it('compiles AppModule without UnknownDependenciesException', async () => {
    await expect(
      Test.createTestingModule({
        imports: [AppModule],
      }).compile(),
    ).resolves.toBeDefined();
  });
});
