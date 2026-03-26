import { ForbiddenException } from '@nestjs/common';
import { BillingDocumentStatus } from '@prisma/client';
import { CheckoutService } from './checkout.service';

describe('CheckoutService billing document access guards', () => {
  const prisma = {
    billingDocument: {
      findUnique: jest.fn(),
    },
  } as any;

  const cartService = {} as any;
  const couponService = {} as any;
  const mailService = {} as any;
  const shippingTaxService = {} as any;
  const redsysService = {} as any;
  const logger = {
    warn: jest.fn(),
    log: jest.fn(),
  } as any;
  const billingService = {
    generateDocumentPdf: jest.fn(),
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
});
