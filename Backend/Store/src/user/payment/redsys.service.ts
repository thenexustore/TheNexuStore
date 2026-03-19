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
  [key: string]: string | undefined;
  Ds_SignatureVersion?: string;
  Ds_MerchantParameters?: string;
  Ds_Signature?: string;
}

export interface RedsysDecodedParams {
  [key: string]: string | undefined;
}

export type RedsysPaymentMethod = 'CARD' | 'BIZUM';

export interface RedsysCreateFormInput {
  merchantOrderReference: string;
  amount: number;
  merchantUrl: string;
  urlOk: string;
  urlKo: string;
  merchantData?: string;
  productDescription?: string;
  merchantName?: string;
  paymentMethod?: RedsysPaymentMethod;
  bizumMobileNumber?: string;
}

export interface RedsysNotificationResult {
  success: boolean;
  signatureVersion: string;
  merchantOrderReference: string;
  authCode?: string;
  responseCode: string;
  amountInCents: number;
  currency: string;
  merchantCode: string;
  terminal: string;
  merchantData?: string;
  payMethod?: string;
  processedPayMethod?: string;
  rawParams: RedsysDecodedParams;
}

@Injectable()
export class RedsysService {
  private readonly SIGNATURE_VERSION = 'HMAC_SHA256_V1';
  private readonly DEFAULT_TEST_URL =
    'https://sis-t.redsys.es:25443/sis/realizarPago';
  private readonly DEFAULT_PROD_URL = 'https://sis.redsys.es/sis/realizarPago';
  private readonly REDSYS_ENV = (process.env.REDSYS_ENV ?? 'test').toLowerCase();
  private readonly REDSYS_URL =
    process.env.REDSYS_URL ||
    (this.REDSYS_ENV === 'prod' ? this.DEFAULT_PROD_URL : this.DEFAULT_TEST_URL);
  private readonly MERCHANT_CODE = (process.env.REDSYS_MERCHANT_CODE ?? '').trim();
  private readonly TERMINAL = (process.env.REDSYS_TERMINAL ?? '').trim();
  private readonly SECRET_KEY = (process.env.REDSYS_SECRET_KEY ?? '').trim();
  private readonly CURRENCY = '978'; // EUR

  createMerchantOrderReference(sourceId: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(sourceId)
      .digest('hex')
      .slice(0, 15);
    const numeric = (BigInt(`0x${hash}`) % 1_000_000_000_000n)
      .toString()
      .padStart(12, '0');
    return numeric;
  }

  createPaymentForm(input: RedsysCreateFormInput): RedsysFormData {
    this.assertSigningConfig();
    this.assertMerchantOrderReference(input.merchantOrderReference);

    const amountInCents = Math.round(input.amount * 100);
    if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
      throw new BadRequestException('Invalid REDSYS amount');
    }

    const merchantParams: Record<string, string> = {
      DS_MERCHANT_AMOUNT: amountInCents.toString(),
      DS_MERCHANT_ORDER: input.merchantOrderReference,
      DS_MERCHANT_MERCHANTCODE: this.MERCHANT_CODE,
      DS_MERCHANT_CURRENCY: this.CURRENCY,
      DS_MERCHANT_TRANSACTIONTYPE: '0',
      DS_MERCHANT_TERMINAL: this.TERMINAL,
      DS_MERCHANT_MERCHANTURL: input.merchantUrl,
      DS_MERCHANT_URLOK: input.urlOk,
      DS_MERCHANT_URLKO: input.urlKo,
    };

    if (input.merchantData) {
      merchantParams.DS_MERCHANT_MERCHANTDATA = input.merchantData;
    }
    if (input.productDescription) {
      merchantParams.DS_MERCHANT_PRODUCTDESCRIPTION = input.productDescription;
    }
    if (input.merchantName) {
      merchantParams.DS_MERCHANT_MERCHANTNAME = input.merchantName;
    }

    if (input.paymentMethod === 'BIZUM') {
      merchantParams.DS_MERCHANT_PAYMETHODS = 'z';
      if (input.bizumMobileNumber) {
        merchantParams.DS_MERCHANT_BIZUM_MOBILENUMBER =
          input.bizumMobileNumber.replace(/\s+/g, '');
      }
    }

