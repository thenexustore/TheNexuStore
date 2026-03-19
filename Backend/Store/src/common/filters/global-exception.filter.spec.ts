import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { AppLogger } from '../app-logger.service';

describe('GlobalExceptionFilter', () => {
  const createHost = (overrides?: {
    url?: string;
    method?: string;
    requestId?: string;
  }): {
    host: ArgumentsHost;
    status: jest.Mock;
    json: jest.Mock;
  } => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const request = {
      url: overrides?.url ?? '/test',
      method: overrides?.method ?? 'GET',
      requestId: overrides?.requestId,
    };

    const response = { status };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as ArgumentsHost;

    return { host, status, json };
  };

  it('formats HttpException responses with request metadata', () => {
    const filter = new GlobalExceptionFilter({
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as AppLogger);
    const { host, status, json } = createHost({ requestId: 'req-123' });

    filter.catch(
      new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Unauthorized',
          path: '/test',
          requestId: 'req-123',
        }),
      }),
    );
  });

  it('maps unknown errors to HTTP 500', () => {
    const filter = new GlobalExceptionFilter({
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as AppLogger);
    const { host, status, json } = createHost();

    filter.catch(new Error('Boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Boom',
          requestId: null,
        }),
      }),
    );
  });
});
