import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initialMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000_000)
  initialImage?: string;
}
