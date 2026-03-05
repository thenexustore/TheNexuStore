import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { GoogleAuthGuard } from './google-verfication/google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.auth.register(body);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.auth.verifyOtp(body.email, body.otp);
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
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
  forgot(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  reset(
    @Body()
    body: {
      email: string;
      otp: string;
      password: string;
    },
  ) {
    return this.auth.resetPassword(body.email, body.otp, body.password);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request) {
    const user = (req as any).user;
    return this.auth.getMe(user?.id);
  }

  @Post('profile')
  @UseGuards(AuthGuard)
  updateProfile(@Req() req: Request, @Body() body: any) {
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
