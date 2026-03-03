import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';
import { validateEnvironment } from './env.validation';

function warnOptionalDependencies() {
  const logger = new Logger('Bootstrap');

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
  loadEnv();
  const env = validateEnvironment(process.env);

  process.env.PORT = String(env.PORT);
  process.env.HOST = env.HOST;
  process.env.JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
  if (env.JWT_SECRET) {
    process.env.JWT_SECRET = env.JWT_SECRET;
  }

  warnOptionalDependencies();

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

  await app.listen(env.PORT, env.HOST);

  const logger = new Logger('Bootstrap');
  logger.log(`Backend listening on ${env.HOST}:${env.PORT}`);
}
bootstrap();
