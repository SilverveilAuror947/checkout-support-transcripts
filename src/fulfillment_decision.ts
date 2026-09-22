export type OrderSnapshot = {
  orderNumber: string;
  fulfillment: "unfulfilled" | "packed" | "shipped";
  receiptUrl: string;
};

export type SupportDecision = {
  canCancel: boolean;
  customerUpdate: string;
};

export function decideCheckoutSupport(order: OrderSnapshot): SupportDecision {
  if (order.fulfillment === "unfulfilled") {
    return {
      canCancel: true,
      customerUpdate: `Order ${order.orderNumber} is awaiting fulfillment and can still be cancelled. Receipt: ${order.receiptUrl}`,
    };
  }

  return {
    canCancel: false,
    customerUpdate: `Order ${order.orderNumber} is already ${order.fulfillment}; keep the support request with fulfillment. Receipt: ${order.receiptUrl}`,
  };
}
