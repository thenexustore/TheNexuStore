import { RedsysService } from './redsys.service';

describe('RedsysService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.REDSYS_MERCHANT_CODE = '368824082';
    process.env.REDSYS_TERMINAL = '1';
    process.env.REDSYS_SECRET_KEY = '0TuZm3TxbdKUzU5IOO4HEJZzlRyUSmj+';
    process.env.REDSYS_ENV = 'test';
    process.env.REDSYS_URL = 'https://sis-t.redsys.es:25443/sis/realizarPago';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('creates a Bizum redirect payload with the expected Redsys fields', () => {
    const service = new RedsysService();

    const form = service.createPaymentForm({
      merchantOrderReference: '123456789012',
      amount: 19.95,
      merchantUrl: 'https://api.example.com/payments/redsys/notify',
      urlOk: 'https://api.example.com/payments/redsys/ok',
      urlKo: 'https://api.example.com/payments/redsys/ko',
      merchantData: 'payment_123',
      productDescription: 'Order ORD-1',
      merchantName: 'The Nexus Store',
      paymentMethod: 'BIZUM',
      bizumMobileNumber: '600 123 123',
    });

    expect(form.Ds_SignatureVersion).toBe('HMAC_SHA256_V1');
    expect(form.formUrl).toBe('https://sis-t.redsys.es:25443/sis/realizarPago');

    const payload = JSON.parse(
      Buffer.from(form.Ds_MerchantParameters, 'base64').toString('utf8'),
    ) as Record<string, string>;

    expect(payload.DS_MERCHANT_ORDER).toBe('123456789012');
    expect(payload.DS_MERCHANT_AMOUNT).toBe('1995');
    expect(payload.DS_MERCHANT_MERCHANTCODE).toBe('368824082');
    expect(payload.DS_MERCHANT_TERMINAL).toBe('1');
    expect(payload.DS_MERCHANT_TRANSACTIONTYPE).toBe('0');
    expect(payload.DS_MERCHANT_MERCHANTURL).toBe(
      'https://api.example.com/payments/redsys/notify',
    );
    expect(payload.DS_MERCHANT_PAYMETHODS).toBe('z');
    expect(payload.DS_MERCHANT_BIZUM_MOBILENUMBER).toBe('600123123');
  });

  it('verifies notifications and normalizes Bizum as the processed payment method', async () => {
    const service = new RedsysService();
    const merchantParameters = Buffer.from(
      JSON.stringify({
        Ds_Order: '123456789012',
        Ds_Response: '0000',
        Ds_Amount: '1995',
        Ds_Currency: '978',
        Ds_MerchantCode: '368824082',
        Ds_Terminal: '1',
        Ds_AuthorisationCode: '123456',
        Ds_MerchantData: 'payment_123',
        Ds_ProcessedPayMethod: '68',
      }),
      'utf8',
    ).toString('base64');

    const signature = (service as any).generateSignature(
      merchantParameters,
      '123456789012',
    ) as string;

    const result = await service.processNotification({
      Ds_SignatureVersion: 'HMAC_SHA256_V1',
      Ds_MerchantParameters: merchantParameters,
      Ds_Signature: signature,
    });

    expect(result.success).toBe(true);
    expect(result.merchantOrderReference).toBe('123456789012');
    expect(result.responseCode).toBe('0000');
    expect(result.amountInCents).toBe(1995);
    expect(result.payMethod).toBe('BIZUM');
    expect(result.processedPayMethod).toBe('68');
    expect(result.merchantData).toBe('payment_123');
  });
});
