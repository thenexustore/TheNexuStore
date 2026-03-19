import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { InfortisaService } from '../../infortisa/infortisa.service';
import {
  normalizeImportRuntimeSettings,
  type PartialImportRuntimeSettings,
} from '../../infortisa/import-runtime-settings';
import { InfortisaSyncService } from '../../infortisa/infortisa.sync';
import { UpdateImportIntegrationConfigDto } from './dto/imports-config.dto';

const INTEGRATION_PROVIDER = 'INFORTISA';
const INTEGRATION_FALLBACK_NAME = 'Infortisa';
const INTEGRATION_FALLBACK_BASE_URL = 'https://apiv2.infortisa.com';

@Injectable()
export class ImportsConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly infortisaService: InfortisaService,
    private readonly infortisaSyncService: InfortisaSyncService,
  ) {}

  private getEncryptionSecret() {
    return (
      this.configService.get<string>('INTEGRATION_SECRET_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'dev_secret'
    );
  }

  private encryptApiKey(apiKey: string) {
    const iv = randomBytes(12);
    const key = createHash('sha256')
      .update(this.getEncryptionSecret())
      .digest();
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(apiKey, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private decryptApiKey(payload: string | null | undefined) {
    if (!payload) {
      return null;
    }

    const raw = Buffer.from(payload, 'base64');
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const key = createHash('sha256')
      .update(this.getEncryptionSecret())
      .digest();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  private maskApiKey(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const last4 = value.slice(-4);
    return `${'*'.repeat(Math.max(8, value.length - 4))}${last4}`;
  }

  private normalizeBaseUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException('base_url is required');
    }

    try {
      return new URL(trimmed).toString().replace(/\/$/, '');
    } catch {
      throw new BadRequestException('base_url must be a valid URL');
    }
  }

  private readRuntimeSettings(raw: unknown) {
    return normalizeImportRuntimeSettings(
      raw && typeof raw === 'object'
        ? (raw as PartialImportRuntimeSettings)
        : undefined,
    );
  }

  async getIntegrationRecord() {
    return this.prisma.supplierIntegration.findUnique({
      where: { provider: INTEGRATION_PROVIDER },
    });
  }

  async getConfig(options?: {
    includeSecret?: boolean;
    enforceSecretRead?: boolean;
  }) {
    const record = await this.getIntegrationRecord();
    const fallbackToken =
      this.configService.get<string>('INFORTISA_API_TOKEN') || null;
    const decryptedToken = record?.api_key_encrypted
      ? this.decryptApiKey(record.api_key_encrypted)
      : fallbackToken;

    if (options?.enforceSecretRead && !options.includeSecret) {
      throw new ForbiddenException(
        'Explicit secret read permission is required',
      );
    }

    return {
      provider: INTEGRATION_PROVIDER,
      display_name: record?.display_name || INTEGRATION_FALLBACK_NAME,
      base_url: record?.base_url || INTEGRATION_FALLBACK_BASE_URL,
      is_active: record?.is_active ?? true,
      notes: record?.notes || null,
      last_healthcheck_at: record?.last_healthcheck_at?.toISOString() || null,
      api_key_last4:
        record?.api_key_last4 ||
        (decryptedToken ? decryptedToken.slice(-4) : null),
      api_key_masked: this.maskApiKey(decryptedToken),
      api_key: options?.includeSecret ? decryptedToken : undefined,
      source: record
        ? 'database'
        : decryptedToken
          ? 'env_fallback'
          : 'default_fallback',
      settings: this.readRuntimeSettings(record?.settings_json),
    };
  }

  async updateConfig(input: UpdateImportIntegrationConfigDto) {
    const record = await this.getIntegrationRecord();
    const apiKey = input.api_key?.trim();
    const encryptedApiKey = apiKey ? this.encryptApiKey(apiKey) : undefined;
    const apiKeyLast4 = apiKey ? apiKey.slice(-4) : undefined;
    const settings = normalizeImportRuntimeSettings({
      ...this.readRuntimeSettings(record?.settings_json),
      stock_sync_cron: input.stock_sync_cron,
      incremental_sync_cron: input.incremental_sync_cron,
      full_sync_cron: input.full_sync_cron,
      stock_batch_size: input.stock_batch_size,
      full_sync_batch_size: input.full_sync_batch_size,
      catalog_page_size:
        input.catalog_page_size === undefined
          ? undefined
          : input.catalog_page_size,
    });

    await this.prisma.supplierIntegration.upsert({
      where: { provider: INTEGRATION_PROVIDER },
      update: {
        display_name: input.display_name.trim(),
        base_url: this.normalizeBaseUrl(input.base_url),
        settings_json: settings,
        ...(typeof input.is_active === 'boolean'
          ? { is_active: input.is_active }
          : {}),
        ...(input.notes !== undefined
          ? { notes: input.notes?.trim() || null }
          : {}),
        ...(encryptedApiKey
          ? { api_key_encrypted: encryptedApiKey, api_key_last4: apiKeyLast4 }
          : {}),
      },
      create: {
        provider: INTEGRATION_PROVIDER,
        display_name: input.display_name.trim(),
        base_url: this.normalizeBaseUrl(input.base_url),
        is_active: input.is_active ?? true,
        notes: input.notes?.trim() || null,
        api_key_encrypted: encryptedApiKey || null,
        api_key_last4: apiKeyLast4 || null,
        settings_json: settings,
      },
    });

    await this.infortisaService.reloadConfiguration();
    await this.infortisaSyncService.reloadRuntimeSettings();

    return this.getConfig();
  }

  async testConnection() {
    const healthy = await this.infortisaService.checkServiceHealth();
    const checkedAt = new Date();

    await this.prisma.supplierIntegration.upsert({
      where: { provider: INTEGRATION_PROVIDER },
      update: { last_healthcheck_at: checkedAt },
      create: {
        provider: INTEGRATION_PROVIDER,
        display_name: INTEGRATION_FALLBACK_NAME,
        base_url: INTEGRATION_FALLBACK_BASE_URL,
        is_active: true,
        settings_json: normalizeImportRuntimeSettings(),
        last_healthcheck_at: checkedAt,
      },
    });

    return {
      ok: healthy,
      checked_at: checkedAt.toISOString(),
    };
  }
}
