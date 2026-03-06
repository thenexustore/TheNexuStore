import { buildRequestLogLine } from './request-log.util';

describe('buildRequestLogLine', () => {
  it('returns a JSON line with request observability fields', () => {
    const line = buildRequestLogLine({
      requestId: 'req-1',
      method: 'GET',
      path: '/health',
      statusCode: 200,
      durationMs: 12,
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      event: 'http_request',
      requestId: 'req-1',
      method: 'GET',
      path: '/health',
      statusCode: 200,
      durationMs: 12,
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
    expect(typeof parsed.timestamp).toBe('string');
  });
});
