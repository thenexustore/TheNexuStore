import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Architecture rules', () => {
  it('does not provide AdminGuard directly in feature modules', () => {
    const forbiddenModules = [
      'admin/coupons/coupons.module.ts',
      'admin/featured-products/featured-products.module.ts',
      'admin/admin.module.ts',
    ];

    forbiddenModules.forEach((modulePath) => {
      const source = readFileSync(join(__dirname, modulePath), 'utf8');
      expect(source).not.toMatch(/providers\s*:\s*\[[^\]]*AdminGuard/s);
    });
  });

  it('registers JwtModule only in JwtAuthModule for source files', () => {
    const sourceFiles = [
      'auth/jwt-auth.module.ts',
      'auth/auth.module.ts',
      'admin/admin.module.ts',
      'chat/chat.module.ts',
      'auth/staff-auth/staff-auth.module.ts',
    ];

    sourceFiles.forEach((sourceFile) => {
      const source = readFileSync(join(__dirname, sourceFile), 'utf8');
      if (sourceFile === 'auth/jwt-auth.module.ts') {
        expect(source).toContain('JwtModule.registerAsync');
      } else {
        expect(source).not.toMatch(/JwtModule\.register(?:Async)?\(/);
      }
    });
  });
});
