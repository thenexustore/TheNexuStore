import { BadRequestException } from '@nestjs/common';
import { CronJob } from 'cron';

export type ImportRuntimeSettings = {
  stock_sync_cron: string;
  incremental_sync_cron: string;
  full_sync_cron: string;
  stock_batch_size: number;
  full_sync_batch_size: number;
  catalog_page_size: number | null;
};

export type PartialImportRuntimeSettings = Partial<ImportRuntimeSettings> | null | undefined;

export const DEFAULT_IMPORT_RUNTIME_SETTINGS: ImportRuntimeSettings = {
  stock_sync_cron: '*/5 * * * *',
  incremental_sync_cron: '0 * * * *',
  full_sync_cron: '0 2 * * *',
  stock_batch_size: 100,
  full_sync_batch_size: 500,
  catalog_page_size: null,
};

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
    stock_sync_cron:
      parseCronExpression(source.stock_sync_cron, 'stock_sync_cron') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.stock_sync_cron,
    incremental_sync_cron:
      parseCronExpression(source.incremental_sync_cron, 'incremental_sync_cron') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.incremental_sync_cron,
    full_sync_cron:
      parseCronExpression(source.full_sync_cron, 'full_sync_cron') ??
      DEFAULT_IMPORT_RUNTIME_SETTINGS.full_sync_cron,
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
    catalog_page_size:
      parsePositiveInteger(source.catalog_page_size, 'catalog_page_size', {
        min: 1,
        max: 10000,
        nullable: true,
      }) ?? DEFAULT_IMPORT_RUNTIME_SETTINGS.catalog_page_size,
  };
}
