import { PaymentService } from './payment.service';
import { PrismaService } from '../../common/prisma.service';
import { RedsysService } from './redsys.service';
import { AppLogger } from '../../common/app-logger.service';
import { RetryService } from '../../common/retry.service';
import { BillingService } from '../../admin/billing/billing.service';

describe('PaymentService', () => {
  const originalEnv = { ...process.env };

  const prisma = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orderDiscount: {
      findMany: jest.fn(),
    },
    coupon: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const redsysService = {
    processNotification: jest.fn(),
    getCurrencyNumericCode: jest.fn(),
    getConfiguredMerchantCode: jest.fn(),
    getConfiguredTerminal: jest.fn(),
    assertNotificationMatchesExpected: jest.fn(),
    getResponseMessage: jest.fn(),
  } as unknown as RedsysService;

  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  } as unknown as AppLogger;

  const retryService = {
    execute: jest.fn(),
  } as unknown as RetryService;

  const orderTrackingEvents = {
    notifyByOrderId: jest.fn(),
  } as any;

  const billingService = {
    createDocumentFromOrder: jest.fn().mockResolvedValue(undefined),
  } as unknown as BillingService;

  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      BASE_URL: 'https://api.thenexustore.com',
      FRONTEND_URL: 'https://www.thenexustore.com',
      REDSYS_NOTIFY_URL: 'https://api.thenexustore.com/payments/redsys/notify',
      REDSYS_OK_URL: 'https://api.thenexustore.com/payments/redsys/ok',
      REDSYS_KO_URL: 'https://api.thenexustore.com/payments/redsys/ko',
    };

    service = new PaymentService(
      prisma,
      redsysService,
      logger,
      retryService,
      orderTrackingEvents,
      billingService,
    );

    (redsysService.getCurrencyNumericCode as jest.Mock).mockReturnValue('978');
    (redsysService.getConfiguredMerchantCode as jest.Mock).mockReturnValue(
      'merchant-code',
    );
    (redsysService.getConfiguredTerminal as jest.Mock).mockReturnValue('1');
    (redsysService.getResponseMessage as jest.Mock).mockReturnValue(
      'Transaction approved',
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('delegates Bizum payments through the Redsys payment flow', async () => {
    const createRedsysPaymentForOrderSpy = jest
      .spyOn(service, 'createRedsysPaymentForOrder')
      .mockResolvedValue({
        success: true,
        provider: 'BIZUM',
        paymentId: 'payment-1',
        orderId: 'order-1',
      });

    const result = await service.createPayment({
      orderId: 'order-1',
      provider: 'BIZUM',
      customerPhone: '600123123',
      trackingToken: 'track-1',
    });

    expect(createRedsysPaymentForOrderSpy).toHaveBeenCalledWith({
      orderId: 'order-1',
      returnUrl: undefined,
      trackingToken: 'track-1',
      customerId: undefined,
      customerPhone: '600123123',
      paymentMethod: 'BIZUM',
    });
    expect(result.provider).toBe('BIZUM');
  });

  it('maps initiated Redsys returns to a pending storefront tracking state', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      status: 'INITIATED',
      order: {
        tracking_token: 'track-123',
      },
    });

    const redirectUrl = await service.resolveRedsysReturn(
      'success',
      'merchant-order-123',
    );

    expect(redirectUrl).toBe(
      'https://www.thenexustore.com/order/track/track-123?payment=pending',
    );
  });

  it('maps captured Redsys returns to a success storefront tracking state', async () => {
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
      status: 'CAPTURED',
      order: {
        tracking_token: 'track-456',
      },
    });

    const redirectUrl = await service.resolveRedsysReturn(
      'success',
      'merchant-order-456',
    );

    expect(redirectUrl).toBe(
      'https://www.thenexustore.com/order/track/track-456?payment=success',
    );
  });

  it('captures successful Bizum notifications as paid Redsys payments', async () => {
    const notificationResult = {
      success: true,
      signatureVersion: 'HMAC_SHA256_V1',
      merchantOrderReference: 'merchant-order-789',
      authCode: '123456',
      responseCode: '0000',
      amountInCents: 1995,
      currency: '978',
      merchantCode: 'merchant-code',
      terminal: '1',
      merchantData: 'payment-789',
      payMethod: 'BIZUM',
      processedPayMethod: '68',
      rawParams: {
        Ds_Response: '0000',
      },
    };

    const paymentRecord = {
      id: 'payment-789',
      order_id: 'order-789',
      amount: 19.95,
      currency: 'EUR',
      status: 'INITIATED',
      provider_payment_id: 'merchant-order-789',
      raw_response: {
        redsysRequest: {
          paymentMethod: 'BIZUM',
        },
      },
      order: {
        id: 'order-789',
      },
    };

    const tx = {
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderDiscount: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      coupon: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };

    (redsysService.processNotification as jest.Mock).mockResolvedValue(
      notificationResult,
    );
    (retryService.execute as jest.Mock).mockImplementation((fn) => fn());
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(paymentRecord);
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(tx));

    await service.handleRedsysNotification({
      Ds_SignatureVersion: 'HMAC_SHA256_V1',
      Ds_MerchantParameters: 'merchant-params',
      Ds_Signature: 'signature',
    });

    expect(
      redsysService.assertNotificationMatchesExpected,
    ).toHaveBeenCalledWith(notificationResult, {
      merchantOrderReference: 'merchant-order-789',
      amountInCents: 1995,
      currency: '978',
      merchantCode: 'merchant-code',
      terminal: '1',
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-789' },
      data: {
        status: 'CAPTURED',
        raw_response: expect.objectContaining({
          redsys: expect.objectContaining({
            responseCode: '0000',
            authCode: '123456',
            payMethod: 'BIZUM',
            processedPayMethod: '68',
            merchantOrderReference: 'merchant-order-789',
            merchantCode: 'merchant-code',
            terminal: '1',
            amountInCents: 1995,
            currency: '978',
          }),
        }),
      },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-789' },
      data: {
        status: 'PAID',
        paid_at: expect.any(Date),
      },
    });
  });
});
