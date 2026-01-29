import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

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
        config.headers['Authorization-Token'] = this.token;
        return config;
      },
      (error) => {
        this.logger.error('Request error', error);
        return Promise.reject(error);
      },
    );
  }

  async getAllProducts(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/Product/Get');
      return response.data.items || response.data || [];
    } catch (error: any) {
      this.logger.error('Get all products failed', error.message);
      throw error;
    }
  }

  async getModifiedProducts(date: string): Promise<any[]> {
    try {
      const response = await this.client.get(
        '/api/Product/GetModifiedProductsByDateTime',
        {
          params: { dateTime: date },
        },
      );
      return response.data.items || response.data || [];
    } catch (error: any) {
      this.logger.error('Get modified products failed', error.message);
      throw error;
    }
  }

  async getModifiedStock(date: string): Promise<any[]> {
    try {
      const response = await this.client.get(
        '/api/Stock/GetModifiedStocksByDateTime',
        {
          params: { dateTime: date },
        },
      );
      return response.data.items || response.data || [];
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
      return response.data;
    } catch (error: any) {
      this.logger.error(`Get product by SKU failed: ${sku}`, error.message);
      throw error;
    }
  }

  async getStockAndPrice(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/Product/GetStockPrice');
      return response.data.items || response.data || [];
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
}
