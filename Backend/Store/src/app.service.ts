import { Injectable } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import { Socket, connect } from 'node:net';

type HealthState = 'ok' | 'fail' | 'disabled';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    const db = await this.checkDb();
    const redis = await this.checkService(process.env.REDIS_URL, 6379);
    const rabbit = await this.checkService(process.env.RABBITMQ_URL, 5672);

    const hasRequiredFailure = db === 'fail';
    const hasOptionalFailure = [redis, rabbit].includes('fail');

    return {
      app: hasRequiredFailure || hasOptionalFailure ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      db,
      redis,
      rabbit,
    };
  }

  private async checkDb(): Promise<Exclude<HealthState, 'disabled'>> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'fail';
    }
  }

  private async checkService(
    url: string | undefined,
    defaultPort: number,
  ): Promise<HealthState> {
    if (!url) {
      return 'disabled';
    }

    try {
      const parsed = new URL(url);
      const host = parsed.hostname;
      const port = parsed.port ? Number(parsed.port) : defaultPort;

      if (!host || !port) {
        return 'fail';
      }

      await this.canConnect(host, port);
      return 'ok';
    } catch {
      return 'fail';
    }
  }

  private canConnect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket: Socket = connect({ host, port });

      socket.setTimeout(1500);

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });

      socket.once('error', (error) => {
        reject(error);
      });
    });
  }
}
