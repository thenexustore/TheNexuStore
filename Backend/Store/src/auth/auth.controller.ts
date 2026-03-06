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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ForgotPasswordDto,
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
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('csrf_token', token, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    return { csrfToken: token };
  }

  @Post('register')
  @UseGuards(RateLimitGuard)
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.auth.verifyOtp(body.email, body.otp);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const token = await this.auth.login(body);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', token.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    return { success: true };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { success: true };
  }

  @Post('forgot-password')
  forgot(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  reset(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body.email, body.otp, body.password);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request) {
    const user = (req as any).user;
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
    const token = await this.auth.googleLogin(user);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', token.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    res.redirect(`${process.env.FRONTEND_URL}/store`);
  }
}
