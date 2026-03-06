import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

describe('CheckoutController', () => {
  it('allows guest create-order and forwards customer/session context', async () => {
    const createOrder = jest.fn().mockResolvedValue({ ok: true });
    const service = {
      createOrder,
    } as unknown as CheckoutService;

    const controller = new CheckoutController(service);

    const req = {
      user: undefined,
      headers: {
        'x-session-id': 'sess-123',
      },
    };

    const dto: any = { email: 'guest@example.com' };

    await controller.createOrder(req, dto);

    expect(createOrder).toHaveBeenCalledWith(undefined, 'sess-123', dto);
  });
});
