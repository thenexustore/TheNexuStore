import {
  BadRequestException,
  Injectable,
  Logger,
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
import { MailService } from '../../auth/mail/mail.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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
        ...(dto.default_currency !== undefined && {
          default_currency: dto.default_currency,
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
        ...(dto.default_tax_rate !== undefined && {
          default_tax_rate: dto.default_tax_rate,
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

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Returns end-of-day (23:59:59.999 UTC) for a date string, making range
   * filters using `lte` inclusive of the full calendar day.
   */
  private toEndOfDay(d: string): Date {
    const dt = new Date(d);
    dt.setUTCHours(23, 59, 59, 999);
    return dt;
  }

  // ─── Documents ────────────────────────────────────────────────────────────────

  async listDocuments(query: BillingDocumentsQueryDto) {
    const { page, limit, type, status, search, from, to, order_id } = query;
    const skip = (page - 1) * limit;

    const dateRange =
      from || to
        ? {
            gte: from ? new Date(from) : undefined,
            lte: to ? this.toEndOfDay(to) : undefined,
          }
        : null;

    // Build AND conditions separately so that combining dateRange + search
    // does not produce two sibling OR keys that would silently overwrite each
    // other when spread into the same object.
    const andConditions: Prisma.BillingDocumentWhereInput[] = [];

    if (dateRange) {
      // Filter issued docs by issue_date; DRAFT documents have no issue_date
      // yet so fall back to created_at to keep them visible in date searches.
      andConditions.push({
        OR: [
          { issue_date: dateRange },
          { issue_date: null, created_at: dateRange },
        ],
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { document_number: { contains: search, mode: 'insensitive' } },
          { customer_name: { contains: search, mode: 'insensitive' } },
          { customer_email: { contains: search, mode: 'insensitive' } },
          { customer_tax_id: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.BillingDocumentWhereInput = {
      ...(type && { type }),
      ...(status && { status }),
      ...(order_id && { order_id }),
      ...(andConditions.length > 0 && { AND: andConditions }),
    };

    const [items, total] = await Promise.all([
      this.prisma.billingDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
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
    const defaultTaxRate = Number(settings.default_tax_rate);

    const lineItems = (items ?? []).map((item, i) => {
      const taxRate = item.tax_rate ?? defaultTaxRate;
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
        currency: docData.currency ?? settings.default_currency,
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
        customer_name: docData.customer_name,
        customer_email: docData.customer_email,
        customer_tax_id: docData.customer_tax_id,
        customer_address: docData.customer_address,
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
      const settings = await this.getSettings();
      const defaultTaxRate = Number(settings.default_tax_rate);

      // Wrap delete + recreate in a transaction to avoid leaving the document
      // without items if the createMany call fails.
      await this.prisma.$transaction(async (tx) => {
        await tx.billingDocumentItem.deleteMany({
          where: { document_id: id },
        });

        const lineItems = items.map((item, i) => {
          const taxRate = item.tax_rate ?? defaultTaxRate;
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

        await tx.billingDocumentItem.createMany({ data: lineItems });
      });
    }

    return this.prisma.billingDocument.update({
      where: { id },
      data: {
        ...(docData.status !== undefined && { status: docData.status }),
        // When a document is manually advanced to SENT, record the sent timestamp
        // (sendDocument sets it automatically for email sends; this covers manual transitions)
        ...(docData.status === BillingDocumentStatus.SENT && { sent_at: new Date() }),
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
        ...(docData.customer_name !== undefined && {
          customer_name: docData.customer_name,
        }),
        ...(docData.customer_email !== undefined && {
          customer_email: docData.customer_email,
        }),
        ...(docData.customer_tax_id !== undefined && {
          customer_tax_id: docData.customer_tax_id,
        }),
        ...(docData.customer_address !== undefined && {
          customer_address: docData.customer_address,
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
        pdf_url: `/admin/billing/documents/${id}/pdf`,
        ...(dto.payment_method !== undefined && {
          payment_method: dto.payment_method,
        }),
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

    // Prevent converting the same quote twice
    const existingConversion = await this.prisma.billingDocument.findFirst({
      where: {
        source_document_id: quoteId,
        type: BillingDocumentType.INVOICE,
        status: { not: BillingDocumentStatus.VOID },
      },
    });
    if (existingConversion) {
      throw new BadRequestException(
        `This quote has already been converted to invoice ${existingConversion.document_number ?? existingConversion.id}`,
      );
    }

    const { number, seriesId } = await this.assignNextNumber(
      BillingDocumentType.INVOICE,
    );
    const issueDate = dto.issue_date ? new Date(dto.issue_date) : new Date();
    const invoiceId = crypto.randomUUID();

    const invoice = await this.prisma.billingDocument.create({
      data: {
        id: invoiceId,
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
        pdf_url: `/admin/billing/documents/${invoiceId}/pdf`,
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
        config_json: dto.config_json as Prisma.InputJsonValue,
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
        ...(dto.config_json !== undefined && {
          config_json: dto.config_json as Prisma.InputJsonValue,
        }),
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
              ...(query.to && { lte: this.toEndOfDay(query.to) }),
            },
          }
        : {}),
    };

    const docs = await this.prisma.billingDocument.findMany({
      where,
      orderBy: { issue_date: 'asc' },
      include: { items: true },
    });

    // Quote a CSV field to handle embedded commas, quotes and newlines.
    const csvField = (v: string | number | null | undefined): string => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const header = [
      'document_number',
      'type',
      'status',
      'issue_date',
      'customer_name',
      'customer_email',
      'customer_tax_id',
      'subtotal_amount',
      'tax_amount',
      'total_amount',
      'currency',
      'payment_method',
    ].join(',');

    const rows = docs.map((d) =>
      [
        csvField(d.document_number),
        csvField(d.type),
        csvField(d.status),
        csvField(d.issue_date ? d.issue_date.toISOString().split('T')[0] : ''),
        csvField(d.customer_name),
        csvField(d.customer_email),
        csvField(d.customer_tax_id),
        csvField(d.subtotal_amount.toFixed(2)),
        csvField(d.tax_amount.toFixed(2)),
        csvField(d.total_amount.toFixed(2)),
        csvField(d.currency),
        csvField(d.payment_method),
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  // ─── Mark Order Delivered ─────────────────────────────────────────────────────

  async markOrderDelivered(orderId: string, dto: MarkOrderDeliveredDto) {
    this.logger.log(`markOrderDelivered called for orderId=${orderId}`);
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
    if (!order) {
      this.logger.warn(`Order not found: ${orderId}`);
      throw new NotFoundException('Order not found');
    }

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

    const existingDoc = await this.prisma.billingDocument.findFirst({
      where: {
        order_id: orderId,
        type: BillingDocumentType.INVOICE,
        status: { not: BillingDocumentStatus.VOID },
      },
      orderBy: { created_at: 'desc' },
    });
    if (existingDoc) {
      let finalDoc = existingDoc;
      if (existingDoc.status === BillingDocumentStatus.DRAFT) {
        // Issue the draft (assigns number + issue_date)
        finalDoc = await this.issueDocument(existingDoc.id, {}, 'system');
        // Send email (transitions ISSUED → SENT)
        try {
          await this.sendDocument(finalDoc.id);
          finalDoc = await this.prisma.billingDocument.findUnique({
            where: { id: finalDoc.id },
            include: { items: true },
          }) ?? finalDoc;
        } catch (err) {
          this.logger.warn(`Could not send billing document email for order ${orderId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (existingDoc.status === BillingDocumentStatus.ISSUED) {
        // Send email only (transitions ISSUED → SENT)
        try {
          await this.sendDocument(existingDoc.id);
          finalDoc = await this.prisma.billingDocument.findUnique({
            where: { id: existingDoc.id },
            include: { items: true },
          }) ?? existingDoc;
        } catch (err) {
          this.logger.warn(`Could not send billing document email for order ${orderId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      // SENT / PAID / VOID: nothing extra
      return {
        order_status: OrderStatus.DELIVERED,
        billing_document: finalDoc,
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
      const taxRate = Number(settings.default_tax_rate);
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
        total_amount: Math.max(0, total - Number(order.discount_amount)),
        items: { create: lineItems },
      },
      include: { items: true },
    });

    // Issue the newly created draft and send email
    let finalDoc: typeof billingDoc = billingDoc;
    try {
      finalDoc = await this.issueDocument(billingDoc.id, {}, 'system');
    } catch (err) {
      this.logger.warn(`Could not issue billing document for order ${orderId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      await this.sendDocument(finalDoc.id);
      finalDoc = await this.prisma.billingDocument.findUnique({
        where: { id: finalDoc.id },
        include: { items: true },
      }) ?? finalDoc;
    } catch (err) {
      this.logger.warn(`Could not send billing document email for order ${orderId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
      order_status: OrderStatus.DELIVERED,
      billing_document: finalDoc,
    };
  }

  // ─── Billing from order (independent of delivery) ─────────────────────────

  async getDocumentsByOrderId(orderId: string): Promise<{ documents: any[]; order_number: string | null }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, order_number: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const documents = await this.prisma.billingDocument.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' },
    });

    return { documents, order_number: order.order_number ?? null };
  }

  /**
   * Creates a billing document (draft invoice) from an existing order.
   * Idempotent: if a non-VOID invoice already exists for this order, returns
   * the existing one instead of creating a duplicate.
   */
  async createDocumentFromOrder(orderId: string): Promise<any> {
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

    // Idempotency: return existing non-void invoice if present
    const existing = await this.prisma.billingDocument.findFirst({
      where: {
        order_id: orderId,
        type: BillingDocumentType.INVOICE,
        status: { not: BillingDocumentStatus.VOID },
      },
      orderBy: { created_at: 'desc' },
      include: { items: true },
    });
    if (existing) return { billing_document: existing, created: false };

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

    const taxRate = Number(settings.default_tax_rate);
    const lineItems = order.items.map((item, i) => {
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
        total_amount: Math.max(0, total - Number(order.discount_amount)),
        items: { create: lineItems },
      },
      include: { items: true },
    });

    return { billing_document: billingDoc, created: true };
  }

  // ─── PDF Generation ───────────────────────────────────────────────────────

  async generateDocumentPdf(id: string): Promise<{ buffer: Buffer; docRef: string }> {
    const doc = await this.prisma.billingDocument.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!doc) throw new NotFoundException('Billing document not found');

    const docRef =
      doc.document_number ??
      doc.id.substring(0, 8).toUpperCase();

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const pdf = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      const typeLabel =
        doc.type === BillingDocumentType.INVOICE
          ? 'FACTURA'
          : doc.type === BillingDocumentType.QUOTE
            ? 'PRESUPUESTO'
            : 'NOTA DE CRÉDITO';

      // Header
      pdf.fontSize(20).font('Helvetica-Bold').text(typeLabel, { align: 'right' });
      pdf.fontSize(12).font('Helvetica').text(`Nº: ${docRef}`, { align: 'right' });
      if (doc.issue_date) {
        pdf.text(
          `Fecha: ${new Date(doc.issue_date).toLocaleDateString('es-ES')}`,
          { align: 'right' },
        );
      }
      pdf.moveDown();

      // Company info
      if (doc.company_legal_name) {
        pdf.font('Helvetica-Bold').text(doc.company_legal_name);
        pdf.font('Helvetica');
        if (doc.company_nif) pdf.text(`NIF: ${doc.company_nif}`);
        if (doc.company_address) pdf.text(doc.company_address);
        if (doc.company_iban_1) pdf.text(`IBAN: ${doc.company_iban_1}`);
      }
      pdf.moveDown();

      // Customer info
      pdf.font('Helvetica-Bold').text('DATOS DEL CLIENTE');
      pdf.font('Helvetica');
      if (doc.customer_name) pdf.text(doc.customer_name);
      if (doc.customer_tax_id) pdf.text(`NIF/CIF: ${doc.customer_tax_id}`);
      if (doc.customer_email) pdf.text(doc.customer_email);
      if (doc.customer_address) pdf.text(doc.customer_address);
      pdf.moveDown();

      // Table header
      const colDesc = 50;
      const colQty = 330;
      const colPrice = 380;
      const colTax = 430;
      const colTotal = 490;
      pdf.font('Helvetica-Bold');
      pdf.text('Descripción', colDesc, pdf.y, { continued: false });
      const tableY = pdf.y;
      pdf.text('Cant.', colQty, tableY, { width: 50 });
      pdf.text('P.Unit', colPrice, tableY, { width: 50 });
      pdf.text('IVA%', colTax, tableY, { width: 50 });
      pdf.text('Total', colTotal, tableY, { width: 60 });
      pdf.moveDown(0.5);
      pdf.moveTo(50, pdf.y).lineTo(560, pdf.y).stroke();
      pdf.moveDown(0.3);

      // Items
      pdf.font('Helvetica');
      for (const item of doc.items) {
        const rowY = pdf.y;
        pdf.text(item.description ?? '', colDesc, rowY, { width: 270 });
        pdf.text(String(item.qty), colQty, rowY, { width: 50 });
        pdf.text(
          Number(item.unit_price).toFixed(2),
          colPrice,
          rowY,
          { width: 50 },
        );
        pdf.text(
          `${Number(item.tax_rate).toFixed(0)}%`,
          colTax,
          rowY,
          { width: 50 },
        );
        pdf.text(
          Number(item.line_total).toFixed(2),
          colTotal,
          rowY,
          { width: 60 },
        );
        pdf.moveDown();
      }

      pdf.moveTo(50, pdf.y).lineTo(560, pdf.y).stroke();
      pdf.moveDown(0.5);

      // Totals
      const totalsX = 380;
      pdf.font('Helvetica');
      pdf.text(
        `Base imponible: ${Number(doc.subtotal_amount).toFixed(2)} ${doc.currency ?? 'EUR'}`,
        totalsX,
      );
      pdf.text(
        `IVA: ${Number(doc.tax_amount).toFixed(2)} ${doc.currency ?? 'EUR'}`,
        totalsX,
      );
      if (Number(doc.discount_amount) > 0) {
        pdf.text(
          `Descuento: -${Number(doc.discount_amount).toFixed(2)} ${doc.currency ?? 'EUR'}`,
          totalsX,
        );
      }
      pdf.font('Helvetica-Bold').text(
        `TOTAL: ${Number(doc.total_amount).toFixed(2)} ${doc.currency ?? 'EUR'}`,
        totalsX,
      );

      if (doc.notes) {
        pdf.moveDown();
        pdf.font('Helvetica').fontSize(10).text(`Notas: ${doc.notes}`);
      }

      pdf.end();
    });

    return { buffer, docRef };
  }

  async sendDocument(id: string): Promise<{ sent: boolean; email: string }> {
    const doc = await this.prisma.billingDocument.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!doc) throw new NotFoundException('Billing document not found');
    if (
      doc.status === BillingDocumentStatus.DRAFT ||
      doc.status === BillingDocumentStatus.VOID
    ) {
      throw new BadRequestException(
        `Cannot send a document in ${doc.status} status — it must be ISSUED or SENT`,
      );
    }
    if (!doc.customer_email) {
      throw new BadRequestException(
        'Document has no customer email address to send to',
      );
    }

    const { buffer: pdfBuffer, docRef } = await this.generateDocumentPdf(id);

    const typeLabel =
      doc.type === BillingDocumentType.INVOICE
        ? 'Factura'
        : doc.type === BillingDocumentType.QUOTE
          ? 'Presupuesto'
          : 'Nota de crédito';
    const companyName = doc.company_legal_name ?? doc.company_trade_name ?? 'NEXUS';
    const subject = `${typeLabel} ${docRef} de ${companyName}`;

    await this.mailService.sendBillingDocument(
      doc.customer_email,
      subject,
      companyName,
      typeLabel,
      docRef,
      pdfBuffer,
    );

    await this.prisma.billingDocument.update({
      where: { id },
      data: {
        sent_at: new Date(),
        // Automatically advance ISSUED → SENT when the document is emailed to the customer
        ...(doc.status === BillingDocumentStatus.ISSUED && {
          status: BillingDocumentStatus.SENT,
        }),
      },
    });

    this.logger.log(`Billing document ${docRef} sent to ${doc.customer_email}`);
    return { sent: true, email: doc.customer_email };
  }

  // ─── Backfill ─────────────────────────────────────────────────────────────

  /**
   * Creates draft billing documents for all confirmed paid orders that do not
   * yet have an existing billing document. Safe to call multiple times
   * (idempotent per order via createDocumentFromOrder).
   */
  async backfillPaidOrders(): Promise<{
    processed: number;
    created: number;
    skipped: number;
    errors: string[];
  }> {
    this.logger.log('backfillPaidOrders: starting');

    // All orders in a confirmed-payment state
    const confirmedOrders = await this.prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.PAID,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ],
        },
      },
      select: { id: true, order_number: true },
    });

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const order of confirmedOrders) {
      try {
        const result = await this.createDocumentFromOrder(order.id);
        if (result.created) {
          created++;
          this.logger.log(`backfillPaidOrders: created draft for order ${order.order_number}`);
        } else {
          skipped++;
        }
      } catch (err) {
        const msg = `Order ${order.order_number ?? order.id}: ${err instanceof Error ? err.message : String(err)}`;
        this.logger.warn(`backfillPaidOrders error — ${msg}`);
        errors.push(msg);
      }
    }

    this.logger.log(
      `backfillPaidOrders: done — processed=${confirmedOrders.length} created=${created} skipped=${skipped} errors=${errors.length}`,
    );
    return { processed: confirmedOrders.length, created, skipped, errors };
  }
}
