import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class InfortisaService {
  private base = 'https://apiv2.infortisa.com';
  private token = process.env.INFORTISA_API_TOKEN;

  private headers() {
    return {
      'Authorization-Token': this.token,
      'Content-Type': 'application/json',
    };
  }

  async getAllProducts() {
    const res = await axios.get(`${this.base}/api/Product/Get`, {
      headers: this.headers(),
    });
    return res.data.items || res.data;
  }

  async getModifiedProducts(date: string) {
    const res = await axios.get(
      `${this.base}/api/Product/GetModifiedProductsByDateTime`,
      {
        params: { dateTime: date },
        headers: this.headers(),
      },
    );
    return res.data.items || res.data;
  }

  async getModifiedStock(date: string) {
    const res = await axios.get(
      `${this.base}/api/Stock/GetModifiedStocksByDateTime`,
      {
        params: { dateTime: date },
        headers: this.headers(),
      },
    );
    return res.data.items || res.data;
  }
}
