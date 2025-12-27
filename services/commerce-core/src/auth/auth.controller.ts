import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AuthGuard as PassportGuard } from '@nestjs/passport';

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
    res.cookie('access_token', token.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
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
  me(@Req() req) {
    return {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      role: req.user.role,
      profile_image: req.user.profile_image,
      createdAt: req.user.created_at,
    };
  }

  @Get('google')
  @UseGuards(PassportGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(PassportGuard('google'))
  async googleCallback(@Req() req, @Res() res) {
    const token = await this.auth.googleLogin(req.user);

    res.cookie('access_token', token.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
    });

    res.redirect('http://localhost:3000/account');
  }
}
