import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface RedsysPaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  merchantCode: string;
  terminal: string;
  transactionType: string;
  merchantUrl: string;
  urlOk: string;
  urlKo: string;
}

export interface RedsysFormData {
  Ds_SignatureVersion: string;
  Ds_MerchantParameters: string;
  Ds_Signature: string;
  formUrl: string;
}

export interface RedsysNotification {
  Ds_SignatureVersion: string;
  Ds_MerchantParameters: string;
  Ds_Signature: string;
}

export interface RedsysDecodedParams {
  [key: string]: string | undefined;
}

@Injectable()
export class RedsysService {
  private readonly REDSYS_URL = process.env.REDSYS_URL || 'https://sis-t.redsys.es:25443/sis/realizarPago';
  private readonly MERCHANT_CODE = process.env.REDSYS_MERCHANT_CODE || '999008881';
  private readonly TERMINAL = process.env.REDSYS_TERMINAL || '1';
  private readonly SECRET_KEY = process.env.REDSYS_SECRET_KEY || 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';
  private readonly CURRENCY = '978'; // EUR

  createMerchantOrderReference(sourceId: string): string {
    const hash = crypto.createHash('sha256').update(sourceId).digest('hex').slice(0, 15);
    const numeric = (BigInt(`0x${hash}`) % 1_000_000_000_000n).toString().padStart(12, '0');
    return numeric;
  }

  createPaymentForm(
    merchantOrderReference: string,
    amount: number,
    merchantUrl: string,
    urlOk: string,
    urlKo: string,
  ): RedsysFormData {
    const amountInCents = Math.round(amount * 100);

    const merchantParams = {
      DS_MERCHANT_AMOUNT: amountInCents.toString(),
      DS_MERCHANT_ORDER: merchantOrderReference,
      DS_MERCHANT_MERCHANTCODE: this.MERCHANT_CODE,
      DS_MERCHANT_CURRENCY: this.CURRENCY,
      DS_MERCHANT_TRANSACTIONTYPE: '0',
      DS_MERCHANT_TERMINAL: this.TERMINAL,
      DS_MERCHANT_MERCHANTURL: merchantUrl,
      DS_MERCHANT_URLOK: urlOk,
      DS_MERCHANT_URLKO: urlKo,
    };

    const merchantParamsBase64 = this.encodeBase64(JSON.stringify(merchantParams));
    const signature = this.generateSignature(merchantParamsBase64, merchantOrderReference);

    return {
      Ds_SignatureVersion: 'HMAC_SHA256_V1',
      Ds_MerchantParameters: merchantParamsBase64,
      Ds_Signature: signature,
      formUrl: this.REDSYS_URL,
    };
  }

  async processNotification(notification: RedsysNotification): Promise<{
    success: boolean;
    merchantOrderReference: string;
    authCode?: string;
    responseCode: string;
  }> {
    const isValid = this.verifySignature(
      notification.Ds_MerchantParameters,
      notification.Ds_Signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid REDSYS signature');
    }

    const params = this.decodeMerchantParams(notification.Ds_MerchantParameters);
    const responseCodeRaw = this.getParam(params, ['Ds_Response', 'DS_RESPONSE']);
    const merchantOrderReference = this.getParam(params, ['Ds_Order', 'DS_ORDER']);
    const authCode = this.getOptionalParam(params, ['Ds_AuthorisationCode', 'DS_AUTHORISATIONCODE']);

    const responseCode = Number.parseInt(responseCodeRaw, 10);
    if (!Number.isFinite(responseCode)) {
      throw new BadRequestException('Invalid REDSYS response code');
    }

    const success = responseCode >= 0 && responseCode <= 99;

    return {
      success,
      merchantOrderReference,
      authCode,
      responseCode: responseCodeRaw,
    };
  }

  private encodeBase64(data: string): string {
    return Buffer.from(data).toString('base64');
  }

  private decodeBase64(data: string): string {
    return Buffer.from(data, 'base64').toString('utf8');
  }

  private generateSignature(merchantParamsBase64: string, orderNumber: string): string {
    const key = Buffer.from(this.SECRET_KEY, 'base64');
    const orderKey = this.encrypt3DES(orderNumber, key);
    const hmac = crypto.createHmac('sha256', orderKey);
    hmac.update(merchantParamsBase64);
    return hmac.digest('base64');
  }

  private verifySignature(merchantParamsBase64: string, receivedSignature: string): boolean {
    const params = this.decodeMerchantParams(merchantParamsBase64);
    const dsOrder = this.getParam(params, ['Ds_Order', 'DS_ORDER']);
    const expectedSignature = this.generateSignature(merchantParamsBase64, dsOrder);

    const normalizedReceived = this.normalizeBase64(receivedSignature);
    const normalizedExpected = this.normalizeBase64(expectedSignature);

    const receivedBuffer = Buffer.from(normalizedReceived, 'base64');
    const expectedBuffer = Buffer.from(normalizedExpected, 'base64');
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  }

  private encrypt3DES(data: string, key: Buffer): Buffer {
    const blockSize = 8;
    const remainder = data.length % blockSize;
    const paddedData =
      remainder === 0 ? data : data.padEnd(data.length + (blockSize - remainder), '\0');
    const cipher = crypto.createCipheriv('des-ede3-cbc', key.slice(0, 24), Buffer.alloc(8));
    cipher.setAutoPadding(false);
    const encrypted = Buffer.concat([cipher.update(paddedData, 'utf8'), cipher.final()]);
    return encrypted;
  }

  private decodeMerchantParams(merchantParamsBase64: string): RedsysDecodedParams {
    const decoded = this.decodeBase64(merchantParamsBase64);
    return JSON.parse(decoded);
  }

  private normalizeBase64(value: string): string {
    const normalized = value
      .replace(/\s/g, '+')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const missingPadding = normalized.length % 4;
    if (missingPadding === 0) {
      return normalized;
    }
    return normalized.padEnd(normalized.length + (4 - missingPadding), '=');
  }

  private getParam(params: RedsysDecodedParams, keys: string[]): string {
    for (const key of keys) {
      const value = params[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    throw new BadRequestException(`Missing REDSYS field: ${keys.join(' or ')}`);
  }

  private getOptionalParam(
    params: RedsysDecodedParams,
    keys: string[],
  ): string | undefined {
    for (const key of keys) {
      const value = params[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    return undefined;
  }

  getResponseMessage(responseCode: string): string {
    const code = parseInt(responseCode, 10);
    
    if (code >= 0 && code <= 99) return 'Transaction approved';
    if (code === 101) return 'Card expired';
    if (code === 102) return 'Card temporarily blocked';
    if (code === 104) return 'Operation not allowed';
    if (code === 116) return 'Insufficient funds';
    if (code === 118) return 'Card not registered';
    if (code === 129) return 'Invalid CVV';
    if (code === 180) return 'Card not valid for this operation';
    if (code === 184) return 'Authentication error';
    if (code === 190) return 'Denied without reason';
    if (code === 191) return 'Wrong expiration date';
    if (code >= 9000) return 'System error';
    
    return 'Transaction declined';
  }
}
