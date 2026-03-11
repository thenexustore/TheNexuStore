import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
  IsBoolean,
} from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp!: string;
}

export class ResendOtpDto {
  @IsEmail()
  email!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto extends VerifyOtpDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

class ProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  last_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  profile_image?: string;
}

class AddressDto {
  @IsOptional()
  @IsString()
  company?: string;

  @IsString()
  address_line1!: string;

  @IsOptional()
  @IsString()
  address_line2?: string;

  @IsString()
  city!: string;

  @IsString()
  postal_code!: string;

  @IsString()
  region!: string;

  @IsString()
  country!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileDto)
  profile?: ProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
