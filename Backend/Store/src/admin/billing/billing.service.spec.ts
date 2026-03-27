import { BadRequestException } from '@nestjs/common';
import { BillingDocumentStatus, BillingDocumentType, OrderStatus } from '@prisma/client';
import { BillingService } from './billing.service';

describe('BillingService issuance guards', () => {
  const prisma = {
    billingDocument: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
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

  it('creates manual documents as DRAFT and does not consume official number sequence', async () => {
    prisma.billingSettings.findFirst.mockResolvedValue({
      default_tax_rate: 0.21,
      default_currency: 'EUR',
      legal_name: 'The Nexus Store S.L.',
      trade_name: 'The Nexus Store',
      nif: 'A123',
      address_real: 'Address',
      iban_caixabank: null,
      iban_bbva: null,
    });
    prisma.billingDocument.create.mockResolvedValue({ id: 'manual-draft-1' });

    await service.createDocument({
      type: BillingDocumentType.INVOICE,
      customer_name: 'Manual Customer',
      items: [{ description: 'Test', qty: 1, unit_price: 10 }],
    });

    expect(prisma.billingDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BillingDocumentStatus.DRAFT,
        }),
      }),
    );
    expect(prisma.billingSeries.update).not.toHaveBeenCalled();
  });

  it('blocks creating manual documents directly as ISSUED', async () => {
    await expect(
      service.createDocument({
        type: BillingDocumentType.INVOICE,
        status: BillingDocumentStatus.ISSUED,
        customer_name: 'Unsafe',
        items: [{ description: 'Unsafe', qty: 1, unit_price: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the same INVOICE sequence for manual issue and ecommerce delivery issue', async () => {
    prisma.billingSettings.findFirst.mockResolvedValue({
      invoice_prefix: 'INV',
      quote_prefix: 'QUO',
      credit_note_prefix: 'CRN',
    });

    prisma.billingDocument.findUnique
      .mockResolvedValueOnce({
        id: 'manual-draft',
        type: BillingDocumentType.INVOICE,
        status: BillingDocumentStatus.DRAFT,
        order_id: null,
        source: 'MANUAL',
        items: [],
      })
      .mockResolvedValueOnce({
        id: 'ecom-draft',
        type: BillingDocumentType.INVOICE,
        status: BillingDocumentStatus.DRAFT,
        order_id: 'order-2',
        source: 'ECOMMERCE',
        items: [],
      });

    prisma.order.findUnique.mockResolvedValue({
      id: 'order-2',
      status: OrderStatus.DELIVERED,
    });

    let counter = 0;
    prisma.billingSeries.findUnique.mockResolvedValue({ id: 'series-1', prefix: 'INV' });
    prisma.billingSeries.update.mockImplementation(async () => {
      counter += 1;
      return { id: 'series-1', prefix: 'INV', last_counter: counter };
    });
    prisma.billingDocument.update.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      ...data,
    }));

    const manualIssued = await service.issueDocument('manual-draft', {}, 'admin@nexus.test');
    const ecommerceIssued = await (service as any).issueDocumentFromDelivery(
      'ecom-draft',
      'system',
    );
    const year = new Date().getFullYear();

    expect(manualIssued.document_number).toBe(`INV_${year}_0000001`);
    expect(ecommerceIssued.document_number).toBe(`INV_${year}_0000002`);
  });

  it('blocks manual number override for non-admin actors', async () => {
    await expect(
      service.updateDocumentNumber(
        'doc-7',
        { new_number: 'INV_2026_0001111' },
        'staff-1',
        'WAREHOUSE',
        'warehouse@nexus.test',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows admin number override for ecommerce invoices', async () => {
    prisma.billingDocument.findUnique
      .mockResolvedValueOnce({
        id: 'doc-ecom-1',
        type: BillingDocumentType.INVOICE,
        status: BillingDocumentStatus.ISSUED,
        source: 'ECOMMERCE',
        document_number: 'INV_2026_0000100',
      })
      .mockResolvedValueOnce(null);
    prisma.billingDocument.update.mockResolvedValue({
      id: 'doc-ecom-1',
      document_number: 'INV_2026_A-77',
    });

    const updated = await service.updateDocumentNumber(
      'doc-ecom-1',
      { new_number: 'INV_2026_A-77', reason: 'Corrección de serie' },
      'admin-1',
      'ADMIN',
      'admin@nexus.test',
    );

    expect(updated.document_number).toBe('INV_2026_A-77');
    expect(prisma.billingNumberAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          document_id: 'doc-ecom-1',
          old_number: 'INV_2026_0000100',
          new_number: 'INV_2026_A-77',
        }),
      }),
    );
  });

  it('backfills a historical paid order without a draft', async () => {
    prisma.order.findMany.mockResolvedValue([
      { id: 'order-h-1', order_number: 'ORD-H-1' },
    ]);
    jest
      .spyOn(service, 'createDocumentFromOrder')
      .mockResolvedValueOnce({ created: true, billing_document: { id: 'doc-h-1' } } as any);

    const result = await service.backfillPaidOrders();

    expect(result).toEqual({
      processed: 1,
      created: 1,
      skipped: 0,
      errors: [],
    });
  });

  it('does not duplicate documents on repeated backfill runs', async () => {
    prisma.order.findMany.mockResolvedValue([
      { id: 'order-h-2', order_number: 'ORD-H-2' },
    ]);
    const createFromOrderSpy = jest
      .spyOn(service, 'createDocumentFromOrder')
      .mockResolvedValue({ created: false, billing_document: { id: 'doc-existing' } } as any);

    const firstRun = await service.backfillPaidOrders();
    const secondRun = await service.backfillPaidOrders();

    expect(createFromOrderSpy).toHaveBeenCalledTimes(2);
    expect(firstRun.created).toBe(0);
    expect(firstRun.skipped).toBe(1);
    expect(secondRun.created).toBe(0);
    expect(secondRun.skipped).toBe(1);
  });
});
