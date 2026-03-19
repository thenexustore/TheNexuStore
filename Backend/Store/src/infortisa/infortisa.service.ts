import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { generateDeterministicProductSlug } from './product-slug.util';

export interface InfortisaCatalogFetchMeta {
  page: number;
  pageSize: number;
  totalReceived: number;
  totalExpected: number | null;
  totalPages: number | null;
  offset: number | null;
  limit: number | null;
  hasMore: boolean | null;
  raw: Record<string, unknown>;
}

export interface InfortisaCatalogFetchResult {
  items: any[];
  meta: InfortisaCatalogFetchMeta;
}

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

  private pickNumber(
    source: Record<string, unknown>,
    keys: string[],
  ): number | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private pickBoolean(
    source: Record<string, unknown>,
    keys: string[],
  ): boolean | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
      }
    }
    return null;
  }

  private getArrayPayload(payload: unknown): any[] | null {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const candidate =
        record.items ?? record.data ?? record.results ?? record.value;
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private buildCatalogMeta(
    payload: unknown,
    items: any[],
    requestedPage = 1,
  ): InfortisaCatalogFetchMeta {
    const record =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};

    const page =
      this.pickNumber(record, ['page', 'Page', 'currentPage', 'CurrentPage']) ??
      requestedPage;
    const pageSize =
      this.pickNumber(record, [
        'pageSize',
        'PageSize',
        'perPage',
        'PerPage',
        'limit',
        'Limit',
      ]) ?? items.length;
    const totalExpected = this.pickNumber(record, [
      'total',
      'Total',
      'totalCount',
      'TotalCount',
      'count',
      'Count',
    ]);
    const totalPages = this.pickNumber(record, [
      'totalPages',
      'TotalPages',
      'pages',
      'Pages',
      'pageCount',
      'PageCount',
    ]);
    const offset = this.pickNumber(record, [
      'offset',
      'Offset',
      'skip',
      'Skip',
    ]);
    const limit = this.pickNumber(record, [
      'limit',
      'Limit',
      'pageSize',
      'PageSize',
      'perPage',
      'PerPage',
    ]);
    const hasMore = this.pickBoolean(record, [
      'hasMore',
      'HasMore',
      'more',
      'More',
      'hasNextPage',
      'HasNextPage',
    ]);

    const raw: Record<string, unknown> = {};
    for (const key of [
      'page',
      'Page',
      'currentPage',
      'CurrentPage',
      'pageSize',
      'PageSize',
      'perPage',
      'PerPage',
      'total',
      'Total',
      'totalCount',
      'TotalCount',
      'count',
      'Count',
      'totalPages',
      'TotalPages',
      'pages',
      'Pages',
      'pageCount',
      'PageCount',
      'offset',
      'Offset',
      'skip',
      'Skip',
      'limit',
      'Limit',
      'hasMore',
      'HasMore',
      'more',
      'More',
      'hasNextPage',
      'HasNextPage',
      'truncated',
      'Truncated',
      'isTruncated',
      'IsTruncated',
      'maxResults',
      'MaxResults',
    ]) {
      if (key in record) raw[key] = record[key];
    }

    return {
      page,
      pageSize,
      totalReceived: items.length,
      totalExpected,
      totalPages,
      offset,
      limit,
      hasMore,
      raw,
    };
  }

  private ensureNotTruncated(
    payload: unknown,
    meta: InfortisaCatalogFetchMeta,
  ) {
    const record =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    const explicitTruncated = this.pickBoolean(record, [
      'truncated',
      'Truncated',
      'isTruncated',
      'IsTruncated',
    ]);
    const maxResults = this.pickNumber(record, ['maxResults', 'MaxResults']);

    const looksTruncated =
      explicitTruncated === true ||
      (meta.totalExpected !== null &&
        meta.totalExpected > meta.totalReceived &&
        meta.totalPages === null &&
        meta.hasMore === null) ||
      (maxResults !== null &&
        meta.totalReceived === maxResults &&
        meta.totalExpected !== null &&
        meta.totalExpected > meta.totalReceived);

    if (looksTruncated) {
      throw new Error(
        `Infortisa product catalog appears truncated (received=${meta.totalReceived}, total=${meta.totalExpected ?? 'unknown'}, page=${meta.page}, totalPages=${meta.totalPages ?? 'unknown'})`,
      );
    }
  }

  private extractCatalogPage(
    payload: unknown,
    requestedPage = 1,
  ): InfortisaCatalogFetchResult {
    const items = this.getArrayPayload(payload);
    if (!items) {
      throw new Error(
        'Unexpected response format from Infortisa /api/Product/Get: no valid items array',
      );
    }

    const meta = this.buildCatalogMeta(payload, items, requestedPage);
    this.ensureNotTruncated(payload, meta);

    const transformed = items.map((product) =>
      this.transformInfortisaProduct(product),
    );
    return {
      items: transformed,
      meta: {
        ...meta,
        totalReceived: transformed.length,
      },
    };
  }

  async getAllProductsPaged(): Promise<InfortisaCatalogFetchResult> {
    try {
      const firstResponse = await this.client.get('/api/Product/Get');
      const firstPage = this.extractCatalogPage(firstResponse.data, 1);
      const pages = [firstPage];

      const hasPagination =
        (firstPage.meta.totalPages !== null && firstPage.meta.totalPages > 1) ||
        firstPage.meta.hasMore === true;

      if (!hasPagination) {
        this.logger.log(
          `Infortisa /api/Product/Get metadata: pages=1 pageSize=${firstPage.meta.pageSize} received=${firstPage.meta.totalReceived} total=${firstPage.meta.totalExpected ?? 'unknown'}`,
        );

        if (
          firstPage.meta.totalExpected !== null &&
          firstPage.meta.totalExpected !== firstPage.meta.totalReceived
        ) {
          throw new Error(
            `Infortisa product catalog count mismatch without pagination (received=${firstPage.meta.totalReceived}, total=${firstPage.meta.totalExpected})`,
          );
        }

        return firstPage;
      }

      const totalPages = firstPage.meta.totalPages ?? 1;
      const pageSize = firstPage.meta.pageSize;

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await this.client.get('/api/Product/Get', {
          params: { page, pageSize },
        });
        const nextPage = this.extractCatalogPage(response.data, page);
        pages.push(nextPage);
      }

      const items = pages.flatMap((page) => page.items);
      const totalExpected = pages[0].meta.totalExpected;

      this.logger.log(
        `Infortisa /api/Product/Get pagination detected: pages=${pages.length} pageSize=${pageSize} received=${items.length} total=${totalExpected ?? 'unknown'}`,
      );

      if (totalExpected !== null && totalExpected !== items.length) {
        throw new Error(
          `Infortisa product catalog pagination mismatch (received=${items.length}, total=${totalExpected}, pages=${pages.length})`,
        );
      }

      return {
        items,
        meta: {
          ...pages[0].meta,
          page: 1,
          pageSize,
          totalReceived: items.length,
          totalExpected,
          totalPages: pages.length,
          hasMore: false,
          raw: {
            ...pages[0].meta.raw,
            resolvedPages: pages.length,
          },
        },
      };
    } catch (error: any) {
      this.logger.error('Get all products paged failed', error.message);
      throw error;
    }
  }

  async getAllProducts(): Promise<any[]> {
    const result = await this.getAllProductsPaged();
    return result.items;
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
