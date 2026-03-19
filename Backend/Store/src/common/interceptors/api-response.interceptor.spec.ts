import { of } from 'rxjs';
import { ApiResponseInterceptor } from './api-response.interceptor';

describe('ApiResponseInterceptor', () => {
  const interceptor = new ApiResponseInterceptor<any>();
  const context: any = {};

  it('wraps plain payloads with a standard success envelope', (done) => {
    const next: any = { handle: () => of({ id: 'p1' }) };

    interceptor.intercept(context, next).subscribe((value) => {
      expect(value).toMatchObject({
        success: true,
        data: { id: 'p1' },
      });
      expect(typeof value.timestamp).toBe('string');
      done();
    });
  });

  it('does not double-wrap responses already containing success field', (done) => {
    const original = { success: true, data: { id: 'p2' } };
    const next: any = { handle: () => of(original) };

    interceptor.intercept(context, next).subscribe((value) => {
      expect(value).toEqual(original);
      done();
    });
  });
});
