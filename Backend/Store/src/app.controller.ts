import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health(): { status: string; service: string; time: Date } {
    return {
      status: 'ok',
      service: 'commerce-core',
      time: new Date(),
    };
  }
}
