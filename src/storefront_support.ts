import { createServer } from "node:http";
import { z } from "zod";
import { decideCheckoutSupport } from "./fulfillment_decision.js";
import { InfraiRequestError, InfraiSupportGateway } from "./infrai_support_gateway.js";

const checkoutRequest = z.object({
  visitorEmail: z.string().email(),
  orderNumber: z.string().min(1),
  fulfillment: z.enum(["unfulfilled", "packed", "shipped"]),
  receiptUrl: z.string().url(),
});

const leaveRequest = z.object({
  visitorEmail: z.string().email(),
  channel: z.string().min(1),
  transcript: z.array(z.string().min(1)).min(1),
});

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return JSON.parse(raw);
}

function respond(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const gateway = new InfraiSupportGateway();
const transcriptSent = new Set<string>();

createServer(async (request, response) => {
  try {
    if (request.method !== "POST") return respond(response, 405, { error: "Use POST." });
    const payload = await readJson(request);

    if (request.url === "/checkout-chat") {
      const input = checkoutRequest.parse(payload);
      const channel = `checkout-${input.orderNumber}`;
      const decision = decideCheckoutSupport({
        orderNumber: input.orderNumber!,
        fulfillment: input.fulfillment!,
        receiptUrl: input.receiptUrl!,
      });
      await gateway.createChannel(channel);
      await gateway.publishCustomerUpdate(channel, "order.update", { orderNumber: input.orderNumber, ...decision });
      return respond(response, 201, { channel, ...decision });
    }

    if (request.url === "/visitor-left") {
      const input = leaveRequest.parse(payload);
      const sendKey = `${input.channel}:${input.visitorEmail}`;
      if (!transcriptSent.has(sendKey)) {
        const sent = await gateway.emailTranscript(input.visitorEmail, "Your checkout support transcript", input.transcript.join("\n"));
        transcriptSent.add(sendKey);
        return respond(response, 201, { messageId: sent.message_id });
      }
      return respond(response, 200, { messageId: "already-sent" });
    }

    return respond(response, 404, { error: "Route not found." });
  } catch (error) {
    if (error instanceof z.ZodError) return respond(response, 400, { error: error.issues.map((issue) => issue.message) });
    if (error instanceof InfraiRequestError) return respond(response, error.status < 500 ? error.status : 502, { error: error.message });
    return respond(response, 500, { error: "Unexpected service error." });
  }
}).listen(Number(process.env.PORT ?? 3000), () => {
  console.log("Checkout support is listening on http://localhost:3000");
});
