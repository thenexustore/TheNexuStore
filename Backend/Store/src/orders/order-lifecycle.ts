import { BillingDocumentStatus, OrderStatus } from '@prisma/client';

export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAID,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.PROCESSING,
    OrderStatus.ON_HOLD,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.ON_HOLD]: [
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.ON_HOLD,
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.SHIPPED]: [
    OrderStatus.DELIVERED,
    OrderStatus.ON_HOLD,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.FAILED]: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
};

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return true;
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isCustomerVisibleInvoiceStatus(
  status: BillingDocumentStatus,
): boolean {
  return (
    status === BillingDocumentStatus.ISSUED ||
    status === BillingDocumentStatus.SENT ||
    status === BillingDocumentStatus.PAID
  );
}

export function canIssueFinalInvoiceForOrderStatus(status: OrderStatus): boolean {
  return status === OrderStatus.DELIVERED;
}
