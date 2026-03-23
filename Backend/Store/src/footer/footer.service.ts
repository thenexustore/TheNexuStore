import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export type FooterLegalLink = {
  label: string;
  url: string;
};

export type FooterPaymentMethod = {
  label: string;
  iconUrl: string;
};

export type FooterSocialLink = {
  platform: string;
  label: string;
  url: string;
};

export type FooterTrustItem = {
  icon: string;
  text: string;
};

export type FooterSettingsPayload = {
  logoUrl?: string;
  logoAlt?: string;
  newsletterEnabled?: boolean;
  newsletterTitle?: string;
  newsletterText?: string;
  newsletterPlaceholder?: string;
  newsletterButtonText?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactAddress?: string;
  contactHours?: string;
  contactMapsUrl?: string;
  legalLinks?: FooterLegalLink[];
  paymentsEnabled?: boolean;
  paymentMethods?: FooterPaymentMethod[];
  socialEnabled?: boolean;
  socialLinks?: FooterSocialLink[];
  trustEnabled?: boolean;
  trustItems?: FooterTrustItem[];
  copyrightText?: string;
};

export type FooterSettingsFull = Required<FooterSettingsPayload>;

export const DEFAULT_FOOTER_SETTINGS: FooterSettingsFull = {
  logoUrl: '/logo1.jpeg',
  logoAlt: 'TheNexuStore',
  newsletterEnabled: true,
  newsletterTitle: '¡Únete a nuestra comunidad!',
  newsletterText:
    'Recibe las últimas ofertas y novedades directamente en tu bandeja de entrada.',
  newsletterPlaceholder: 'Tu correo electrónico',
  newsletterButtonText: 'Suscribirse',
  contactEmail: 'nexusspsolutionsceuta@gmail.com',
  contactPhone: '+34 656 806 899',
  contactWhatsapp: '+34 656 806 899',
  contactAddress: 'Avenida España, nº32, 2ºB, CP 51001 Ceuta',
  contactHours: 'Lun-Vie 9:00–18:00',
  contactMapsUrl: '',
  legalLinks: [
    { label: 'Aviso legal', url: '/legal' },
    { label: 'Privacidad', url: '/privacidad' },
    { label: 'Términos y condiciones', url: '/terminos' },
    { label: 'Política de cookies', url: '/cookies' },
    { label: 'Envíos', url: '/envios' },
    { label: 'Devoluciones', url: '/devoluciones' },
  ],
  paymentsEnabled: true,
  paymentMethods: [
    { label: 'Visa', iconUrl: '' },
    { label: 'Mastercard', iconUrl: '' },
    { label: 'Bizum', iconUrl: '' },
    { label: 'Redsys', iconUrl: '' },
  ],
  socialEnabled: true,
  socialLinks: [
    {
      platform: 'facebook',
      label: 'Facebook',
      url: 'https://www.facebook.com/people/Nexus-SP-Solutions/61574722507921/?locale=es_ES',
    },
    {
      platform: 'instagram',
      label: 'Instagram',
      url: 'https://www.instagram.com/nexusspsolutions/',
    },
    {
      platform: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/company/nexus-sp-solutions/',
    },
    {
      platform: 'x',
      label: 'X',
      url: 'https://x.com/nexusspsolution',
    },
  ],
  trustEnabled: true,
  trustItems: [
    { icon: 'truck', text: 'Envío 24/48h' },
    { icon: 'shield-check', text: 'Compra 100% segura' },
    { icon: 'rotate-ccw', text: 'Devolución fácil' },
    { icon: 'headphones', text: 'Soporte 24/7' },
  ],
  copyrightText:
    '© {year} Sánchez Peinado Solutions S.L.U. — TheNexuStore. Todos los derechos reservados.',
};

@Injectable()
export class FooterService {
  private readonly storageDir: string;
  private readonly settingsPath: string;

  constructor() {
    const envPath = process.env.FOOTER_STORAGE_DIR?.trim();
    if (envPath) {
      if (!envPath.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(envPath)) {
        throw new Error(
          `FOOTER_STORAGE_DIR must be an absolute path, got: ${envPath}`,
        );
      }
      this.storageDir = envPath;
    } else {
      this.storageDir = join(process.cwd(), 'storage', 'footer');
    }
    this.settingsPath = join(this.storageDir, 'settings.json');
  }

