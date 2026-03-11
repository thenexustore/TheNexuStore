import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from './mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/auth-requests.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendOtpOrThrow(email: string, otp: string, context: string) {
    try {
      await this.mail.sendOtp(email, otp);
    } catch (error) {
      this.logger.error(
        `Failed to send ${context} OTP to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Unable to send OTP email right now. Please try again later.',
      );
    }
  }

  async register(data: RegisterDto) {
    const existingUser = await this.prisma.customer.findUnique({
      where: { email: data.email },
    });

    if (existingUser?.is_active) {
      throw new BadRequestException('Email already exists');
    }

    const hash = await bcrypt.hash(data.password, 10);
    const otp = this.generateOtp();
    await this.sendOtpOrThrow(data.email, otp, 'registration');

    if (existingUser) {
      await this.prisma.customer.update({
        where: { email: data.email },
        data: {
          password_hash: hash,
          first_name: data.first_name,
          last_name: data.last_name,
          profile_image: data.profile_image || null,
          otp_code: otp,
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
    } else {
      await this.prisma.customer.create({
        data: {
          email: data.email,
          password_hash: hash,
          first_name: data.first_name,
          last_name: data.last_name,
          profile_image: data.profile_image || null,
          otp_code: otp,
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
    }

    return { success: true };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.customer.findUnique({ where: { email } });

    if (
      !user ||
      user.otp_code !== otp ||
      !user.otp_expires_at ||
      user.otp_expires_at < new Date()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.customer.update({
      where: { email },
      data: {
        is_active: true,
        otp_code: null,
        otp_expires_at: null,
      },
    });

    return { success: true };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.customer.findUnique({ where: { email } });

    if (!user) {
      return { success: true };
    }

    if (user.is_active) {
      throw new BadRequestException(
        'Account already verified. Please login instead.',
      );
    }

    const otp = this.generateOtp();
    await this.sendOtpOrThrow(email, otp, 'registration-resend');

    await this.prisma.customer.update({
      where: { email },
      data: {
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return { success: true };
  }

  async login(data: LoginDto) {
    const user = await this.prisma.customer.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.password_hash) throw new UnauthorizedException();

    const match = await bcrypt.compare(data.password, user.password_hash);

    if (!match || !user.is_active) throw new UnauthorizedException();

    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role }),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.customer.findUnique({ where: { email } });
    if (!user || !user.is_active) return { success: true };

    const otp = this.generateOtp();
    await this.sendOtpOrThrow(email, otp, 'forgot-password');

    await this.prisma.customer.update({
      where: { email },
      data: {
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return { success: true };
  }

  async resetPassword(email: string, otp: string, password: string) {
    const user = await this.prisma.customer.findUnique({ where: { email } });

    if (
      !user ||
      user.otp_code !== otp ||
      !user.otp_expires_at ||
      user.otp_expires_at < new Date()
    ) {
      throw new BadRequestException('Invalid OTP');
    }

    const hash = await bcrypt.hash(password, 10);

    await this.prisma.customer.update({
      where: { email },
      data: {
        password_hash: hash,
        otp_code: null,
        otp_expires_at: null,
      },
    });

    return { success: true };
  }

  async googleLogin(googleUser: any) {
    if (!googleUser || !googleUser.email) {
      throw new UnauthorizedException('Google authentication failed');
    }

    let user = await this.prisma.customer.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await this.prisma.customer.create({
        data: {
          email: googleUser.email,
          first_name: googleUser.firstName || 'User',
          last_name: googleUser.lastName || '',
          profile_image: googleUser.picture || null,
          is_active: true,
        },
      });
    }

    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role }),
    };
  }

  async updateProfile(customerId: string, body: UpdateProfileDto) {
    const { profile, address } = body;

    let customer;

    if (profile) {
      customer = await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          profile_image: profile.profile_image,
        },
      });
    } else {
      customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
    }

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (address) {
      const fullName = `${customer.first_name} ${customer.last_name}`;

      const existingAddress = await this.prisma.customerAddress.findFirst({
        where: { customer_id: customerId },
      });

      if (existingAddress) {
        await this.prisma.customerAddress.update({
          where: { id: existingAddress.id },
          data: {
            company: address.company,
            address_line1: address.address_line1,
            address_line2: address.address_line2,
            city: address.city,
            postal_code: address.postal_code,
            region: address.region,
            country: address.country,
            phone: address.phone,
            is_default: address.is_default ?? false,
            full_name: fullName,
          },
        });
      } else {
        await this.prisma.customerAddress.create({
          data: {
            customer_id: customerId,
            full_name: fullName,
            company: address.company,
            address_line1: address.address_line1,
            address_line2: address.address_line2,
            city: address.city,
            postal_code: address.postal_code,
            region: address.region,
            country: address.country,
            phone: address.phone,
            is_default: address.is_default ?? false,
            type: 'SHIPPING',
          },
        });
      }
    }

    return { success: true };
  }

  async getMe(customerId: string) {
    const user = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        addresses: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      profile_image: user.profile_image,
      createdAt: user.created_at,
      address: user.addresses?.[0] || null,
    };
  }
}
