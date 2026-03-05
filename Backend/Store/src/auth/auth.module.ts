import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma.service';
import { MailModule } from './mail/mail.module';
import { GoogleStrategy } from './google-verfication/google.strategy';
import { AuthGuard } from './auth.guard';
import { GoogleAuthGuard } from './google-verfication/google-auth.guard';
import { JwtAuthModule } from './jwt-auth.module';

const googleStrategyProviders =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [GoogleStrategy]
    : [];

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  new Logger('AuthModule').log('Google OAuth disabled');
}

@Module({
  imports: [ConfigModule, JwtAuthModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    AuthGuard,
    GoogleAuthGuard,
    ...googleStrategyProviders,
  ],
  exports: [JwtAuthModule, AuthService, AuthGuard],
})
export class AuthModule {}
