import { BillingDocumentStatus, OrderStatus } from '@prisma/client';
import {
  canIssueFinalInvoiceForOrderStatus,
  canTransitionOrderStatus,
  isCustomerVisibleInvoiceStatus,
} from './order-lifecycle';

describe('order-lifecycle scaffolding', () => {
  it('supports PAID -> ON_HOLD transition', () => {
    expect(canTransitionOrderStatus(OrderStatus.PAID, OrderStatus.ON_HOLD)).toBe(
      true,
    );
  });

  it('blocks PENDING_PAYMENT -> DELIVERED transition', () => {
    expect(
      canTransitionOrderStatus(
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.DELIVERED,
      ),
    ).toBe(false);
  });

  it('gates final invoice issuance to DELIVERED orders', () => {
    expect(canIssueFinalInvoiceForOrderStatus(OrderStatus.DELIVERED)).toBe(true);
    expect(canIssueFinalInvoiceForOrderStatus(OrderStatus.PAID)).toBe(false);
    expect(canIssueFinalInvoiceForOrderStatus(OrderStatus.ON_HOLD)).toBe(false);
  });

  it('keeps draft invoices internal-only', () => {
    expect(isCustomerVisibleInvoiceStatus(BillingDocumentStatus.DRAFT)).toBe(
      false,
    );
    expect(isCustomerVisibleInvoiceStatus(BillingDocumentStatus.ISSUED)).toBe(
      true,
    );
  });
});
