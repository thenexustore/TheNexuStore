import { BadRequestException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const orderId = 'order-1';

  const buildService = () => {
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: orderId,
          status: 'PENDING_PAYMENT',
          total_amount: 120,
          payments: [],
        }),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'payment-1' }),
      },
    } as any;

    const redsysService = {
      createPaymentForm: jest.fn().mockReturnValue({
        formUrl: 'https://gateway.example/redsys',
      }),
    } as any;

    const couponService = {} as any;

    const service = new PaymentService(prisma, redsysService, couponService);
    return { service, prisma, redsysService };
  };

  it('uses separate success_url and failure_url for REDSYS checkout redirects', async () => {
    const { service, redsysService } = buildService();

    await service.createPayment({
      orderId,
      provider: 'REDSYS' as PaymentProvider,
      successUrl: 'https://store.example/checkout/success-custom',
      failureUrl: 'https://store.example/checkout/failure-custom',
    });

    expect(redsysService.createPaymentForm).toHaveBeenCalledWith(
      orderId,
      120,
      expect.stringContaining('/api/payment/redsys/notification'),
      'https://store.example/checkout/success-custom',
      'https://store.example/checkout/failure-custom',
    );
  });

  it('rejects unsupported payment providers', async () => {
    const { service } = buildService();

    await expect(
      service.createPayment({
        orderId,
        provider: 'PAYPAL' as PaymentProvider,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