    const merchantParamsBase64 = this.encodeBase64(JSON.stringify(merchantParams));
    const signature = this.generateSignature(
      merchantParamsBase64,
      input.merchantOrderReference,
    );

    return {
      Ds_SignatureVersion: this.SIGNATURE_VERSION,
      Ds_MerchantParameters: merchantParamsBase64,
      Ds_Signature: signature,
      formUrl: this.REDSYS_URL,
    };
  }

  async processNotification(
    notification: RedsysNotification,
  ): Promise<RedsysNotificationResult> {
    this.assertSigningConfig();
    const signatureVersion = this.getNotificationParam(notification, [
      'Ds_SignatureVersion',
    ]);
    if (signatureVersion !== this.SIGNATURE_VERSION) {
      throw new BadRequestException(
        `Unsupported REDSYS signature version: ${signatureVersion}`,
      );
    }

    const merchantParameters = this.getNotificationParam(notification, [
      'Ds_MerchantParameters',
    ]);
    const signature = this.getNotificationParam(notification, ['Ds_Signature']);

    const isValid = this.verifySignature(merchantParameters, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid REDSYS signature');
    }

    const params = this.decodeMerchantParams(merchantParameters);
    const responseCodeRaw = this.getParam(params, ['Ds_Response', 'DS_RESPONSE']);
    const merchantOrderReference = this.getParam(params, ['Ds_Order', 'DS_ORDER']);
    const authCode = this.getOptionalParam(params, [
      'Ds_AuthorisationCode',
      'DS_AUTHORISATIONCODE',
    ]);
    const merchantData = this.getOptionalParam(params, [
      'Ds_MerchantData',
      'DS_MERCHANTDATA',
    ]);
    const amountRaw = this.getParam(params, ['Ds_Amount', 'DS_AMOUNT']);
    const currency = this.getParam(params, ['Ds_Currency', 'DS_CURRENCY']);
    const merchantCode = this.getParam(params, [
      'Ds_MerchantCode',
      'DS_MERCHANTCODE',
    ]);
    const terminal = this.getParam(params, ['Ds_Terminal', 'DS_TERMINAL']);
    const processedPayMethod = this.getOptionalParam(params, [
      'Ds_ProcessedPayMethod',
      'DS_PROCESSEDPAYMETHOD',
    ]);
    const payMethod = this.normalizePayMethod(
      processedPayMethod ??
        this.getOptionalParam(params, ['Ds_PayMethod', 'DS_PAYMETHOD']),
    );

    this.assertMerchantOrderReference(merchantOrderReference);

    const responseCode = Number.parseInt(responseCodeRaw, 10);
    if (!Number.isFinite(responseCode)) {
      throw new BadRequestException('Invalid REDSYS response code');
    }

    const amountInCents = Number.parseInt(amountRaw, 10);
    if (!Number.isFinite(amountInCents) || amountInCents < 0) {
      throw new BadRequestException('Invalid REDSYS amount');
    }

    const success = responseCode >= 0 && responseCode <= 99;

    return {
      success,
      signatureVersion,
      merchantOrderReference,
      authCode,
      responseCode: responseCodeRaw,
      amountInCents,
      currency,
      merchantCode,
      terminal,
      merchantData,
      payMethod,
      processedPayMethod,
      rawParams: params,
    };
  }

  assertNotificationMatchesExpected(
    notification: RedsysNotificationResult,
    expected: {
      merchantOrderReference: string;
      amountInCents: number;
      currency: string;
      merchantCode: string;
      terminal: string;
    },
  ): void {
    if (notification.merchantOrderReference !== expected.merchantOrderReference) {
      throw new BadRequestException('REDSYS order reference mismatch');
    }
    if (notification.amountInCents !== expected.amountInCents) {
      throw new BadRequestException('REDSYS amount mismatch');
    }
    if (notification.currency !== expected.currency) {
      throw new BadRequestException('REDSYS currency mismatch');
    }
    if (notification.merchantCode !== expected.merchantCode) {
      throw new BadRequestException('REDSYS merchant code mismatch');
    }
    if (notification.terminal !== expected.terminal) {
      throw new BadRequestException('REDSYS terminal mismatch');
    }
  }

  getConfiguredMerchantCode(): string {
    this.assertSigningConfig();
    return this.MERCHANT_CODE;
  }

  getConfiguredTerminal(): string {
    this.assertSigningConfig();
    return this.TERMINAL;
  }

  getCurrencyNumericCode(currencyIso: string): string {
    if (currencyIso.toUpperCase() === 'EUR') {
      return this.CURRENCY;
    }
    throw new BadRequestException(`Unsupported currency for REDSYS: ${currencyIso}`);
  }

  private assertSigningConfig(): void {
    if (!this.MERCHANT_CODE || !this.TERMINAL || !this.SECRET_KEY) {
      throw new BadRequestException(
        'REDSYS merchant configuration is incomplete. Set REDSYS_MERCHANT_CODE, REDSYS_TERMINAL and REDSYS_SECRET_KEY.',
      );
    }
  }

  private assertMerchantOrderReference(orderNumber: string): void {
    const value = orderNumber.trim();
    if (!/^[A-Za-z0-9]{4,12}$/.test(value)) {
      throw new BadRequestException(
        'DS_MERCHANT_ORDER must be 4-12 alphanumeric characters',
      );
    }
    if (!/^\d{4}/.test(value)) {
      throw new BadRequestException(
        'DS_MERCHANT_ORDER must start with 4 numeric characters',
      );
    }
  }

  private getNotificationParam(
    notification: RedsysNotification,
    keys: string[],
  ): string {
    for (const key of Object.keys(notification)) {
      const value = notification[key];
      if (typeof value !== 'string' || value.length === 0) {
        continue;
      }
      if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase())) {
        return value;
      }
    }
    throw new BadRequestException(`Missing REDSYS field: ${keys.join(' or ')}`);
  }

  private encodeBase64(data: string): string {
    return Buffer.from(data, 'utf8').toString('base64');
  }

  private decodeBase64(data: string): string {
    return Buffer.from(this.normalizeBase64(data), 'base64').toString('utf8');
  }

  private generateSignature(merchantParamsBase64: string, orderNumber: string): string {
    const key = Buffer.from(this.normalizeBase64(this.SECRET_KEY), 'base64');
    const orderKey = this.encrypt3DES(orderNumber, key);
    const hmac = crypto.createHmac('sha256', orderKey);
    hmac.update(merchantParamsBase64);
    return hmac.digest('base64');
  }

  private verifySignature(
    merchantParamsBase64: string,
    receivedSignature: string,
  ): boolean {
    const params = this.decodeMerchantParams(merchantParamsBase64);
    const dsOrder = this.getParam(params, ['Ds_Order', 'DS_ORDER']);
    const expectedSignature = this.generateSignature(merchantParamsBase64, dsOrder);

    const receivedBuffer = Buffer.from(
      this.normalizeBase64(receivedSignature),
      'base64',
    );
    const expectedBuffer = Buffer.from(
      this.normalizeBase64(expectedSignature),
      'base64',
    );
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
    const cipher = crypto.createCipheriv(
      'des-ede3-cbc',
      key.slice(0, 24),
      Buffer.alloc(8),
    );
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(paddedData, 'utf8'), cipher.final()]);
  }

  private decodeMerchantParams(merchantParamsBase64: string): RedsysDecodedParams {
    const decoded = this.decodeBase64(merchantParamsBase64);
    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      throw new BadRequestException('Invalid REDSYS merchant parameters');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new BadRequestException('Invalid REDSYS merchant parameters payload');
    }
    return parsed as RedsysDecodedParams;
  }

  private normalizeBase64(value: string): string {
    const normalized = value.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
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

  private normalizePayMethod(payMethod?: string): string | undefined {
    if (!payMethod) {
      return undefined;
    }

    const normalized = payMethod.trim().toUpperCase();
    if (!normalized) {
      return undefined;
    }

    if (normalized === 'Z' || normalized === '68') {
      return 'BIZUM';
    }

    if (/^\d+$/.test(normalized)) {
      return `REDSYS_${normalized}`;
    }

    return normalized;
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
