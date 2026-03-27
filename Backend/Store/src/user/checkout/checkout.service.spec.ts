import { ForbiddenException } from '@nestjs/common';
import { BillingDocumentStatus } from '@prisma/client';
import { CheckoutService } from './checkout.service';

describe('CheckoutService billing document access guards', () => {
  const prisma = {
    $transaction: jest.fn(),
    billingDocument: {
      findUnique: jest.fn(),
    },
  } as any;

  const cartService = {
    getCart: jest.fn(),
  } as any;
  const couponService = {} as any;
  const mailService = {
    sendOrderConfirmation: jest.fn(),
  } as any;
  const shippingTaxService = {
    calculateTotals: jest.fn(),
  } as any;
  const redsysService = {} as any;
  const logger = {
    warn: jest.fn(),
    log: jest.fn(),
  } as any;
  const billingService = {
    generateDocumentPdf: jest.fn(),
    createDocumentFromOrder: jest.fn(),
  } as any;

  let service: CheckoutService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CheckoutService(
      prisma,
      cartService,
      couponService,
      mailService,
      shippingTaxService,
      redsysService,
      logger,
      billingService,
    );
  });

  it('prevents customers from downloading draft billing documents', async () => {
    prisma.billingDocument.findUnique.mockResolvedValue({
      id: 'doc-draft-1',
      status: BillingDocumentStatus.DRAFT,
      customer_id: 'customer-1',
    });

    await expect(
      service.getCustomerDocumentPdf('doc-draft-1', 'customer-1', false),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not auto-create COD billing draft during checkout order creation', async () => {
    cartService.getCart.mockResolvedValue({
      id: 'cart-1',
      items: [{ id: 'item-1' }],
      summary: { subtotal: 100, discount: 0 },
      applied_coupon: null,
    });
    shippingTaxService.calculateTotals.mockResolvedValue({
      status: 'OK',
      shipping_excl_tax: 5,
      tax_amount: 21,
      customs_duty_amount: 0,
      total: 126,
    });
    prisma.$transaction.mockResolvedValue({
      order: {
        id: 'order-cod-1',
        order_number: 'ORD-1',
        tracking_token: 'track-1',
        status: 'PENDING_PAYMENT',
        total_amount: 126,
        currency: 'EUR',
        created_at: new Date(),
      },
      paymentIntent: {
        id: 'pi-cod-1',
        status: 'cod_pending',
        provider: 'COD',
      },
    });
    mailService.sendOrderConfirmation.mockResolvedValue(undefined);

    await service.createOrder(undefined, 'session-1', {
      email: 'buyer@nexus.test',
      payment_method: 'COD',
      locale: 'es',
      billing_address: {} as any,
      shipping_address: {} as any,
    });

    expect(billingService.createDocumentFromOrder).not.toHaveBeenCalled();
  });

  it('keeps COD authorization in PENDING_PAYMENT flow (no PROCESSING transition or coupon increment)', async () => {
    const tx = {
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'payment-cod-1' }),
      },
      order: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      coupon: {
        update: jest.fn(),
      },
    } as any;

    const result = await (service as any).createPaymentIntent(
      'order-cod-2',
      99.5,
      'COD',
      'track-2',
      {
        subtotal: 80,
        shipping: 5,
        tax: 14.5,
        discount: 0,
        total: 99.5,
        currency: 'EUR',
        itemCount: 1,
      },
      undefined,
      tx,
    );

    expect(result.provider).toBe('COD');
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'AUTHORIZED',
        }),
      }),
    );
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.order.findUnique).not.toHaveBeenCalled();
    expect(tx.coupon.update).not.toHaveBeenCalled();
  });
});
