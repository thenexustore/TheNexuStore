import { BadRequestException } from '@nestjs/common';
import { BillingDocumentStatus, BillingDocumentType, OrderStatus } from '@prisma/client';
import { BillingService } from './billing.service';

describe('BillingService issuance guards', () => {
  const prisma = {
    billingDocument: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    billingNumberAudit: {
      create: jest.fn(),
    },
    billingSettings: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    billingSeries: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const mailService = {} as any;

  let service: BillingService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        billingSeries: prisma.billingSeries,
      }),
    );
    service = new BillingService(prisma, mailService);
  });

  it('blocks direct issuance of order-linked draft invoices', async () => {
    prisma.billingDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      type: BillingDocumentType.INVOICE,
      status: BillingDocumentStatus.DRAFT,
      order_id: 'order-1',
      items: [],
    });
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.DELIVERED,
    });

    await expect(service.issueDocument('doc-1', {}, 'ops@test.com')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('blocks quote conversion when quote is linked to an order', async () => {
    prisma.billingDocument.findUnique.mockResolvedValue({
      id: 'quote-1',
      type: BillingDocumentType.QUOTE,
      status: BillingDocumentStatus.DRAFT,
      order_id: 'order-1',
      items: [],
    });

    await expect(
      service.convertQuoteToInvoice('quote-1', {}, 'ops@test.com'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
