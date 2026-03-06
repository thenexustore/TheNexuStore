import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

type LogMeta = Record<string, unknown>;

@Injectable()
export class AppLogger implements LoggerService {
  constructor(private readonly requestContext: RequestContextService) {}

  log(message: string, context?: string, meta?: LogMeta): void {
    this.write('log', message, context, meta);
  }

  error(message: string, trace?: string, context?: string, meta?: LogMeta): void {
    this.write('error', message, context, {
      ...meta,
      trace,
    });
  }

  warn(message: string, context?: string, meta?: LogMeta): void {
    this.write('warn', message, context, meta);
  }

  debug(message: string, context?: string, meta?: LogMeta): void {
    this.write('debug', message, context, meta);
  }

  verbose(message: string, context?: string, meta?: LogMeta): void {
    this.write('verbose', message, context, meta);
  }

  private write(level: LogLevel, message: string, context?: string, meta?: LogMeta): void {
    const requestId = this.requestContext.getRequestId();
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      context: context ?? 'Application',
      requestId: requestId ?? null,
      message,
      ...(meta ?? {}),
    };

    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(`${JSON.stringify(payload)}\n`);
      return;
    }

    const humanMessage = `[${payload.context}]${requestId ? ` [${requestId}]` : ''} ${message}`;
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(humanMessage, meta ?? '');
      return;
    }

    if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(humanMessage, meta ?? '');
      return;
    }

    // eslint-disable-next-line no-console
    console.log(humanMessage, meta ?? '');
  }
}
