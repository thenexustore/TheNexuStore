import { HEADERS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PaymentController } from './payment.controller';
import { PaymentsController } from './payments.controller';

describe('Payment routing canonical + compatibility', () => {
  it('uses /payments as canonical controller base path', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PaymentsController)).toBe('payments');
  });

  it('keeps /payment as compatibility alias and marks endpoints deprecated', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PaymentController)).toBe('payment');

    const headers = Reflect.getMetadata(
      HEADERS_METADATA,
      PaymentController.prototype.initiatePayment,
    ) as Array<{ name: string; value: string }> | undefined;

    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'X-Nexus-Deprecated-Route',
          value: expect.stringContaining('/payments/*'),
        }),
      ]),
    );
  });
});
