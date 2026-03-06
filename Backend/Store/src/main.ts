import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { config as loadEnv } from 'dotenv';
import { validateEnvironment } from './config/env.validation';
import { registerObservability } from './common/bootstrap-observability';

async function bootstrap() {
  loadEnv();
  validateEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.set('trust proxy', 1);
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.use(cookieParser());

  const logger = new Logger('Bootstrap');

  registerObservability(app, logger);

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