  private normalize(input: FooterSettingsPayload): FooterSettingsFull {
    const d = DEFAULT_FOOTER_SETTINGS;
    return {
      logoUrl:
        typeof input.logoUrl === 'string' ? input.logoUrl.trim() : d.logoUrl,
      logoAlt:
        typeof input.logoAlt === 'string' ? input.logoAlt.trim() : d.logoAlt,
      newsletterEnabled:
        typeof input.newsletterEnabled === 'boolean'
          ? input.newsletterEnabled
          : d.newsletterEnabled,
      newsletterTitle:
        typeof input.newsletterTitle === 'string'
          ? input.newsletterTitle
          : d.newsletterTitle,
      newsletterText:
        typeof input.newsletterText === 'string'
          ? input.newsletterText
          : d.newsletterText,
      newsletterPlaceholder:
        typeof input.newsletterPlaceholder === 'string'
          ? input.newsletterPlaceholder
          : d.newsletterPlaceholder,
      newsletterButtonText:
        typeof input.newsletterButtonText === 'string'
          ? input.newsletterButtonText
          : d.newsletterButtonText,
      contactEmail:
        typeof input.contactEmail === 'string'
          ? input.contactEmail.trim()
          : d.contactEmail,
      contactPhone:
        typeof input.contactPhone === 'string'
          ? input.contactPhone.trim()
          : d.contactPhone,
      contactWhatsapp:
        typeof input.contactWhatsapp === 'string'
          ? input.contactWhatsapp.trim()
          : d.contactWhatsapp,
      contactAddress:
        typeof input.contactAddress === 'string'
          ? input.contactAddress
          : d.contactAddress,
      contactHours:
        typeof input.contactHours === 'string'
          ? input.contactHours
          : d.contactHours,
      contactMapsUrl:
        typeof input.contactMapsUrl === 'string'
          ? input.contactMapsUrl.trim()
          : d.contactMapsUrl,
      legalLinks: Array.isArray(input.legalLinks)
        ? input.legalLinks
            .filter((l) => l && typeof l.label === 'string')
            .map((l) => ({ label: l.label, url: l.url || '' }))
        : d.legalLinks,
      paymentsEnabled:
        typeof input.paymentsEnabled === 'boolean'
          ? input.paymentsEnabled
          : d.paymentsEnabled,
      paymentMethods: Array.isArray(input.paymentMethods)
        ? input.paymentMethods
            .filter((p) => p && typeof p.label === 'string')
            .map((p) => ({ label: p.label, iconUrl: p.iconUrl || '' }))
        : d.paymentMethods,
      socialEnabled:
        typeof input.socialEnabled === 'boolean'
          ? input.socialEnabled
          : d.socialEnabled,
      socialLinks: Array.isArray(input.socialLinks)
        ? input.socialLinks
            .filter((s) => s && typeof s.platform === 'string')
            .map((s) => ({
              platform: s.platform,
              label: s.label || s.platform,
              url: s.url || '',
            }))
        : d.socialLinks,
      trustEnabled:
        typeof input.trustEnabled === 'boolean'
          ? input.trustEnabled
          : d.trustEnabled,
      trustItems: Array.isArray(input.trustItems)
        ? input.trustItems
            .filter((t) => t && typeof t.text === 'string')
            .map((t) => ({ icon: t.icon || 'check', text: t.text }))
        : d.trustItems,
      copyrightText:
        typeof input.copyrightText === 'string'
          ? input.copyrightText
          : d.copyrightText,
    };
  }

  async getSettings(): Promise<FooterSettingsFull> {
    try {
      const raw = await fs.readFile(this.settingsPath, 'utf8');
      const parsed = JSON.parse(raw) as FooterSettingsPayload;
      return this.normalize({ ...DEFAULT_FOOTER_SETTINGS, ...parsed });
    } catch {
      return DEFAULT_FOOTER_SETTINGS;
    }
  }

  async saveSettings(input: FooterSettingsPayload): Promise<FooterSettingsFull> {
    await fs.mkdir(this.storageDir, { recursive: true });
    const next = this.normalize(input);
    await fs.writeFile(
      this.settingsPath,
      JSON.stringify(next, null, 2),
      'utf8',
    );
    return next;
  }

  async resetToDefaults(): Promise<FooterSettingsFull> {
    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.writeFile(
      this.settingsPath,
      JSON.stringify(DEFAULT_FOOTER_SETTINGS, null, 2),
      'utf8',
    );
    return DEFAULT_FOOTER_SETTINGS;
  }
}
