import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'commerce-core',
      time: new Date().toISOString(),
    };
  }
}
