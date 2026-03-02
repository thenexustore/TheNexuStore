import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';

function validateEnvironment() {
  loadEnv();
  const logger = new Logger('Bootstrap');

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'Missing required environment variable: DATABASE_URL. Please set DATABASE_URL before starting the backend.',
    );
  }

  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL is not configured. Redis-backed features are disabled.');
  }

  if (!process.env.RABBITMQ_URL) {
    logger.warn(
      'RABBITMQ_URL is not configured. RabbitMQ-backed features are disabled.',
    );
  }
}

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.set('trust proxy', 1);
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4000',
        'https://www.thenexustore.com',
        'https://admin.thenexustore.com',
        'https://nexus-store-vpq8.vercel.app',
        'https://nexus-store-eight.vercel.app',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  await app.listen(process.env.PORT as any);
}
bootstrap();
