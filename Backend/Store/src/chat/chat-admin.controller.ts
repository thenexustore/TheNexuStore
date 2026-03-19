import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';

@Controller('admin/chat')
export class ChatAdminController {
  constructor(private chatService: ChatService) {}

  @UseGuards(AdminGuard)
  @Get('conversations')
  async getConversations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const statusEnum = status as any; // OPEN | IN_PROGRESS | RESOLVED | CLOSED
    const result = await this.chatService.getAdminConversations(
      pageNum,
      limitNum,
      statusEnum,
    );
    return { success: true, data: result };
  }

  @UseGuards(AdminGuard)
  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @Request() req: any) {
    const admin = req.user;
    const conv = await this.chatService.getConversationWithMessages(
      id,
      admin.email,
      'admin',
    );
    await this.chatService.markMessagesAsRead(id, true);
    return { success: true, data: conv };
  }

  @UseGuards(AdminGuard)
  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    const admin = req.user;
    const { ChatSenderType } = await import('@prisma/client');
    const msg = await this.chatService.sendMessage(
      id,
      ChatSenderType.STAFF,
      admin.email,
      dto,
    );
    return { success: true, data: msg };
  }

  @UseGuards(AdminGuard)
  @Post('conversations/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    const conv = await this.chatService.updateConversationStatus(
      id,
      dto.status,
    );
    return { success: true, data: conv };
  }
}
