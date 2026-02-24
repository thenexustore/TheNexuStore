import { IsEnum } from 'class-validator';
import { ChatStatus } from '@prisma/client';

export class UpdateConversationStatusDto {
  @IsEnum(ChatStatus)
  status!: ChatStatus;
}
