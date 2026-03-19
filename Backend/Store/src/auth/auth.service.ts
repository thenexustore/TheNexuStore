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
import { randomInt } from 'crypto';
import { MailService } from './mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/auth-requests.dto';

type AuthSessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profile_image: string | null;
  createdAt: Date;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  private generateOtp() {
    return randomInt(100000, 1000000).toString();
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeOtp(otp: string) {
    return otp.trim();
  }

  private buildSessionUser(user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    profile_image: string | null;
    created_at: Date;
  }): AuthSessionUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      profile_image: user.profile_image,
      createdAt: user.created_at,
    };
  }

  private issueSession(user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    profile_image: string | null;
    created_at: Date;
  }) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role }),
      user: this.buildSessionUser(user),
    };
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
    const email = this.normalizeEmail(data.email);
    const existingUser = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (existingUser?.is_active) {
      throw new BadRequestException('Email already exists');
    }

    const hash = await bcrypt.hash(data.password, 10);
    const otp = this.generateOtp();
    await this.sendOtpOrThrow(email, otp, 'registration');

    if (existingUser) {
      await this.prisma.customer.update({
        where: { email },
        data: {
          password_hash: hash,
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          profile_image: data.profile_image || null,
          otp_code: otp,
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
    } else {
      await this.prisma.customer.create({
        data: {
          email,
          password_hash: hash,
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          profile_image: data.profile_image || null,
          otp_code: otp,
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
    }

    return { success: true };
  }

  async verifyOtp(email: string, otp: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedOtp = this.normalizeOtp(otp);
    const user = await this.prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      user.otp_code !== normalizedOtp ||
      !user.otp_expires_at ||
      user.otp_expires_at < new Date()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const verifiedUser = await this.prisma.customer.update({
      where: { email: normalizedEmail },
      data: {
        is_active: true,
        otp_code: null,
        otp_expires_at: null,
      },
    });

    return {
      success: true,
      ...this.issueSession(verifiedUser),
    };
  }

  async resendOtp(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { success: true };
    }

    if (user.is_active) {
      throw new BadRequestException(
        'Account already verified. Please login instead.',
      );
    }

    const otp = this.generateOtp();
    await this.sendOtpOrThrow(normalizedEmail, otp, 'registration-resend');

    await this.prisma.customer.update({
      where: { email: normalizedEmail },
      data: {
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return { success: true };
  }

  async login(data: LoginDto) {
    const email = this.normalizeEmail(data.email);
    const user = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (!user || !user.password_hash) throw new UnauthorizedException();

    const match = await bcrypt.compare(data.password, user.password_hash);

    if (!match || !user.is_active) throw new UnauthorizedException();

    return this.issueSession(user);
  }

  async forgotPassword(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || !user.is_active) return { success: true };

    const otp = this.generateOtp();
    await this.sendOtpOrThrow(normalizedEmail, otp, 'forgot-password');

    await this.prisma.customer.update({
      where: { email: normalizedEmail },
      data: {
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return { success: true };
  }

  async resetPassword(email: string, otp: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedOtp = this.normalizeOtp(otp);
    const user = await this.prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      user.otp_code !== normalizedOtp ||
      !user.otp_expires_at ||
      user.otp_expires_at < new Date()
    ) {
      throw new BadRequestException('Invalid OTP');
    }

    const hash = await bcrypt.hash(password, 10);

    await this.prisma.customer.update({
      where: { email: normalizedEmail },
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

    const email = this.normalizeEmail(googleUser.email);
    let user = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.customer.create({
        data: {
          email,
          first_name: googleUser.firstName?.trim() || 'User',
          last_name: googleUser.lastName?.trim() || '',
          profile_image: googleUser.picture || null,
          is_active: true,
        },
      });
    } else {
      const updateData: Record<string, string | boolean | null> = {};

      if (!user.is_active) {
        updateData.is_active = true;
      }

      if (user.otp_code) {
        updateData.otp_code = null;
      }

      if (user.otp_expires_at) {
        updateData.otp_expires_at = null;
      }

      if (!user.first_name?.trim() && googleUser.firstName?.trim()) {
        updateData.first_name = googleUser.firstName.trim();
      }

      if (!user.last_name?.trim() && googleUser.lastName?.trim()) {
        updateData.last_name = googleUser.lastName.trim();
      }

      if (!user.profile_image && googleUser.picture) {
        updateData.profile_image = googleUser.picture;
      }

      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.customer.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    return this.issueSession(user);
  }

  async updateProfile(customerId: string, body: UpdateProfileDto) {
    const { profile, address } = body;

    let customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (profile) {
      const profileData = Object.fromEntries(
        Object.entries({
          first_name: profile.first_name?.trim() || undefined,
          last_name: profile.last_name?.trim() || undefined,
          phone: profile.phone?.trim() || undefined,
          profile_image: profile.profile_image?.trim() || undefined,
        }).filter(([, value]) => value !== undefined),
      );

      if (Object.keys(profileData).length > 0) {
        customer = await this.prisma.customer.update({
          where: { id: customerId },
          data: profileData,
        });
      }
    }

    if (address) {
      const fullName = [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

      const normalizedAddress = {
        company: address.company?.trim() || undefined,
        address_line1: address.address_line1.trim(),
        address_line2: address.address_line2?.trim() || undefined,
        city: address.city.trim(),
        postal_code: address.postal_code.trim(),
        region: address.region.trim(),
        country: address.country.trim(),
        phone: address.phone?.trim() || undefined,
        is_default: address.is_default ?? false,
        full_name: fullName,
      };

      const existingAddress = await this.prisma.customerAddress.findFirst({
        where: { customer_id: customerId },
      });

      if (existingAddress) {
        customer = await this.prisma.customer.update({
          where: { id: customerId },
          data: {
            phone: normalizedAddress.phone,
          },
        });
        await this.prisma.customerAddress.update({
          where: { id: existingAddress.id },
          data: normalizedAddress,
        });
      } else {
        customer = await this.prisma.customer.update({
          where: { id: customerId },
          data: {
            phone: normalizedAddress.phone,
          },
        });
        await this.prisma.customerAddress.create({
          data: {
            customer_id: customerId,
            full_name: normalizedAddress.full_name,
            company: normalizedAddress.company,
            address_line1: normalizedAddress.address_line1,
            address_line2: normalizedAddress.address_line2,
            city: normalizedAddress.city,
            postal_code: normalizedAddress.postal_code,
            region: normalizedAddress.region,
            country: normalizedAddress.country,
            phone: normalizedAddress.phone,
            is_default: normalizedAddress.is_default,
            type: 'SHIPPING',
          },
        });
      }
    }

    return this.getMe(customerId);
  }

  async getMe(customerId: string) {
    const user = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        addresses: true,
      },
    });

    if (!user) return null;

    const primaryAddress =
      user.addresses.find((address) => address.is_default) ??
      user.addresses[0] ??
      null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      profile_image: user.profile_image,
      createdAt: user.created_at,
      address: primaryAddress,
    };
  }
}
