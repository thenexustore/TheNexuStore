import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { config as loadEnv } from 'dotenv';
import { validateEnvironment } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
<<<<<<< codex/implementar-mejoras-en-integracion-htamy2
import { buildRequestLogLine } from './common/request-log.util';
=======
>>>>>>> main

async function bootstrap() {
  loadEnv();
  validateEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.set('trust proxy', 1);
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.use(cookieParser());


  app.use((req, res, next) => {
<<<<<<< codex/implementar-mejoras-en-integracion-htamy2
    const startedAt = process.hrtime.bigint();
=======
>>>>>>> main
    const incomingRequestId = req.headers['x-request-id'];
    const requestId =
      typeof incomingRequestId === 'string' && incomingRequestId.trim()
        ? incomingRequestId
        : randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
<<<<<<< codex/implementar-mejoras-en-integracion-htamy2

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

=======
>>>>>>> main
    next();
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

<<<<<<< codex/implementar-mejoras-en-integracion-htamy2
  const logger = new Logger('Bootstrap');

=======
>>>>>>> main
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

  logger.log(`Backend listening on ${host}:${port}`);
}
bootstrap();
