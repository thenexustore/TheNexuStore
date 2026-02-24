import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ChatSenderType, ChatStatus } from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async createConversation(
    customerId: string,
    dto: CreateConversationDto,
  ) {
    const conv = await this.prisma.chatConversation.create({
      data: {
        customer_id: customerId,
        subject: dto.subject,
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (dto.initialMessage || dto.initialImage) {
      await this.prisma.chatMessage.create({
        data: {
          conversation_id: conv.id,
          sender_type: ChatSenderType.CUSTOMER,
          sender_id: customerId,
          content: dto.initialMessage || '',
          image_base64: dto.initialImage || null,
        },
      });
    }

    return this.getConversationWithMessages(conv.id, customerId, 'customer');
  }

  async getConversationWithMessages(
    conversationId: string,
    userId: string,
    role: 'customer' | 'admin',
  ) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!conv) throw new NotFoundException('Conversation not found');
    if (role === 'customer' && conv.customer_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return conv;
  }

  async sendMessage(
    conversationId: string,
    senderType: ChatSenderType,
    senderId: string,
    dto: SendMessageDto,
  ) {
    const hasContent = dto.content?.trim();
    const hasImage = dto.image_base64?.trim();
    if (!hasContent && !hasImage) {
      throw new ForbiddenException('Message must have content or image');
    }

    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.status === ChatStatus.CLOSED) {
      throw new ForbiddenException('Conversation is closed');
    }

    const msg = await this.prisma.chatMessage.create({
      data: {
        conversation_id: conversationId,
        sender_type: senderType,
        sender_id: senderId,
        content: dto.content?.trim() || '',
        image_base64: dto.image_base64 || null,
      },
    });

    return msg;
  }

  async getCustomerConversations(customerId: string) {
    return this.prisma.chatConversation.findMany({
      where: { customer_id: customerId },
      orderBy: { updated_at: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async getAdminConversations(page = 1, limit = 20, status?: ChatStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [conversations, total] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updated_at: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { created_at: 'desc' },
          },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.chatConversation.count({ where }),
    ]);

    return { conversations, total, page, limit };
  }

  async updateConversationStatus(
    conversationId: string,
    status: ChatStatus,
  ) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conv) throw new NotFoundException('Conversation not found');

    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { status },
    });
  }

  async markMessagesAsRead(conversationId: string, byCustomer: boolean) {
    await this.prisma.chatMessage.updateMany({
      where: {
        conversation_id: conversationId,
        sender_type: byCustomer ? ChatSenderType.STAFF : ChatSenderType.CUSTOMER,
      },
      data: { is_read: true },
    });
  }

  async initGuest(sessionRef: string | null): Promise<{ accessToken: string; sessionRef: string }> {
    if (sessionRef) {
      const existing = await this.prisma.guestChatSession.findUnique({
        where: { session_ref: sessionRef },
        include: { customer: true },
      });
      if (existing) {
        const token = this.jwtService.sign({
          sub: existing.customer.id,
          role: 'CUSTOMER',
        });
        return { accessToken: token, sessionRef: existing.session_ref };
      }
    }

    const newSessionRef = randomUUID();
    const guestEmail = `guest-${randomUUID()}@anonymous.local`;

    const customer = await this.prisma.customer.create({
      data: {
        email: guestEmail,
        first_name: 'Guest',
        last_name: 'User',
        is_active: true,
      },
    });

    await this.prisma.guestChatSession.create({
      data: {
        session_ref: newSessionRef,
        customer_id: customer.id,
      },
    });

    const token = this.jwtService.sign({
      sub: customer.id,
      role: 'CUSTOMER',
    });

    return { accessToken: token, sessionRef: newSessionRef };
  }
}
