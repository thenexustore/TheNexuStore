import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { AdminService } from './admin.service';
import { CategoriesService } from '../user/categories/categories.service';

describe('AdminModule wiring (via AppModule)', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('resolves AdminService and CategoriesService providers', () => {
    expect(moduleRef.get(AdminService)).toBeDefined();
    expect(moduleRef.get(CategoriesService)).toBeDefined();
  });
});
