import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InitiatePaymentDto } from './payment.dto';

describe('InitiatePaymentDto', () => {
  it('accepts supported providers', async () => {
    const dto = plainToInstance(InitiatePaymentDto, {
      order_id: '550e8400-e29b-41d4-a716-446655440000',
      provider: 'BIZUM',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported providers', async () => {
    const dto = plainToInstance(InitiatePaymentDto, {
      order_id: '550e8400-e29b-41d4-a716-446655440000',
      provider: 'STRIPE',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.constraints).toBeDefined();
  });
});
