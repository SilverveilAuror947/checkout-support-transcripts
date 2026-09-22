import assert from "node:assert/strict";
import test from "node:test";
import { decideCheckoutSupport } from "../src/fulfillment_decision.js";

test("a packed checkout order stays with fulfillment instead of offering cancellation", () => {
  const decision = decideCheckoutSupport({
    orderNumber: "SO-77",
    fulfillment: "packed",
    receiptUrl: "https://shop.example/receipts/SO-77",
  });

  assert.equal(decision.canCancel, false);
  assert.match(decision.customerUpdate, /keep the support request with fulfillment/);
});
