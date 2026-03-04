import { RmaStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRmaStatusDto {
  @IsEnum(RmaStatus)
  status!: RmaStatus;
}
