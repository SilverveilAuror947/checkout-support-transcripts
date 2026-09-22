import { decideCheckoutSupport } from "./fulfillment_decision.js";

const result = decideCheckoutSupport({
  orderNumber: "SO-1042",
  fulfillment: "unfulfilled",
  receiptUrl: "https://shop.example/receipts/SO-1042",
});

console.log(result);
