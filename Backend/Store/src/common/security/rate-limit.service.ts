import { Injectable } from '@nestjs/common';

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, number[]>();

  consume(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    const values = (this.buckets.get(key) ?? []).filter((v) => v >= windowStart);

    if (values.length >= limit) {
      this.buckets.set(key, values);
      return false;
    }

    values.push(now);
    this.buckets.set(key, values);
    return true;
  }
}
