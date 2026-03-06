import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request & { requestId?: string }>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = isHttpException ? exception.getResponse() : undefined;

    const message = this.getMessage(exception, payload);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.requestId ?? 'n/a'}] ${request.method} ${request.url} -> ${statusCode} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${request.requestId ?? 'n/a'}] ${request.method} ${request.url} -> ${statusCode} ${message}`,
      );
    }

    response.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        message,
        path: request.url,
        requestId: request.requestId ?? null,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private getMessage(exception: unknown, payload: unknown): string {
    if (typeof payload === 'string') {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const maybeMessage = (payload as { message?: unknown }).message;
      if (Array.isArray(maybeMessage)) {
        return maybeMessage.join(', ');
      }

      if (typeof maybeMessage === 'string') {
        return maybeMessage;
      }
    }

    if (exception instanceof Error && exception.message) {
      return exception.message;
    }

    return 'Internal server error';
  }
}
