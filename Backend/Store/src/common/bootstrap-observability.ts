import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { buildRequestLogLine } from './request-log.util';

export function registerObservability(app: NestExpressApplication, logger: Logger) {
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    const incomingRequestId = req.headers['x-request-id'];
    const requestId =
      typeof incomingRequestId === 'string' && incomingRequestId.trim()
        ? incomingRequestId
        : randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
      const durationMs = Number(elapsedNanoseconds / BigInt(1_000_000));
      const path = req.originalUrl || req.url;

      logger.log(
        buildRequestLogLine({
          requestId,
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs,
          ip: req.ip,
          userAgent: req.get('user-agent') || undefined,
        }),
      );
    });

    next();
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
}
