export interface RequestLogInput {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip?: string;
  userAgent?: string;
}

export function buildRequestLogLine(input: RequestLogInput): string {
  return JSON.stringify({
    event: 'http_request',
    requestId: input.requestId,
    method: input.method,
    path: input.path,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    timestamp: new Date().toISOString(),
  });
}
