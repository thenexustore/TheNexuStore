import { BadRequestException } from '@nestjs/common';
import { BillingDocumentStatus, BillingDocumentType, OrderStatus } from '@prisma/client';
import { BillingService } from './billing.service';

describe('BillingService issuance guards', () => {
  const prisma = {
    billingDocument: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    shipment: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    billingNumberAudit: {
      create: jest.fn(),
    },
    billingSettings: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    billingDocumentItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
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
        billingDocument: prisma.billingDocument,
        billingDocumentItem: prisma.billingDocumentItem,
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

  it('does not auto-create drafts while listing billing documents', async () => {
    prisma.billingDocument.findMany.mockResolvedValue([]);
    prisma.billingDocument.count.mockResolvedValue(0);
    prisma.billingDocument.findFirst.mockResolvedValue(null);
    const createSpy = jest
      .spyOn(service, 'createDocumentFromOrder')
      .mockResolvedValue({ created: true, billing_document: { id: 'doc' } } as any);

    const result = await service.listDocuments({
      page: 1,
      limit: 20,
    } as any);

    expect(result.items).toEqual([]);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('creates order-linked draft totals from order source-of-truth amounts exactly', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-amount-1',
      email: 'buyer@nexus.test',
      currency: 'EUR',
      customer_id: 'customer-1',
      subtotal_amount: 100,
      shipping_amount: 10,
      tax_amount: 23.1,
      discount_amount: 5,
      total_amount: 128.1,
      billing_address_json: {},
      items: [
        {
          qty: 1,
          unit_price: 100,
          title_snapshot: 'GPU',
          sku_id: 'sku-1',
          sku: { product: { title: 'GPU' } },
        },
      ],
      customer: { fiscal_profile: null, first_name: 'Ada', last_name: 'Lovelace' },
      payments: [{ provider: 'REDSYS' }],
    });
    prisma.billingDocument.findFirst.mockResolvedValue(null);
    prisma.billingSettings.findFirst.mockResolvedValue({
      legal_name: 'The Nexus Store S.L.',
      trade_name: 'The Nexus Store',
      nif: 'A123',
      address_real: 'Address',
      iban_caixabank: null,
      iban_bbva: null,
    });
    prisma.billingDocument.create.mockImplementation(async ({ data }: any) => ({
      id: 'doc-order-1',
      ...data,
      items: data.items?.create ?? [],
    }));

    const result = await service.createDocumentFromOrder('order-amount-1');

    expect(result.created).toBe(true);
    expect(result.billing_document.total_amount).toBe(128.1);
    expect(result.billing_document.subtotal_amount).toBe(110);
    expect(result.billing_document.tax_amount).toBe(23.1);
    expect(result.billing_document.discount_amount).toBe(5);
    expect(result.billing_document.items.some((item: any) => item.description === 'Shipping')).toBe(true);
  });

  it('re-syncs existing ecommerce draft totals from order source-of-truth before returning', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-sync-1',
      email: 'buyer@nexus.test',
      currency: 'EUR',
      customer_id: 'customer-1',
      subtotal_amount: 100,
      shipping_amount: 0,
      tax_amount: 21,
      discount_amount: 0,
      total_amount: 121,
      billing_address_json: {},
      items: [
        {
          qty: 1,
          unit_price: 100,
          title_snapshot: 'GPU',
          sku_id: 'sku-1',
          sku: { product: { title: 'GPU' } },
        },
      ],
      customer: { fiscal_profile: null, first_name: 'Ada', last_name: 'Lovelace' },
      payments: [{ provider: 'REDSYS' }],
    });
    prisma.billingDocument.findFirst.mockResolvedValue({
      id: 'doc-existing-draft',
      status: BillingDocumentStatus.DRAFT,
      items: [],
    });
    prisma.billingDocumentItem.deleteMany.mockResolvedValue({ count: 1 });
    prisma.billingDocumentItem.createMany.mockResolvedValue({ count: 1 });
    prisma.billingDocument.update.mockResolvedValue({
      id: 'doc-existing-draft',
      subtotal_amount: 100,
      tax_amount: 21,
      discount_amount: 0,
      total_amount: 121,
      items: [{ description: 'GPU' }],
    });

    const result = await service.createDocumentFromOrder('order-sync-1');

    expect(result.created).toBe(false);
    expect(prisma.billingDocumentItem.deleteMany).toHaveBeenCalledWith({
      where: { document_id: 'doc-existing-draft' },
    });
    expect(prisma.billingDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'doc-existing-draft' },
        data: expect.objectContaining({
          subtotal_amount: 100,
          tax_amount: 21,
          discount_amount: 0,
          total_amount: 121,
        }),
      }),
    );
  });

  it('keeps delivered-confirmation generated invoice total equal to order total', async () => {
    jest
      .spyOn(service as any, 'issueDocumentFromDelivery')
      .mockResolvedValue({ id: 'doc-delivery-1', status: BillingDocumentStatus.ISSUED });
    jest.spyOn(service, 'sendDocument').mockResolvedValue({ id: 'doc-delivery-1' } as any);

    prisma.order.findUnique.mockResolvedValue({
      id: 'order-delivery-1',
      status: OrderStatus.SHIPPED,
      email: 'buyer@nexus.test',
      currency: 'EUR',
      customer_id: 'customer-1',
      subtotal_amount: 80,
      shipping_amount: 5,
      tax_amount: 17.85,
      discount_amount: 0,
      total_amount: 102.85,
      billing_address_json: {},
      items: [
        {
          qty: 1,
          unit_price: 80,
          title_snapshot: 'CPU',
          sku_id: 'sku-2',
          sku: { product: { title: 'CPU' } },
        },
      ],
      customer: { fiscal_profile: null, first_name: 'Grace', last_name: 'Hopper' },
      payments: [{ provider: 'REDSYS' }],
    });
    prisma.order.update.mockResolvedValue({ id: 'order-delivery-1', status: OrderStatus.DELIVERED });
    prisma.billingDocument.findFirst.mockResolvedValue(null);
    prisma.billingSettings.findFirst.mockResolvedValue({
      legal_name: 'The Nexus Store S.L.',
      trade_name: 'The Nexus Store',
      nif: 'A123',
      address_real: 'Address',
      iban_caixabank: null,
      iban_bbva: null,
    });
    prisma.billingDocument.create.mockImplementation(async ({ data }: any) => ({
      id: 'doc-delivery-1',
      ...data,
      items: data.items?.create ?? [],
    }));
    prisma.billingDocument.findUnique.mockResolvedValue({
      id: 'doc-delivery-1',
      total_amount: 102.85,
      items: [],
    });

    const response = await service.markOrderDelivered('order-delivery-1', {});

    expect(prisma.billingDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal_amount: 85,
          tax_amount: 17.85,
          discount_amount: 0,
          total_amount: 102.85,
        }),
      }),
    );
    expect(response.order_status).toBe(OrderStatus.DELIVERED);
  });

  it('re-syncs existing ecommerce draft totals before delivery issuance', async () => {
    jest
      .spyOn(service as any, 'issueDocumentFromDelivery')
      .mockResolvedValue({ id: 'doc-existing-delivery', status: BillingDocumentStatus.ISSUED });
    jest.spyOn(service, 'sendDocument').mockResolvedValue({ id: 'doc-existing-delivery' } as any);

    prisma.order.findUnique.mockResolvedValue({
      id: 'order-delivery-sync',
      status: OrderStatus.SHIPPED,
      email: 'buyer@nexus.test',
      currency: 'EUR',
      customer_id: 'customer-1',
      subtotal_amount: 95,
      shipping_amount: 5,
      tax_amount: 21,
      discount_amount: 0,
      total_amount: 121,
      billing_address_json: {},
      items: [
        {
          qty: 1,
          unit_price: 95,
          title_snapshot: 'CPU',
          sku_id: 'sku-2',
          sku: { product: { title: 'CPU' } },
        },
      ],
      customer: { fiscal_profile: null, first_name: 'Grace', last_name: 'Hopper' },
      payments: [{ provider: 'REDSYS' }],
    });
    prisma.order.update.mockResolvedValue({ id: 'order-delivery-sync', status: OrderStatus.DELIVERED });
    prisma.billingDocument.findFirst.mockResolvedValue({
      id: 'doc-existing-delivery',
      status: BillingDocumentStatus.DRAFT,
      created_at: new Date(),
    });
    prisma.billingDocumentItem.deleteMany.mockResolvedValue({ count: 2 });
    prisma.billingDocumentItem.createMany.mockResolvedValue({ count: 2 });
    prisma.billingDocument.update.mockResolvedValue({
      id: 'doc-existing-delivery',
      subtotal_amount: 100,
      tax_amount: 21,
      discount_amount: 0,
      total_amount: 121,
      items: [],
    });
    prisma.billingDocument.findUnique.mockResolvedValue({
      id: 'doc-existing-delivery',
      status: BillingDocumentStatus.SENT,
      total_amount: 121,
      items: [],
    });

    const response = await service.markOrderDelivered('order-delivery-sync', {});

    expect(prisma.billingDocumentItem.deleteMany).toHaveBeenCalledWith({
      where: { document_id: 'doc-existing-delivery' },
    });
    expect(prisma.billingDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'doc-existing-delivery' },
        data: expect.objectContaining({
          subtotal_amount: 100,
          tax_amount: 21,
          discount_amount: 0,
          total_amount: 121,
        }),
      }),
    );
    expect(response.order_status).toBe(OrderStatus.DELIVERED);
  });
});
