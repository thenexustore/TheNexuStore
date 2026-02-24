import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatSenderType } from '@prisma/client';

interface AuthenticatedSocket {
  id: string;
  userId: string;
  role: 'customer' | 'admin';
}

@WebSocketGateway({
  path: '/chat-ws',
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://www.thenexustore.com',
      'https://admin.thenexustore.com',
      'https://nexus-store-vpq8.vercel.app',
      'https://nexus-store-eight.vercel.app',
    ],
    credentials: true,
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private clientMap = new Map<string, AuthenticatedSocket>();
  private conversationRooms = new Map<string, Set<string>>(); // conversationId -> Set of socket ids

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: any) {
    try {
      const authHeader = client.handshake?.headers?.authorization;
      const cookieHeader = client.handshake?.headers?.cookie;
      const authToken = client.handshake?.auth?.token;

      let token =
        authToken || (authHeader ? authHeader.replace('Bearer ', '') : null);
      if (!token && cookieHeader) {
        const match = cookieHeader.match(/access_token=([^;]+)/);
        if (match) token = match[1];
      }

      if (!token) {
        client.disconnect();
        return;
      }

      const secret =
        this.configService.get<string>('JWT_SECRET') || 'dev_secret';
      const payload = this.jwtService.verify(token, { secret });

      const role = payload.role === 'admin' ? 'admin' : 'customer';
      const userId = payload.role === 'admin' ? payload.email : payload.sub;

      this.clientMap.set(client.id, { id: client.id, userId, role });
      this.logger.log(`Client connected: ${client.id} (${role})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: any) {
    this.clientMap.delete(client.id);
    this.conversationRooms.forEach((sockets, convId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) this.conversationRooms.delete(convId);
    });
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: any,
    @MessageBody() data: { conversationId: string },
  ) {
    const meta = this.clientMap.get(client.id);
    if (!meta || !data?.conversationId) return;

    const conv = await this.chatService
      .getConversationWithMessages(data.conversationId, meta.userId, meta.role)
      .catch(() => null);

    if (!conv) return;

    const room = `conv:${data.conversationId}`;
    await client.join(room);

    let sockets = this.conversationRooms.get(data.conversationId);
    if (!sockets) {
      sockets = new Set();
      this.conversationRooms.set(data.conversationId, sockets);
    }
    sockets.add(client.id);
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: any,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.leave(`conv:${data.conversationId}`);
      const sockets = this.conversationRooms.get(data.conversationId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0)
          this.conversationRooms.delete(data.conversationId);
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: any,
    @MessageBody()
    data: { conversationId: string; content?: string; image_base64?: string },
  ) {
    const meta = this.clientMap.get(client.id);
    const hasContent = data?.content?.trim();
    const hasImage = data?.image_base64?.trim();
    if (!meta || !data?.conversationId || (!hasContent && !hasImage)) return;

    const senderType =
      meta.role === 'admin' ? ChatSenderType.STAFF : ChatSenderType.CUSTOMER;

    const msg = await this.chatService.sendMessage(
      data.conversationId,
      senderType,
      meta.userId,
      {
        content: data.content?.trim() || '',
        image_base64: data.image_base64 || undefined,
      },
    );

    this.server.to(`conv:${data.conversationId}`).emit('new_message', {
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_type: msg.sender_type,
      sender_id: msg.sender_id,
      content: msg.content,
      image_base64: msg.image_base64,
      is_read: msg.is_read,
      created_at: msg.created_at,
    });

    return { success: true, message: msg };
  }

  emitNewMessage(conversationId: string, message: any) {
    this.server.to(`conv:${conversationId}`).emit('new_message', message);
  }
}
