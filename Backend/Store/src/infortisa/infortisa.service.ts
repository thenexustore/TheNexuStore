import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { generateDeterministicProductSlug } from './product-slug.util';

@Injectable()
export class InfortisaService implements OnModuleInit {
  private readonly logger = new Logger(InfortisaService.name);
  private readonly baseURL = 'https://apiv2.infortisa.com';
  private client!: AxiosInstance;
  private token!: string;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.token = this.config.get('INFORTISA_API_TOKEN') || '';
    this.initializeClient();
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
      SubfamilyName:
        product.TITULOSUBFAMILIA || product.SubfamilyName || null,

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
      const response = await this.client.get('/api/Product/Get');
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
      const response = await this.client.get(
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
      const response = await this.client.get(
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
      const response = await this.client.get('/api/Product/GetProductBySku', {
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
      const response = await this.client.get('/api/Product/GetStockPrice');
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

  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/Ficha/Get', {
        params: { user: this.token },
      });
      return response.data === 'Su servicio está funcionando correctamente.';
    } catch (error: any) {
      this.logger.error('Service health check failed', error.message);
      return false;
    }
  }

  async getTariffFile(
    format: 'standard' | 'extended' = 'standard',
  ): Promise<string> {
    const endpoint =
      format === 'extended'
        ? '/api/Tarifa/GetFileV5EXT'
        : '/api/Tarifa/GetFileV5';

    try {
      const response = await this.client.get(endpoint, {
        params: { user: this.token },
        responseType: 'text',
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('Get tariff file failed', error.message);
      throw error;
    }
  }

  async createOrder(orderData: any): Promise<any> {
    try {
      const response = await this.client.post('/api/order/create', orderData);
      return response.data;
    } catch (error: any) {
      this.logger.error('Create order failed', error.message);
      throw error;
    }
  }

  async getOrderStatus(customerReference: string): Promise<any> {
    try {
      const response = await this.client.get('/api/order/status', {
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
      const response = await this.client.get('/api/invoice/GetByDate', {
        params: { Date: date },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('Get invoices by date failed', error.message);
      throw error;
    }
  }
}
