import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { GoogleAuthGuard } from './google-verfication/google-auth.guard';
import {
  buildAuthCookieClearOptions,
  buildAuthCookieOptions,
  buildCsrfCookieClearOptions,
  buildCsrfCookieOptions,
} from './auth-cookie.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ForgotPasswordDto,
  ResendOtpDto,
  ResetPasswordDto,
  UpdateProfileDto,
  VerifyOtpDto,
} from './dto/auth-requests.dto';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Get('csrf-token')
  csrfToken(@Res({ passthrough: true }) res: Response) {
    const token = randomUUID();
    res.cookie('csrf_token', token, buildCsrfCookieOptions());
    return { csrfToken: token };
  }

  @Post('register')
  @UseGuards(RateLimitGuard)
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('verify-otp')
  @UseGuards(RateLimitGuard)
  async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.verifyOtp(body.email, body.otp);
    res.cookie('access_token', session.accessToken, buildAuthCookieOptions());
    return { success: true, user: session.user };
  }

  @Post('resend-otp')
  @UseGuards(RateLimitGuard)
  resendOtp(@Body() body: ResendOtpDto) {
    return this.auth.resendOtp(body.email);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.login(body);
    res.cookie('access_token', session.accessToken, buildAuthCookieOptions());
    return { success: true, user: session.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', buildAuthCookieClearOptions());
    res.clearCookie('csrf_token', buildCsrfCookieClearOptions());
    return { success: true };
  }

  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  forgot(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @UseGuards(RateLimitGuard)
  reset(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body.email, body.otp, body.password);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request) {
    const user = (req as any).user;
    if (user?.isStaffAdmin) {
      return {
        id: user.id,
        email: user.email,
        firstName: (user as any).firstName ?? (req as any).staff?.name ?? 'Staff',
        lastName: (user as any).lastName ?? '',
        role: 'ADMIN',
        profile_image: null,
        createdAt: new Date(),
        address: null,
      };
    }
    return this.auth.getMe(user?.id);
  }

  @Post('profile')
  @UseGuards(AuthGuard, CsrfGuard)
  updateProfile(@Req() req: Request, @Body() body: UpdateProfileDto) {
    const user = (req as any).user;
    return this.auth.updateProfile(user?.id, body);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    const session = await this.auth.googleLogin(user);
    res.cookie('access_token', session.accessToken, buildAuthCookieOptions());
    const frontendUrl = (
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ).replace(/\/$/, '');
    res.redirect(new URL('/store', `${frontendUrl}/`).toString());
  }
}
