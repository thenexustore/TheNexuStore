import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { IsString, MaxLength } from 'class-validator';
import { AdminGuard } from '../admin.guard';
import { AuditLogService } from '../audit-log.service';
import { BillingService } from './billing.service';
import { saveBase64Image } from '../../common/image.util';
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

class UploadBillingBgDto {
  @IsString()
  @MaxLength(10_000_000)
  image_base64!: string;
}

@Controller('admin/billing')
@UseGuards(AdminGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Settings ─────────────────────────────────────────────────────────────

  @Get('settings')
  async getSettings() {
    const data = await this.billingService.getSettings();
    return { success: true, data };
  }

  @Put('settings')
  async updateSettings(
    @Body() dto: UpdateBillingSettingsDto,
    @Req() req: Request,
  ) {
    const data = await this.billingService.updateSettings(dto);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'BILLING_SETTINGS_UPDATED',
      resource: 'BILLING_SETTINGS',
      resourceId: data.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
    });
    return { success: true, data, message: 'Settings updated successfully' };
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  @Get('documents')
  async listDocuments(@Query() query: BillingDocumentsQueryDto) {
    const data = await this.billingService.listDocuments(query);
    return { success: true, data };
  }

  @Get('documents/:id')
  async getDocumentById(@Param('id') id: string) {
    const data = await this.billingService.getDocumentById(id);
    return { success: true, data };
  }

  @Post('documents')
  async createDocument(
    @Body() dto: CreateBillingDocumentDto,
    @Req() req: Request,
  ) {
    const data = await this.billingService.createDocument(dto);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'BILLING_DOCUMENT_CREATED',
      resource: 'BILLING_DOCUMENT',
      resourceId: data.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: { type: data.type },
    });
    return { success: true, data, message: 'Document created successfully' };
  }

  @Patch('documents/:id')
  async updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateBillingDocumentDto,
    @Req() req: Request,
  ) {
    const data = await this.billingService.updateDocument(id, dto);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'BILLING_DOCUMENT_UPDATED',
      resource: 'BILLING_DOCUMENT',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
    });
    return { success: true, data, message: 'Document updated successfully' };
  }

  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string, @Req() req: Request) {
    const data = await this.billingService.deleteDocument(id);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'BILLING_DOCUMENT_DELETED',
      resource: 'BILLING_DOCUMENT',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
    });
    return { success: true, data };
  }

  @Post('documents/:id/issue')
  async issueDocument(
    @Param('id') id: string,
    @Body() dto: IssueBillingDocumentDto,
    @Req() req: Request,
  ) {
    const actor = req.user as any;
    const data = await this.billingService.issueDocument(id, dto, actor?.email);
    await this.auditLogService.logAction({
      actor,
      action: 'BILLING_DOCUMENT_ISSUED',
      resource: 'BILLING_DOCUMENT',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: { document_number: data.document_number },
    });
    return { success: true, data, message: 'Document issued successfully' };
  }

  @Post('documents/:id/convert-to-invoice')
  async convertQuoteToInvoice(
    @Param('id') id: string,
    @Body() dto: ConvertQuoteToInvoiceDto,
    @Req() req: Request,
  ) {
    const actor = req.user as any;
    const data = await this.billingService.convertQuoteToInvoice(
      id,
      dto,
      actor?.email,
    );
    await this.auditLogService.logAction({
      actor,
      action: 'BILLING_QUOTE_CONVERTED',
      resource: 'BILLING_DOCUMENT',
      resourceId: data.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: { quote_id: id, invoice_number: data.document_number },
    });
    return {
      success: true,
      data,
      message: 'Quote converted to invoice successfully',
    };
  }

  @Put('documents/:id/number')
  async updateDocumentNumber(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentNumberDto,
    @Req() req: Request,
  ) {
    const actor = req.user as any;
    const data = await this.billingService.updateDocumentNumber(
      id,
      dto,
      actor?.sub ?? actor?.id ?? 'unknown',
      actor?.email,
    );
    await this.auditLogService.logAction({
      actor,
      action: 'BILLING_NUMBER_UPDATED',
      resource: 'BILLING_DOCUMENT',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: { new_number: dto.new_number, reason: dto.reason },
    });
    return { success: true, data, message: 'Document number updated' };
  }

  // ─── Templates ────────────────────────────────────────────────────────────

  @Get('templates')
  async listTemplates() {
    const data = await this.billingService.listTemplates();
    return { success: true, data };
  }

  @Post('templates')
  async createTemplate(
    @Body() dto: CreateBillingTemplateDto,
    @Req() req: Request,
  ) {
    const data = await this.billingService.createTemplate(dto);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'BILLING_TEMPLATE_CREATED',
      resource: 'BILLING_TEMPLATE',
      resourceId: data.id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
    });
    return { success: true, data, message: 'Template created successfully' };
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateBillingTemplateDto,
    @Req() req: Request,
  ) {
    const data = await this.billingService.updateTemplate(id, dto);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'BILLING_TEMPLATE_UPDATED',
      resource: 'BILLING_TEMPLATE',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
    });
    return { success: true, data, message: 'Template updated successfully' };
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string, @Req() req: Request) {
    const data = await this.billingService.deleteTemplate(id);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'BILLING_TEMPLATE_DELETED',
      resource: 'BILLING_TEMPLATE',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
    });
    return { success: true, data };
  }

  @Post('templates/upload-background')
  async uploadTemplateBackground(@Body() dto: UploadBillingBgDto) {
    if (!dto.image_base64?.startsWith('data:image/')) {
      throw new BadRequestException('Se requiere una imagen en formato base64 válido');
    }
    let url: string;
    try {
      url = await saveBase64Image(dto.image_base64, 'billing');
    } catch (err: unknown) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Error al guardar la imagen',
      );
    }
    return { success: true, data: { url } };
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  @Get('export')
  async exportDocuments(
    @Query() query: ExportBillingDocumentsDto,
    @Res() res: Response,
  ) {
    const csv = await this.billingService.exportDocuments(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="billing-export-${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  // ─── Order mark delivered ─────────────────────────────────────────────────

  @Post('orders/:orderId/deliver')
  async markOrderDelivered(
    @Param('orderId') orderId: string,
    @Body() dto: MarkOrderDeliveredDto,
    @Req() req: Request,
  ) {
    const actor = req.user as any;
    const data = await this.billingService.markOrderDelivered(orderId, dto);
    await this.auditLogService.logAction({
      actor,
      action: 'ORDER_MARKED_DELIVERED',
      resource: 'ORDER',
      resourceId: orderId,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: {
        billing_document_id: data.billing_document?.id,
        tracking_url: dto.tracking_url,
      },
    });
    return {
      success: true,
      data,
      message: 'Order marked as delivered and invoice issued/sent',
    };
  }

  // ─── Order billing documents ──────────────────────────────────────────────

  @Get('orders/:orderId/documents')
  async getDocumentsByOrderId(@Param('orderId') orderId: string) {
    const data = await this.billingService.getDocumentsByOrderId(orderId);
    return { success: true, data };
  }

  @Post('orders/:orderId/create-document')
  async createDocumentFromOrder(
    @Param('orderId') orderId: string,
    @Req() req: Request,
  ) {
    const actor = req.user as any;
    const result = await this.billingService.createDocumentFromOrder(orderId);
    if (result.created) {
      await this.auditLogService.logAction({
        actor,
        action: 'BILLING_DOCUMENT_CREATED',
        resource: 'BILLING_DOCUMENT',
        resourceId: result.billing_document.id,
        method: req.method,
        path: req.originalUrl,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
        requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
        metadata: { order_id: orderId, type: 'INVOICE', source: 'from_order' },
      });
    }
    return {
      success: true,
      data: result,
      message: result.created
        ? 'Factura en borrador creada desde pedido'
        : 'Ya existe una factura para este pedido',
    };
  }

  // ─── PDF & Send ───────────────────────────────────────────────────────────

  @Get('documents/:id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.billingService.generateDocumentPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="document-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Post('documents/:id/send')
  async sendDocument(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const data = await this.billingService.sendDocument(id);
    await this.auditLogService.logAction({
      actor: req.user as any,
      action: 'BILLING_DOCUMENT_SENT',
      resource: 'BILLING_DOCUMENT',
      resourceId: id,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      requestId: (req.requestId ?? req.get('x-request-id')) || undefined,
      metadata: { email: data.email },
    });
    return { success: true, data, message: `Documento enviado a ${data.email}` };
  }
}
