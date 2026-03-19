import { BadRequestException } from '@nestjs/common';
import { CronJob } from 'cron';

export const INFORTISA_PROVIDER = 'INFORTISA';
export const INFORTISA_DEFAULT_BASE_URL = 'https://apiv2.infortisa.com';

export type ImportRuntimeSettings = {
  stock_sync_enabled: boolean;
  incremental_sync_enabled: boolean;
  full_sync_enabled: boolean;
  images_sync_enabled: boolean;
  stock_sync_cron: string;
  incremental_sync_cron: string;
  full_sync_cron: string;
  images_sync_cron: string;
  stock_batch_size: number;
  full_sync_batch_size: number;
  full_sync_batch_delay_ms: number;
  image_sync_take: number;
  catalog_page_size: number | null;
};

export type PartialImportRuntimeSettings = Partial<ImportRuntimeSettings> | null | undefined;

export const DEFAULT_IMPORT_RUNTIME_SETTINGS: ImportRuntimeSettings = {
  stock_sync_enabled: true,
  incremental_sync_enabled: true,
  full_sync_enabled: true,
  images_sync_enabled: false,
  stock_sync_cron: '*/5 * * * *',
  incremental_sync_cron: '0 * * * *',
  full_sync_cron: '0 2 * * *',
  images_sync_cron: '30 2 * * *',
  stock_batch_size: 100,
  full_sync_batch_size: 500,
  full_sync_batch_delay_ms: 1000,
  image_sync_take: 50,
  catalog_page_size: null,
};


function parseBoolean(value: unknown, field: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  throw new BadRequestException(`${field} must be a boolean`);
}

function parsePositiveInteger(
  value: unknown,
  field: string,
  options?: { min?: number; max?: number; nullable?: boolean },
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null && options?.nullable) {
    return null;
  }

  const parsed = typeof value === 'string' && value.trim() !== ''
    ? Number(value)
    : value;

  if (!Number.isInteger(parsed)) {
    throw new BadRequestException(`${field} must be an integer`);
  }

  if (options?.min !== undefined && (parsed as number) < options.min) {
    throw new BadRequestException(`${field} must be >= ${options.min}`);
  }

  if (options?.max !== undefined && (parsed as number) > options.max) {
    throw new BadRequestException(`${field} must be <= ${options.max}`);
  }

  return parsed as number;
}

function parseCronExpression(value: unknown, field: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${field} is required`);
  }

  const normalized = value.trim();

  try {
    new CronJob(normalized, () => undefined, null, false, 'UTC');
  } catch {
    throw new BadRequestException(`${field} must be a valid cron expression`);
  }

  return normalized;
}

export function normalizeImportRuntimeSettings(
  input?: PartialImportRuntimeSettings,
): ImportRuntimeSettings {
  const source = input ?? {};

  return {
    stock_sync_enabled:
      parseBoolean(source.stock_sync_enabled, 'stock_sync_enabled') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.stock_sync_enabled,
    incremental_sync_enabled:
      parseBoolean(source.incremental_sync_enabled, 'incremental_sync_enabled') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.incremental_sync_enabled,
    full_sync_enabled:
      parseBoolean(source.full_sync_enabled, 'full_sync_enabled') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.full_sync_enabled,
    images_sync_enabled:
      parseBoolean(source.images_sync_enabled, 'images_sync_enabled') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.images_sync_enabled,
    stock_sync_cron:
      parseCronExpression(source.stock_sync_cron, 'stock_sync_cron') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.stock_sync_cron,
    incremental_sync_cron:
      parseCronExpression(source.incremental_sync_cron, 'incremental_sync_cron') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.incremental_sync_cron,
    full_sync_cron:
      parseCronExpression(source.full_sync_cron, 'full_sync_cron') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.full_sync_cron,
    images_sync_cron:
      parseCronExpression(source.images_sync_cron, 'images_sync_cron') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.images_sync_cron,
    stock_batch_size:
      parsePositiveInteger(source.stock_batch_size, 'stock_batch_size', {
        min: 1,
        max: 5000,
      }) ?? DEFAULT_IMPORT_RUNTIME_SETTINGS.stock_batch_size,
    full_sync_batch_size:
      parsePositiveInteger(source.full_sync_batch_size, 'full_sync_batch_size', {
        min: 1,
        max: 10000,
      }) ?? DEFAULT_IMPORT_RUNTIME_SETTINGS.full_sync_batch_size,
    full_sync_batch_delay_ms:
      parsePositiveInteger(
        source.full_sync_batch_delay_ms,
        'full_sync_batch_delay_ms',
        { min: 0, max: 60000 },
      ) ?? DEFAULT_IMPORT_RUNTIME_SETTINGS.full_sync_batch_delay_ms,
    image_sync_take:
      parsePositiveInteger(source.image_sync_take, 'image_sync_take', {
        min: 1,
        max: 5000,
      }) ?? DEFAULT_IMPORT_RUNTIME_SETTINGS.image_sync_take,
    catalog_page_size:
      parsePositiveInteger(source.catalog_page_size, 'catalog_page_size', {
        min: 1,
        max: 10000,
        nullable: true,
      }) ?? DEFAULT_IMPORT_RUNTIME_SETTINGS.catalog_page_size,
  };
}
