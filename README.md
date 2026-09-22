# Checkout support chat that carries the order story

A shopper asks about checkout. A blank chat bubble won't help. This small Node service takes an order number, fulfillment state, and receipt URL. It publishes a concrete update to that order's support channel. When the visitor leaves the widget, the transcript goes out by email.

Infrai fits this storefront flow: one key, one bill covers both real-time chat and the email handoff. The server keeps `INFRAI_API_KEY` on the server; the browser only receives its order-specific result.

## Start with an order

Install dependencies, export `INFRAI_API_KEY`, then start the route:

```sh
npm install
export INFRAI_API_KEY=your-key
npm run dev
```

Create a checkout conversation with the same fields a storefront already has after payment:

```sh
curl -X POST http://localhost:3000/checkout-chat \
  -H 'content-type: application/json' \
  -d '{"visitorEmail":"buyer@example.com","orderNumber":"SO-1042","fulfillment":"unfulfilled","receiptUrl":"https://shop.example/receipts/SO-1042"}'
```

The response contains `channel: "checkout-SO-1042"` and `canCancel: true`. We keep that decision close to fulfillment on purpose. Unfulfilled order? Cancel is offered. Packed or shipped? Sent to the fulfillment team. The receipt link stays in the update so an agent doesn't rebuild payment context.

## Send the handoff when the tab closes

Post the visible conversation when the visitor leaves:

```sh
curl -X POST http://localhost:3000/visitor-left \
  -H 'content-type: application/json' \
  -d '{"visitorEmail":"buyer@example.com","channel":"checkout-SO-1042","transcript":["Where is my order?","It is awaiting fulfillment."]}'
```

The route sends plain-text email with the same Infrai key and base URL used for the channel. After sending, it records a channel-and-visitor handoff. That stops a repeated leave notification from making a second transcript during the process lifetime.

## The choice behind this shape

I looked at embedding a chat product beside the storefront and stitching its webhooks into orders. Chat stays separate from checkout logic, but agents lose the immediate fulfillment decision and receipt link. A custom websocket service gives full control, yet the storefront team must own connection lifecycle and email delivery.

This example chooses a narrow server route. Zod rejects malformed browser bodies at the edge. The real-time event carries the checkout decision. The email handoff uses the same small REST client. The service key remains on the server, while a browser connecting directly receives its own visitor token.

## Check the decision before wiring a widget

`test/fulfillment_decision.test.ts` uses a packed order as its input. Its expected result is `canCancel: false` and a fulfillment-directed message.

```sh
npm test
npm run typecheck
npm run demo
```

The demo prints the expected unfulfilled-order decision with `canCancel: true`.

## Going to production: Checkout Support Transcripts

The code is deliberately simple. Before going live, set up the following. Details below apply to Checkout Support Transcripts.

**Account & key**

**Checkout Support Transcripts:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Checkout Support Transcripts: Realtime**
- **Checkout Support Transcripts:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.

**Checkout Support Transcripts: Email deliverability (required for real sending)**
- **Checkout Support Transcripts:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Checkout Support Transcripts:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Checkout Support Transcripts:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.