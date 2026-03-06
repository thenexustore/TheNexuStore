import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContextService } from './request-context.service';
import { AppLogger } from './app-logger.service';
import { RequestMetricsService } from './request-metrics.service';
import { RateLimitService } from './security/rate-limit.service';
import { RetryService } from './retry.service';
import { CsrfGuard } from './guards/csrf.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Global()
@Module({
  providers: [
    PrismaService,
    RequestContextService,
    AppLogger,
    RequestMetricsService,
    RateLimitService,
    RetryService,
    CsrfGuard,
    RateLimitGuard,
  ],
  exports: [
    PrismaService,
    RequestContextService,
    AppLogger,
    RequestMetricsService,
    RateLimitService,
    RetryService,
    CsrfGuard,
    RateLimitGuard,
  ],
})
export class CommonModule {}
