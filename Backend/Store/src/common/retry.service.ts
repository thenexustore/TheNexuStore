import { Injectable } from '@nestjs/common';

@Injectable()
export class RetryService {
  async execute<T>(operation: () => Promise<T>, retries = 3, baseDelayMs = 200): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < retries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt >= retries) {
          break;
        }
        const delay = baseDelayMs * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
