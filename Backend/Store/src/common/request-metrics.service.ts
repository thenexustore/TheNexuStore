import { Injectable } from '@nestjs/common';

interface EndpointMetric {
  count: number;
  errors: number;
  totalDurationMs: number;
}

@Injectable()
export class RequestMetricsService {
  private readonly metrics = new Map<string, EndpointMetric>();

  record(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ): EndpointMetric {
    const key = `${method} ${path}`;
    const previous = this.metrics.get(key) ?? {
      count: 0,
      errors: 0,
      totalDurationMs: 0,
    };

    const next = {
      count: previous.count + 1,
      errors: previous.errors + (statusCode >= 400 ? 1 : 0),
      totalDurationMs: previous.totalDurationMs + durationMs,
    };
    this.metrics.set(key, next);
    return next;
  }
}
