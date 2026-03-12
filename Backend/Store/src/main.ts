import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { config as loadEnv } from 'dotenv';
import { validateEnvironment } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { AppLogger } from './common/app-logger.service';
import { RequestContextService } from './common/request-context.service';
import { RequestMetricsService } from './common/request-metrics.service';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import express from 'express';

async function bootstrap() {
  loadEnv();
  validateEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.set('trust proxy', 1);
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.use(cookieParser());

  const brandingAssetsDir = join(process.cwd(), 'storage', 'branding', 'assets');
  if (!existsSync(brandingAssetsDir)) {
    mkdirSync(brandingAssetsDir, { recursive: true });
  }
  app.use('/branding-assets', express.static(brandingAssetsDir));

  const logger = app.get(AppLogger);
  const requestContext = app.get(RequestContextService);
  const requestMetrics = app.get(RequestMetricsService);
  app.useLogger(logger);

  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    const incomingRequestId = req.headers['x-request-id'];
    const requestId =
      typeof incomingRequestId === 'string' && incomingRequestId.trim()
        ? incomingRequestId
        : randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    requestContext.run({ requestId }, () => {
      res.on('finish', () => {
        const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
        const durationMs = Number(elapsedNanoseconds / BigInt(1_000_000));
        const path = req.route?.path || req.originalUrl || req.url;
        const metric = requestMetrics.record(req.method, path, res.statusCode, durationMs);

        logger.log('HTTP request completed', 'HTTP', {
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs,
          ip: req.ip,
          userAgent: req.get('user-agent') || undefined,
          metrics: {
            count: metric.count,
            errors: metric.errors,
            avgDurationMs: Number((metric.totalDurationMs / metric.count).toFixed(2)),
          },
        });
      });

      next();
    });
  });

  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const envOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = new Set<string>([
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4000',
    'https://www.thenexustore.com',
    'https://admin.thenexustore.com',
    'https://nexus-store-vpq8.vercel.app',
    'https://nexus-store-eight.vercel.app',
    process.env.FRONTEND_URL ?? '',
    process.env.ADMIN_URL ?? '',
    ...envOrigins,
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);

  logger.log(`Backend listening on ${host}:${port}`, 'Bootstrap');
}
bootstrap();
