import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export type BrandingSettingsPayload = {
  brandLogoUrl?: string;
  brandLogoDarkUrl?: string;
  brandLogoFit?: 'contain' | 'cover';
  brandLogoHeight?: number;
  brandLogoVersion?: number;
  brandLogoBrightness?: number;
  brandLogoSaturation?: number;
};

const DEFAULT_BRANDING: Required<BrandingSettingsPayload> = {
  brandLogoUrl: '',
  brandLogoDarkUrl: '',
  brandLogoFit: 'contain',
  brandLogoHeight: 32,
  brandLogoVersion: 1,
  brandLogoBrightness: 100,
  brandLogoSaturation: 100,
};

@Injectable()
export class BrandingService {
  private readonly storageDir: string;
  private readonly settingsPath: string;
  private readonly assetsDir: string;

  constructor() {
    const envPath = process.env.BRANDING_STORAGE_DIR?.trim();
    if (envPath) {
      if (!envPath.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(envPath)) {
        throw new Error(
          `BRANDING_STORAGE_DIR must be an absolute path, got: ${envPath}`,
        );
      }
      this.storageDir = envPath;
    } else {
      this.storageDir = join(process.cwd(), 'storage', 'branding');
    }
    this.settingsPath = join(this.storageDir, 'settings.json');
    this.assetsDir = join(this.storageDir, 'assets');
  }

  private normalize(
    input: BrandingSettingsPayload,
  ): Required<BrandingSettingsPayload> {
    return {
      brandLogoUrl:
        typeof input.brandLogoUrl === 'string' ? input.brandLogoUrl.trim() : '',
      brandLogoDarkUrl:
        typeof input.brandLogoDarkUrl === 'string'
          ? input.brandLogoDarkUrl.trim()
          : '',
      brandLogoFit: input.brandLogoFit === 'cover' ? 'cover' : 'contain',
      brandLogoHeight: Math.max(
        20,
        Math.min(64, Number(input.brandLogoHeight) || 32),
      ),
      brandLogoVersion: Math.max(
        1,
        Math.min(999999, Number(input.brandLogoVersion) || 1),
      ),
      brandLogoBrightness: Math.max(
        60,
        Math.min(140, Number(input.brandLogoBrightness) || 100),
      ),
      brandLogoSaturation: Math.max(
        60,
        Math.min(140, Number(input.brandLogoSaturation) || 100),
      ),
    };
  }

  async getSettings(): Promise<Required<BrandingSettingsPayload>> {
    try {
      const raw = await fs.readFile(this.settingsPath, 'utf8');
      const parsed = JSON.parse(raw) as BrandingSettingsPayload;
      const normalized = this.normalize({ ...DEFAULT_BRANDING, ...parsed });
      normalized.brandLogoUrl = await this.validateBrandingAssetUrl(
        normalized.brandLogoUrl,
      );
      normalized.brandLogoDarkUrl = await this.validateBrandingAssetUrl(
        normalized.brandLogoDarkUrl,
      );
      return normalized;
    } catch {
      return DEFAULT_BRANDING;
    }
  }

  async saveSettings(
    input: BrandingSettingsPayload,
  ): Promise<Required<BrandingSettingsPayload>> {
    await fs.mkdir(this.storageDir, { recursive: true });
    const next = this.normalize(input);
    await fs.writeFile(
      this.settingsPath,
      JSON.stringify(next, null, 2),
      'utf8',
    );
    return next;
  }

  async saveLogoDataUrl(
    variant: 'light' | 'dark',
    dataUrl: string,
    apiBaseUrl: string,
  ): Promise<string> {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URL image payload');
    }

    const mimeType = match[1].toLowerCase();
    const base64Payload = match[2];
    const extension = this.mimeToExtension(mimeType);

    if (!extension) {
      throw new Error(`Unsupported image mime type: ${mimeType}`);
    }

    const buffer = Buffer.from(base64Payload, 'base64');
    await fs.mkdir(this.assetsDir, { recursive: true });

    const fileName = `logo-${variant}.${extension}`;
    const filePath = join(this.assetsDir, fileName);
    await fs.writeFile(filePath, buffer);

    const base = apiBaseUrl.replace(/\/$/, '');
    return `${base}/branding-assets/${fileName}`;
  }

  private mimeToExtension(mimeType: string): string | null {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
    if (mimeType === 'image/webp') return 'webp';
    if (mimeType === 'image/svg+xml') return 'svg';
    return null;
  }

  private async validateBrandingAssetUrl(url: string): Promise<string> {
    if (!url) return '';
    // Matches branding-assets uploaded via saveLogoDataUrl (e.g. /branding-assets/logo-light.png)
    const match = url.match(
      /\/branding-assets\/(logo-(?:light|dark)\.[a-zA-Z0-9]+)(?:\?.*)?$/,
    );
    if (!match) return url;
    const filePath = join(this.assetsDir, match[1]);
    try {
      await fs.access(filePath);
      return url;
    } catch {
      return '';
    }
  }
}
