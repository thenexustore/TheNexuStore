import { Test, TestingModule } from '@nestjs/testing';
import { AdminModule } from './admin.module';
import { AdminService } from './admin.service';
import { CategoriesService } from '../user/categories/categories.service';

describe('AdminModule', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AdminModule],
    }).compile();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('compiles with all required providers', () => {
    expect(moduleRef).toBeDefined();
  });

  it('resolves AdminService and CategoriesService providers', () => {
    expect(moduleRef.get(AdminService)).toBeDefined();
    expect(moduleRef.get(CategoriesService)).toBeDefined();
  });
});
