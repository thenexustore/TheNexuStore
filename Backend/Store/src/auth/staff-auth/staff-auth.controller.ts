import { Controller, Post, Body } from '@nestjs/common';
import { StaffAuthService } from './staff-auth.service';

@Controller('staff/auth')
export class StaffAuthController {
  constructor(private readonly staffAuthService: StaffAuthService) {}

  @Post('login')
  login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.staffAuthService.login(email, password);
  }
}
