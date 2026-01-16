import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { InfortisaService } from './infortisa.service';
import { ProductsService } from '../user/products/products.service';

@Injectable()
export class InfortisaSyncService {
  constructor(
    private prisma: PrismaService,
    private infortisa: InfortisaService,
    private products: ProductsService,
  ) {}

  @Cron('*/5 * * * *')
  async syncStock() {
    const last = await this.getLastSync('stock');
    const items = await this.infortisa.getModifiedStock(last.toString());
    for (const p of items) await this.products.upsertFromInfortisa(p);
    await this.setLastSync('stock');
  }

  @Cron('*/30 * * * *')
  async syncProducts() {
    const last = await this.getLastSync('product');
    const items = await this.infortisa.getModifiedProducts(last.toString());
    for (const p of items) await this.products.upsertFromInfortisa(p);
    await this.setLastSync('product');
  }

  private async getLastSync(type: string) {
    const row = await this.prisma.syncLog.findUnique({ where: { type } });
    return row?.last_sync || '01/01/2024 00:00:00';
  }

  private async setLastSync(type: string) {
    await this.prisma.syncLog.upsert({
      where: { type },
      update: { last_sync: new Date().toISOString() },
      create: { type, last_sync: new Date().toISOString() },
    });
  }
}
