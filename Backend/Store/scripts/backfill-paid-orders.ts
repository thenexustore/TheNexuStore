import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BillingService } from '../src/admin/billing/billing.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const billingService = app.get(BillingService);
    const result = await billingService.backfillPaidOrders();
    console.log(
      JSON.stringify(
        {
          ok: true,
          task: 'backfill-paid-orders',
          ...result,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        task: 'backfill-paid-orders',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
