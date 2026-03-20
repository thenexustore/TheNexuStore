import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  BillingDocumentStatus,
  BillingDocumentType,
  BillingLanguage,
  BillingPaymentMethod,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import {
  BillingDocumentsQueryDto,
  ConvertQuoteToInvoiceDto,
  CreateBillingDocumentDto,
  CreateBillingTemplateDto,
  ExportBillingDocumentsDto,
  IssueBillingDocumentDto,
  MarkOrderDeliveredDto,
  UpdateBillingDocumentDto,
  UpdateBillingSettingsDto,
  UpdateBillingTemplateDto,
  UpdateDocumentNumberDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Settings ────────────────────────────────────────────────────────────────

  async getSettings() {
    let settings = await this.prisma.billingSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.billingSettings.create({ data: {} });
    }
    return settings;
  }

  async updateSettings(dto: UpdateBillingSettingsDto) {
    let settings = await this.prisma.billingSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.billingSettings.create({ data: {} });
    }
    return this.prisma.billingSettings.update({
      where: { id: settings.id },
      data: {
        ...(dto.legal_name !== undefined && { legal_name: dto.legal_name }),
        ...(dto.trade_name !== undefined && { trade_name: dto.trade_name }),
        ...(dto.nif !== undefined && { nif: dto.nif }),
        ...(dto.address_real !== undefined && {
          address_real: dto.address_real,
        }),
        ...(dto.address_virtual !== undefined && {
          address_virtual: dto.address_virtual,
        }),
        ...(dto.iban_caixabank !== undefined && {
          iban_caixabank: dto.iban_caixabank,
        }),
        ...(dto.iban_bbva !== undefined && { iban_bbva: dto.iban_bbva }),
        ...(dto.website_com !== undefined && { website_com: dto.website_com }),
        ...(dto.website_es !== undefined && { website_es: dto.website_es }),
        ...(dto.default_language !== undefined && {
          default_language: dto.default_language,
        }),
        ...(dto.invoice_prefix !== undefined && {
          invoice_prefix: dto.invoice_prefix,
        }),
        ...(dto.quote_prefix !== undefined && {
          quote_prefix: dto.quote_prefix,
        }),
        ...(dto.credit_note_prefix !== undefined && {
          credit_note_prefix: dto.credit_note_prefix,
        }),
      },
    });
  }

  // ─── Series / Numbering ───────────────────────────────────────────────────────

  private async assignNextNumber(
    type: BillingDocumentType,
  ): Promise<{ number: string; seriesId: string }> {
    const settings = await this.getSettings();
    const year = new Date().getFullYear();
    let prefix: string;

    switch (type) {
      case BillingDocumentType.INVOICE:
        prefix = settings.invoice_prefix;
        break;
      case BillingDocumentType.QUOTE:
        prefix = settings.quote_prefix;
        break;
      case BillingDocumentType.CREDIT_NOTE:
        prefix = settings.credit_note_prefix;
        break;
      default:
        prefix = 'DOC';
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let series = await tx.billingSeries.findUnique({
        where: { type_year: { type, year } },
      });
      if (!series) {
        series = await tx.billingSeries.create({
          data: { type, year, prefix, last_counter: 0 },
        });
      }
      return tx.billingSeries.update({
        where: { id: series.id },
        data: { last_counter: { increment: 1 } },
      });
    });

    const counter = String(updated.last_counter).padStart(7, '0');
    return {
      number: `${updated.prefix}_${year}_${counter}`,
      seriesId: updated.id,
    };
  }

  // ─── Documents ────────────────────────────────────────────────────────────────

  async listDocuments(query: BillingDocumentsQueryDto) {
    const { page, limit, type, status, search, from, to } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BillingDocumentWhereInput = {
      ...(type && { type }),
      ...(status && { status }),
      ...(from || to
        ? {
            created_at: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { document_number: { contains: search, mode: 'insensitive' } },
          { customer_name: { contains: search, mode: 'insensitive' } },
          { customer_email: { contains: search, mode: 'insensitive' } },
          { customer_tax_id: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.billingDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { items: true, series: true },
      }),
      this.prisma.billingDocument.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getDocumentById(id: string) {
    const doc = await this.prisma.billingDocument.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: 'asc' } },
        series: true,
        order: true,
        number_audits: { orderBy: { created_at: 'desc' } },
        template: true,
      },
    });
    if (!doc) throw new NotFoundException('Billing document not found');
    return doc;
  }

  async createDocument(dto: CreateBillingDocumentDto) {
    const { items, ...docData } = dto;
    const settings = await this.getSettings();

    const lineItems = (items ?? []).map((item, i) => {
      const taxRate = item.tax_rate ?? 0.21;
      const lineSubtotal = Number(item.qty) * Number(item.unit_price);
      const taxAmount = lineSubtotal * taxRate;
      const lineTotal = lineSubtotal + taxAmount;
      return {
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        tax_rate: taxRate,
        line_subtotal: lineSubtotal,
        tax_amount: taxAmount,
        line_total: lineTotal,
        position: item.position ?? i,
      };
    });

    const subtotal = lineItems.reduce((s, i) => s + Number(i.line_subtotal), 0);
    const taxAmount = lineItems.reduce((s, i) => s + Number(i.tax_amount), 0);
    const total = lineItems.reduce((s, i) => s + Number(i.line_total), 0);

    return this.prisma.billingDocument.create({
      data: {
        type: docData.type,
        status: docData.status ?? BillingDocumentStatus.DRAFT,
        order_id: docData.order_id,
        customer_id: docData.customer_id,
        language: docData.language ?? BillingLanguage.ES,
        payment_method: docData.payment_method,
        issue_date: docData.issue_date ? new Date(docData.issue_date) : null,
        due_date: docData.due_date ? new Date(docData.due_date) : null,
        notes: docData.notes,
        internal_notes: docData.internal_notes,
        template_id: docData.template_id,
        source_document_id: docData.source_document_id,
        company_legal_name: settings.legal_name,
        company_trade_name: settings.trade_name,
        company_nif: settings.nif,
        company_address: settings.address_real,
        company_iban_1: settings.iban_caixabank,
        company_iban_2: settings.iban_bbva,
        subtotal_amount: subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        items: {
          create: lineItems,
        },
      },
      include: { items: true },
    });
  }

  async updateDocument(id: string, dto: UpdateBillingDocumentDto) {
    const doc = await this.prisma.billingDocument.findUnique({
      where: { id },
    });
    if (!doc) throw new NotFoundException('Billing document not found');
    if (doc.status === BillingDocumentStatus.VOID) {
      throw new BadRequestException('Cannot update a void document');
    }

    const { items, ...docData } = dto;

    let subtotal = 0;
    let taxAmount = 0;
    let total = 0;

    if (items !== undefined) {
      await this.prisma.billingDocumentItem.deleteMany({
        where: { document_id: id },
      });

      const lineItems = items.map((item, i) => {
        const taxRate = item.tax_rate ?? 0.21;
        const lineSubtotal = Number(item.qty) * Number(item.unit_price);
        const taxAmountLine = lineSubtotal * taxRate;
        const lineTotal = lineSubtotal + taxAmountLine;
        subtotal += lineSubtotal;
        taxAmount += taxAmountLine;
        total += lineTotal;
        return {
          document_id: id,
          description: item.description,
          qty: item.qty,
          unit_price: item.unit_price,
          tax_rate: taxRate,
          line_subtotal: lineSubtotal,
          tax_amount: taxAmountLine,
          line_total: lineTotal,
          position: item.position ?? i,
        };
      });

      await this.prisma.billingDocumentItem.createMany({ data: lineItems });
    }

    return this.prisma.billingDocument.update({
      where: { id },
      data: {
        ...(docData.status !== undefined && { status: docData.status }),
        ...(docData.language !== undefined && { language: docData.language }),
        ...(docData.payment_method !== undefined && {
          payment_method: docData.payment_method,
        }),
        ...(docData.issue_date !== undefined && {
          issue_date: docData.issue_date ? new Date(docData.issue_date) : null,
        }),
        ...(docData.due_date !== undefined && {
          due_date: docData.due_date ? new Date(docData.due_date) : null,
        }),
        ...(docData.notes !== undefined && { notes: docData.notes }),
        ...(docData.internal_notes !== undefined && {
          internal_notes: docData.internal_notes,
        }),
        ...(docData.template_id !== undefined && {
          template_id: docData.template_id,
        }),
        ...(items !== undefined && {
          subtotal_amount: subtotal,
          tax_amount: taxAmount,
          total_amount: total,
        }),
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  async deleteDocument(id: string) {
    const doc = await this.prisma.billingDocument.findUnique({
      where: { id },
    });
    if (!doc) throw new NotFoundException('Billing document not found');
    if (
      doc.status !== BillingDocumentStatus.DRAFT &&
      doc.status !== BillingDocumentStatus.VOID
    ) {
      throw new BadRequestException(
        'Only DRAFT or VOID documents can be deleted',
      );
    }
    await this.prisma.billingDocument.delete({ where: { id } });
    return { deleted: true, id };
  }

  async issueDocument(
    id: string,
    dto: IssueBillingDocumentDto,
    actorEmail?: string,
  ) {
    const doc = await this.prisma.billingDocument.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!doc) throw new NotFoundException('Billing document not found');
    if (doc.status !== BillingDocumentStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT documents can be issued');
    }

    const { number, seriesId } = await this.assignNextNumber(doc.type);
    const issueDate = dto.issue_date ? new Date(dto.issue_date) : new Date();

    const updated = await this.prisma.billingDocument.update({
      where: { id },
      data: {
        status: BillingDocumentStatus.ISSUED,
        document_number: number,
        series_id: seriesId,
        issue_date: issueDate,
        issued_at: issueDate,
        ...(dto.payment_method !== undefined && {
          payment_method: dto.payment_method,
        }),
        pdf_url: `/billing/pdf/${id}`,
      },
      include: { items: true },
    });

    await this.prisma.billingNumberAudit.create({
      data: {
        document_id: id,
        old_number: null,
        new_number: number,
        changed_by: actorEmail ?? 'system',
        changed_by_email: actorEmail,
        reason: 'Document issued',
      },
    });

    return updated;
  }

  async convertQuoteToInvoice(
    quoteId: string,
    dto: ConvertQuoteToInvoiceDto,
    actorEmail?: string,
  ) {
    const quote = await this.prisma.billingDocument.findUnique({
      where: { id: quoteId },
      include: { items: true },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.type !== BillingDocumentType.QUOTE) {
      throw new BadRequestException('Document is not a quote');
    }
    if (quote.status === BillingDocumentStatus.VOID) {
      throw new BadRequestException('Cannot convert a void quote');
    }

    const { number, seriesId } = await this.assignNextNumber(
      BillingDocumentType.INVOICE,
    );
    const issueDate = dto.issue_date ? new Date(dto.issue_date) : new Date();

    const invoice = await this.prisma.billingDocument.create({
      data: {
        type: BillingDocumentType.INVOICE,
        status: BillingDocumentStatus.ISSUED,
        document_number: number,
        series_id: seriesId,
        source_document_id: quoteId,
        order_id: quote.order_id,
        customer_id: quote.customer_id,
        language: quote.language,
        currency: quote.currency,
        payment_method: dto.payment_method ?? quote.payment_method,
        issue_date: issueDate,
        issued_at: issueDate,
        notes: quote.notes,
        internal_notes: quote.internal_notes,
        template_id: quote.template_id,
        company_legal_name: quote.company_legal_name,
        company_trade_name: quote.company_trade_name,
        company_nif: quote.company_nif,
        company_address: quote.company_address,
        company_iban_1: quote.company_iban_1,
        company_iban_2: quote.company_iban_2,
        customer_name: quote.customer_name,
        customer_tax_id: quote.customer_tax_id,
        customer_email: quote.customer_email,
        customer_address: quote.customer_address,
        subtotal_amount: quote.subtotal_amount,
        tax_amount: quote.tax_amount,
        discount_amount: quote.discount_amount,
        total_amount: quote.total_amount,
        pdf_url: null,
        items: {
          create: quote.items.map((item) => ({
            description: item.description,
            qty: item.qty,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            line_subtotal: item.line_subtotal,
            tax_amount: item.tax_amount,
            line_total: item.line_total,
            position: item.position,
          })),
        },
      },
      include: { items: true },
    });

    await this.prisma.billingDocument.update({
      where: { id: invoice.id },
      data: { pdf_url: `/billing/pdf/${invoice.id}` },
    });

    await this.prisma.billingNumberAudit.create({
      data: {
        document_id: invoice.id,
        old_number: null,
        new_number: number,
        changed_by: actorEmail ?? 'system',
        changed_by_email: actorEmail,
        reason: `Converted from quote ${quote.document_number ?? quoteId}`,
      },
    });

    return invoice;
  }

  async updateDocumentNumber(
    id: string,
    dto: UpdateDocumentNumberDto,
    actorId: string,
    actorEmail?: string,
  ) {
    const doc = await this.prisma.billingDocument.findUnique({
      where: { id },
    });
    if (!doc) throw new NotFoundException('Billing document not found');

    const oldNumber = doc.document_number;

    if (dto.new_number !== oldNumber) {
      const existing = await this.prisma.billingDocument.findUnique({
        where: { document_number: dto.new_number },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Document number ${dto.new_number} is already in use`,
        );
      }
    }

    const updated = await this.prisma.billingDocument.update({
      where: { id },
      data: { document_number: dto.new_number },
    });

    await this.prisma.billingNumberAudit.create({
      data: {
        document_id: id,
        old_number: oldNumber,
        new_number: dto.new_number,
        changed_by: actorId,
        changed_by_email: actorEmail,
        reason: dto.reason ?? 'Manual number correction',
      },
    });

    return updated;
  }

  // ─── Templates ────────────────────────────────────────────────────────────────

  async listTemplates() {
    return this.prisma.billingTemplate.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async createTemplate(dto: CreateBillingTemplateDto) {
    if (dto.is_default) {
      await this.prisma.billingTemplate.updateMany({
        data: { is_default: false },
      });
    }
    return this.prisma.billingTemplate.create({
      data: {
        name: dto.name,
        background_url: dto.background_url,
        config_json: dto.config_json,
        is_default: dto.is_default ?? false,
      },
    });
  }

  async updateTemplate(id: string, dto: UpdateBillingTemplateDto) {
    const existing = await this.prisma.billingTemplate.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Template not found');

    if (dto.is_default) {
      await this.prisma.billingTemplate.updateMany({
        where: { id: { not: id } },
        data: { is_default: false },
      });
    }

    return this.prisma.billingTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.background_url !== undefined && {
          background_url: dto.background_url,
        }),
        ...(dto.config_json !== undefined && { config_json: dto.config_json }),
        ...(dto.is_default !== undefined && { is_default: dto.is_default }),
      },
    });
  }

  async deleteTemplate(id: string) {
    const existing = await this.prisma.billingTemplate.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Template not found');
    await this.prisma.billingTemplate.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─── Export ───────────────────────────────────────────────────────────────────

  async exportDocuments(query: ExportBillingDocumentsDto) {
    const where: Prisma.BillingDocumentWhereInput = {
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.from || query.to
        ? {
            issue_date: {
              ...(query.from && { gte: new Date(query.from) }),
              ...(query.to && { lte: new Date(query.to) }),
            },
          }
        : {}),
    };

    const docs = await this.prisma.billingDocument.findMany({
      where,
      orderBy: { issue_date: 'asc' },
      include: { items: true },
    });

    const header = [
      'document_number',
      'type',
      'status',
      'issue_date',
      'customer_name',
      'customer_tax_id',
      'subtotal_amount',
      'tax_amount',
      'total_amount',
      'currency',
      'payment_method',
    ].join(',');

    const rows = docs.map((d) =>
      [
        d.document_number ?? '',
        d.type,
        d.status,
        d.issue_date ? d.issue_date.toISOString().split('T')[0] : '',
        d.customer_name ?? '',
        d.customer_tax_id ?? '',
        d.subtotal_amount.toFixed(2),
        d.tax_amount.toFixed(2),
        d.total_amount.toFixed(2),
        d.currency,
        d.payment_method ?? '',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  // ─── Mark Order Delivered ─────────────────────────────────────────────────────

  async markOrderDelivered(orderId: string, dto: MarkOrderDeliveredDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { sku: { include: { product: true } } },
        },
        customer: {
          include: { fiscal_profile: true },
        },
        payments: { orderBy: { created_at: 'desc' }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED },
    });

    if (dto.tracking_url) {
      const existingShipment = await this.prisma.shipment.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
      });
      if (existingShipment) {
        await this.prisma.shipment.update({
          where: { id: existingShipment.id },
          data: {
            tracking_url: dto.tracking_url,
            status: 'DELIVERED',
            delivered_at: new Date(),
          },
        });
      } else {
        await this.prisma.shipment.create({
          data: {
            order_id: orderId,
            carrier: 'INFORTISA',
            tracking_url: dto.tracking_url,
            status: 'DELIVERED',
            delivered_at: new Date(),
          },
        });
      }
    }

    const existingDoc = await this.prisma.billingDocument.findUnique({
      where: { order_id: orderId },
    });
    if (existingDoc) {
      return {
        order_status: OrderStatus.DELIVERED,
        billing_document: existingDoc,
      };
    }

    const settings = await this.getSettings();
    const customer = order.customer;
    const fiscalProfile = customer?.fiscal_profile;
    const billingAddr = order.billing_address_json as Record<string, unknown>;

    const customerName =
      fiscalProfile?.company_name ??
      ((billingAddr?.full_name as string) ||
        `${customer?.first_name ?? ''} ${customer?.last_name ?? ''}`.trim() ||
        order.email);
    const customerTaxId =
      fiscalProfile?.tax_id ?? (billingAddr?.vat_id as string) ?? null;
    const customerEmail = order.email;
    const customerAddress = fiscalProfile?.fiscal_address
      ? [
          fiscalProfile.fiscal_address,
          fiscalProfile.fiscal_city,
          fiscalProfile.fiscal_postal,
          fiscalProfile.fiscal_country,
        ]
          .filter(Boolean)
          .join(', ')
      : billingAddr
        ? [
            billingAddr.address_line1,
            billingAddr.city,
            billingAddr.postal_code,
            billingAddr.country,
          ]
            .filter(Boolean)
            .join(', ')
        : null;

    const payment = order.payments[0];
    let paymentMethod: BillingPaymentMethod | null = null;
    if (payment) {
      switch (payment.provider) {
        case 'REDSYS':
          paymentMethod = BillingPaymentMethod.REDSYS;
          break;
        case 'STRIPE':
          paymentMethod = BillingPaymentMethod.STRIPE;
          break;
        case 'PAYPAL':
          paymentMethod = BillingPaymentMethod.PAYPAL;
          break;
        case 'COD':
          paymentMethod = BillingPaymentMethod.COD;
          break;
        default:
          paymentMethod = BillingPaymentMethod.OTHER;
      }
    }

    const lineItems = order.items.map((item, i) => {
      const taxRate = 0.21;
      const lineSubtotal = Number(item.unit_price) * item.qty;
      const taxAmountLine = lineSubtotal * taxRate;
      const lineTotal = lineSubtotal + taxAmountLine;
      return {
        description:
          item.title_snapshot || item.sku?.product?.title || item.sku_id,
        qty: item.qty,
        unit_price: item.unit_price,
        tax_rate: taxRate,
        line_subtotal: lineSubtotal,
        tax_amount: taxAmountLine,
        line_total: lineTotal,
        position: i,
      };
    });

    const subtotal = lineItems.reduce((s, i) => s + i.line_subtotal, 0);
    const taxTotal = lineItems.reduce((s, i) => s + i.tax_amount, 0);
    const total = lineItems.reduce((s, i) => s + i.line_total, 0);

    const billingDoc = await this.prisma.billingDocument.create({
      data: {
        type: BillingDocumentType.INVOICE,
        status: BillingDocumentStatus.DRAFT,
        order_id: orderId,
        customer_id: order.customer_id ?? undefined,
        language: BillingLanguage.ES,
        currency: order.currency,
        payment_method: paymentMethod ?? undefined,
        company_legal_name: settings.legal_name,
        company_trade_name: settings.trade_name,
        company_nif: settings.nif,
        company_address: settings.address_real,
        company_iban_1: settings.iban_caixabank,
        company_iban_2: settings.iban_bbva,
        customer_name: customerName,
        customer_tax_id: customerTaxId,
        customer_email: customerEmail,
        customer_address: customerAddress,
        subtotal_amount: subtotal,
        tax_amount: taxTotal,
        discount_amount: Number(order.discount_amount),
        total_amount: total,
        items: { create: lineItems },
      },
      include: { items: true },
    });

    return {
      order_status: OrderStatus.DELIVERED,
      billing_document: billingDoc,
    };
  }
}
