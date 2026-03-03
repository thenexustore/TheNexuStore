import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatUserController } from './chat-user.controller';
import { ChatAdminController } from './chat-admin.controller';
import { PrismaService } from '../common/prisma.service';
import { JwtAuthModule } from '../auth/jwt-auth.module';

@Module({
  imports: [JwtAuthModule],
  controllers: [ChatUserController, ChatAdminController],
  providers: [ChatService, ChatGateway, PrismaService],
})
export class ChatModule {}
