import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../common/prisma.service';
import { MailModule } from './mail/mail.module';
import { GoogleStrategy } from './google-verfication/google.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, PrismaService, GoogleStrategy],
  exports: [AuthGuard, JwtModule, AuthService],
})
export class AuthModule {}
