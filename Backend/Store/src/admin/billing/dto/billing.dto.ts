import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BillingDocumentType,
  BillingDocumentStatus,
  BillingLanguage,
  BillingPaymentMethod,
} from '@prisma/client';

export class BillingDocumentItemDto {
  @IsString()
  @IsNotEmpty()
  description: string = '';

  @IsNumber()
  @Min(0)
  qty: number = 1;

  @IsNumber()
  @Min(0)
  unit_price: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax_rate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateBillingDocumentDto {
  @IsEnum(BillingDocumentType)
  type: BillingDocumentType = BillingDocumentType.INVOICE;

  @IsOptional()
  @IsEnum(BillingDocumentStatus)
  status?: BillingDocumentStatus;

  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsEnum(BillingLanguage)
  language?: BillingLanguage;

  @IsOptional()
  @IsEnum(BillingPaymentMethod)
  payment_method?: BillingPaymentMethod;

  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internal_notes?: string;

  @IsOptional()
  @IsString()
  template_id?: string;

  @IsOptional()
  @IsString()
  source_document_id?: string;

  // Customer overrides for manual documents (when no customer_id is provided)
  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  customer_email?: string;

  @IsOptional()
  @IsString()
  customer_tax_id?: string;

  @IsOptional()
  @IsString()
  customer_address?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillingDocumentItemDto)
  items?: BillingDocumentItemDto[];
}

export class UpdateBillingDocumentDto {
  @IsOptional()
  @IsEnum(BillingDocumentStatus)
  status?: BillingDocumentStatus;

  @IsOptional()
  @IsEnum(BillingLanguage)
  language?: BillingLanguage;

  @IsOptional()
  @IsEnum(BillingPaymentMethod)
  payment_method?: BillingPaymentMethod;

  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internal_notes?: string;

  @IsOptional()
  @IsString()
  template_id?: string;

  // Customer info overrides (editable on DRAFT documents)
  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  customer_email?: string;

  @IsOptional()
  @IsString()
  customer_tax_id?: string;

  @IsOptional()
  @IsString()
  customer_address?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillingDocumentItemDto)
  items?: BillingDocumentItemDto[];
}

export class BillingDocumentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsEnum(BillingDocumentType)
  type?: BillingDocumentType;

  @IsOptional()
  @IsEnum(BillingDocumentStatus)
  status?: BillingDocumentStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class IssueBillingDocumentDto {
  @IsOptional()
  @IsEnum(BillingPaymentMethod)
  payment_method?: BillingPaymentMethod;

  @IsOptional()
  @IsDateString()
  issue_date?: string;
}

export class ConvertQuoteToInvoiceDto {
  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsEnum(BillingPaymentMethod)
  payment_method?: BillingPaymentMethod;
}

export class UpdateDocumentNumberDto {
  @IsString()
  @IsNotEmpty()
  new_number: string = '';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateBillingTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string = '';

  @IsOptional()
  @IsString()
  background_url?: string;

  @IsObject()
  @IsOptional()
  config_json: Record<string, unknown> = {};

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class UpdateBillingTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  background_url?: string;

  @IsOptional()
  config_json?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class UpdateBillingSettingsDto {
  @IsOptional()
  @IsString()
  legal_name?: string;

  @IsOptional()
  @IsString()
  trade_name?: string;

  @IsOptional()
  @IsString()
  nif?: string;

  @IsOptional()
  @IsString()
  address_real?: string;

  @IsOptional()
  @IsString()
  address_virtual?: string;

  @IsOptional()
  @IsString()
  iban_caixabank?: string;

  @IsOptional()
  @IsString()
  iban_bbva?: string;

  @IsOptional()
  @IsString()
  website_com?: string;

  @IsOptional()
  @IsString()
  website_es?: string;

  @IsOptional()
  @IsEnum(BillingLanguage)
  default_language?: BillingLanguage;

  @IsOptional()
  @IsString()
  default_currency?: string;

  @IsOptional()
  @IsString()
  invoice_prefix?: string;

  @IsOptional()
  @IsString()
  quote_prefix?: string;

  @IsOptional()
  @IsString()
  credit_note_prefix?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  default_tax_rate?: number;
}

export class ExportBillingDocumentsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(BillingDocumentType)
  type?: BillingDocumentType;

  @IsOptional()
  @IsEnum(BillingDocumentStatus)
  status?: BillingDocumentStatus;
}

export class MarkOrderDeliveredDto {
  @IsOptional()
  @IsString()
  tracking_url?: string;
}
