import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma.service';
import { MailModule } from './mail/mail.module';
import { GoogleStrategy } from './google-verfication/google.strategy';
import { AuthGuard } from './auth.guard';

const googleStrategyProviders =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [GoogleStrategy]
    : [];

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  new Logger('AuthModule').log('Google OAuth disabled');
}

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN') ?? '7d',
        },
      }),
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, AuthGuard, ...googleStrategyProviders],
  exports: [JwtModule, AuthService, AuthGuard],
})
export class AuthModule {}
