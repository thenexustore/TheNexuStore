import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatUserController } from './chat-user.controller';
import { ChatAdminController } from './chat-admin.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dev_secret',
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') ?? '7d' },
      }),
    }),
  ],
  controllers: [ChatUserController, ChatAdminController],
  providers: [ChatService, ChatGateway, PrismaService],
})
export class ChatModule {}
