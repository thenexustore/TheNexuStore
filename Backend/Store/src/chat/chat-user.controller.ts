import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('chat')
export class ChatUserController {
  constructor(private chatService: ChatService) {}

  @Post('guest/init')
  async initGuest(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionRef = req.cookies?.guest_session || null;
    const { accessToken, sessionRef: newSessionRef } =
      await this.chatService.initGuest(sessionRef);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('guest_session', newSessionRef, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Post('conversations')
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Request() req: any,
  ) {
    const customer = req.user;
    const conv = await this.chatService.createConversation(customer.id, dto);
    return { success: true, data: conv };
  }

  @UseGuards(AuthGuard)
  @Get('conversations')
  async getMyConversations(@Request() req: any) {
    const customer = req.user;
    const conversations = await this.chatService.getCustomerConversations(
      customer.id,
    );
    return { success: true, data: conversations };
  }

  @UseGuards(AuthGuard)
  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @Request() req: any) {
    const customer = req.user;
    const conv = await this.chatService.getConversationWithMessages(
      id,
      customer.id,
      'customer',
    );
    await this.chatService.markMessagesAsRead(id, false);
    return { success: true, data: conv };
  }

  @UseGuards(AuthGuard)
  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    const customer = req.user;
    const { ChatSenderType } = await import('@prisma/client');
    const msg = await this.chatService.sendMessage(
      id,
      ChatSenderType.CUSTOMER,
      customer.id,
      dto,
    );
    return { success: true, data: msg };
  }
}
