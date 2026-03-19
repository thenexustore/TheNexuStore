import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { generateDeterministicProductSlug } from './product-slug.util';

export type InfortisaHealthStatus = {
  healthy: boolean;
  provider: 'infortisa';
  base_url: string;
  checked_at: string;
  auth_configured: boolean;
  latency_ms: number;
  error_summary?: string;
};

@Injectable()
export class InfortisaService implements OnModuleInit {
  private readonly logger = new Logger(InfortisaService.name);
  private client!: AxiosInstance;
  private token = '';
  private baseURL = DEFAULT_BASE_URL;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.reloadConfiguration();
  }

  async reloadConfiguration() {
    const integration = await this.prisma.supplierIntegration.findUnique({
      where: { provider: PROVIDER },
    });
    const fallbackToken = this.config.get<string>('INFORTISA_API_TOKEN') || '';
    this.token = integration?.api_key_encrypted
      ? this.tryDecrypt(integration.api_key_encrypted) || fallbackToken
      : fallbackToken;
    this.baseURL = integration?.base_url || DEFAULT_BASE_URL;
    this.initializeClient();
  }

  private getEncryptionSecret() {
    return (
      this.config.get<string>('INTEGRATION_SECRET_KEY') ||
      this.config.get<string>('JWT_SECRET') ||
      'dev_secret'
    );
  }

  private tryDecrypt(payload: string) {
    try {
      const raw = Buffer.from(payload, 'base64');
      const iv = raw.subarray(0, 12);
      const authTag = raw.subarray(12, 28);
      const encrypted = raw.subarray(28);
      const crypto = require('crypto') as typeof import('crypto');
      const key = crypto
        .createHash('sha256')
        .update(this.getEncryptionSecret())
        .digest();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString('utf8');
    } catch (error: any) {
      this.logger.warn(
        `Falling back to env token due to decrypt failure: ${error?.message || error}`,
      );
      return null;
    }
  }

  private initializeClient() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Infortisa-Sync-Service/2.0',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers['Authorization-Token'] = this.token;
        }
        return config;
      },
      (error) => {
        this.logger.error('Request error', error.message);
        return Promise.reject(error);
      },
    );
  }

  private async getClient() {
    if (!this.client) {
      await this.reloadConfiguration();
    }

    return this.client;
  }

  private formatToInfortisaDate(date: string): string {
    const d = new Date(date);
    return (
      `${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/` +
      `${d.getUTCDate().toString().padStart(2, '0')}/` +
      `${d.getUTCFullYear()} ` +
      `${d.getUTCHours().toString().padStart(2, '0')}:` +
      `${d.getUTCMinutes().toString().padStart(2, '0')}:` +
      `${d.getUTCSeconds().toString().padStart(2, '0')}`
    );
  }

  private transformInfortisaProduct(product: any): any {
    if (!product) return null;

    const sku =
      typeof product.SKU === 'string' && product.SKU.trim()
        ? product.SKU.trim()
        : typeof product.CODIGOINTERNO === 'string' &&
            product.CODIGOINTERNO.trim()
          ? product.CODIGOINTERNO.trim()
          : typeof product.sku === 'string' && product.sku.trim()
            ? product.sku.trim()
            : null;

    const title =
      product.ProductDescription || product.TITULO || product.Name || '';

    return {
      SKU: sku,
      Name: title,

      Price:
        product.Price ||
        product.PRECIO ||
        product.PriceWithoutCanon ||
        product.PRECIOSINCANON ||
        0,

      Stock: product.StockCentral || product.STOCKCENTRAL || 0,
      StockPalma: product.StockPalma || product.STOCKPALMA || 0,
      StockExterno: product.StockExterno || product.STOCKEXTERNO || 0,

      PictureUrl: product.IMAGEN || product.PictureUrl || null,

      ManufacturerName:
        product.NOMFABRICANTE || product.ManufacturerName || 'Infortisa',

      ShortDescription: title,
      FullDescription: title,

      CategoryName:
        product.TITULOSUBFAMILIA ||
        product.TITULO_FAMILIA ||
        product.CategoryName ||
        'Infortisa',
      FamilyName: product.TITULO_FAMILIA || product.FamilyName || null,
      SubfamilyName: product.TITULOSUBFAMILIA || product.SubfamilyName || null,

      Cycle: product.Cycle || product.CICLOVIDA || 'P',

      CanonLPI: product.CanonLPI || product.CANONLPI || 0,

      PRECIOSINCANON:
        product.PRECIOSINCANON ||
        product.PriceWithoutCanon ||
        product.Price ||
        0,

      REFFABRICANTE: product.Partnumber || product.REFFABRICANTE || '',
      Partnumber: product.Partnumber || product.REFFABRICANTE || '',

      TITULOSUBFAMILIA:
        product.TITULOSUBFAMILIA || product.CategoryName || 'Infortisa',

      TITULO_FAMILIA:
        product.TITULO_FAMILIA || product.CategoryName || 'Infortisa',

      NOMFABRICANTE:
        product.NOMFABRICANTE || product.ManufacturerName || 'Infortisa',

      IMAGEN: product.IMAGEN || product.PictureUrl || null,

      STOCKCENTRAL: product.StockCentral || product.STOCKCENTRAL || 0,
      STOCKPALMA: product.StockPalma || product.STOCKPALMA || 0,
      STOCKEXTERNO: product.StockExterno || product.STOCKEXTERNO || 0,

      PRECIO:
        product.Price ||
        product.PRECIO ||
        product.PriceWithoutCanon ||
        product.PRECIOSINCANON ||
        0,

      CANONLPI: product.CanonLPI || product.CANONLPI || 0,
      CICLOVIDA: product.Cycle || product.CICLOVIDA || 'P',
      CodCicloVida:
        product.CodCicloVida || product.CICLOVIDA || product.Cycle || 'P',

      ProductDescription: title,
      TITULO: title,

      CODIGOINTERNO: sku,

      slug: generateDeterministicProductSlug(title || 'unknown-product', sku),

      _original: product,
    };
  }

  async getAllProducts(): Promise<any[]> {
    try {
      const client = await this.getClient();
      const response = await client.get('/api/Product/Get');
      const data = response.data.items || response.data || [];

      if (!Array.isArray(data)) {
        this.logger.warn('Unexpected response format from getAllProducts');
        return [];
      }

      return data.map((product) => this.transformInfortisaProduct(product));
    } catch (error: any) {
      this.logger.error('Get all products failed', error.message);
      throw error;
    }
  }

  async getModifiedProducts(date: string): Promise<any[]> {
    const formatted = this.formatToInfortisaDate(date);

    try {
      const client = await this.getClient();
      const response = await client.get(
        '/api/Product/GetModifiedProductsByDateTime',
        {
          params: {
            UtcDate: formatted,
          },
        },
      );

      const data = response.data.items || response.data || [];

      if (!Array.isArray(data)) {
        this.logger.warn('Unexpected response format from getModifiedProducts');
        return [];
      }

      return data.map((product) => this.transformInfortisaProduct(product));
    } catch (error: any) {
      this.logger.error('Get modified products failed', error.message);
      throw error;
    }
  }

  async getModifiedStock(date: string): Promise<any[]> {
    const formatted = this.formatToInfortisaDate(date);

    try {
      const client = await this.getClient();
      const response = await client.get(
        '/api/Stock/GetModifiedStocksByDateTime',
        {
          params: {
            UtcDate: formatted,
          },
        },
      );

      const data = response.data.items || response.data || [];

      if (!Array.isArray(data)) {
        this.logger.warn('Unexpected response format from getModifiedStock');
        return [];
      }

      return data.map((product) => this.transformInfortisaProduct(product));
    } catch (error: any) {
      this.logger.error('Get modified stock failed', error.message);
      throw error;
    }
  }

  async getProductBySku(sku: string): Promise<any> {
    try {
      const client = await this.getClient();
      const response = await client.get('/api/Product/GetProductBySku', {
        params: { sku },
      });

      const product = response.data;
      return this.transformInfortisaProduct(product);
    } catch (error: any) {
      this.logger.error(`Get product by SKU failed: ${sku}`, error.message);
      throw error;
    }
  }

  async getStockAndPrice(): Promise<any[]> {
    try {
      const client = await this.getClient();
      const response = await client.get('/api/Product/GetStockPrice');
      const data = response.data.items || response.data || [];

      if (!Array.isArray(data)) {
        this.logger.warn('Unexpected response format from getStockAndPrice');
        return [];
      }

      return data.map((product) => this.transformInfortisaProduct(product));
    } catch (error: any) {
      this.logger.error('Get stock and price failed', error.message);
      throw error;
    }
  }

  private summarizeHealthError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      const details =
        typeof responseData === 'string'
          ? responseData
          : responseData && typeof responseData === 'object'
            ? JSON.stringify(responseData)
            : error.message;

      return status
        ? `HTTP ${status}: ${details}`
        : details || 'Unknown provider error';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown provider error';
  }

  async getHealthStatus(): Promise<InfortisaHealthStatus> {
    const checkedAt = new Date().toISOString();
    const startedAt = Date.now();
    const authConfigured = this.token.trim().length > 0;

    try {
      const client = await this.getClient();
      const response = await client.get('/api/Ficha/Get', {
        params: { user: this.token },
      });
      const healthy =
        response.data === 'Su servicio está funcionando correctamente.';

      return {
        healthy,
        provider: 'infortisa',
        base_url: this.baseURL,
        checked_at: checkedAt,
        auth_configured: authConfigured,
        latency_ms: Date.now() - startedAt,
        ...(healthy
          ? {}
          : {
              error_summary: `Unexpected provider response: ${String(response.data)}`,
            }),
      };
    } catch (error: unknown) {
      const errorSummary = this.summarizeHealthError(error);
      this.logger.error('Service health check failed', errorSummary);

      return {
        healthy: false,
        provider: 'infortisa',
        base_url: this.baseURL,
        checked_at: checkedAt,
        auth_configured: authConfigured,
        latency_ms: Date.now() - startedAt,
        error_summary: errorSummary,
      };
    }
  }

  async checkServiceHealth(): Promise<boolean> {
    const health = await this.getHealthStatus();
    return health.healthy;
  }

  async getTariffFile(
    format: 'standard' | 'extended' = 'standard',
  ): Promise<string> {
    const endpoint =
      format === 'extended'
        ? '/api/Tarifa/GetFileV5EXT'
        : '/api/Tarifa/GetFileV5';

    try {
      const client = await this.getClient();
      const response = await client.get(endpoint, {
        params: { user: this.token },
        responseType: 'text',
      });
      return response.data as string;
    } catch (error: any) {
      this.logger.error('Get tariff file failed', error.message);
      throw error;
    }
  }

  async createOrder(orderData: any): Promise<any> {
    try {
      const client = await this.getClient();
      const response = await client.post('/api/order/create', orderData);
      return response.data;
    } catch (error: any) {
      this.logger.error('Create order failed', error.message);
      throw error;
    }
  }

  async getOrderStatus(customerReference: string): Promise<any> {
    try {
      const client = await this.getClient();
      const response = await client.get('/api/order/status', {
        params: { CustomerReference: customerReference },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('Get order status failed', error.message);
      throw error;
    }
  }

  async getInvoicesByDate(date: string): Promise<any> {
    try {
      const client = await this.getClient();
      const response = await client.get('/api/invoice/GetByDate', {
        params: { Date: date },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('Get invoices by date failed', error.message);
      throw error;
    }
  }
}
