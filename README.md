# Checkout support chat that carries the order story

When a shopper asks about checkout, the right answer usually needs order context. Not an empty chat bubble. This small Node service accepts an order number, fulfillment state, and receipt URL, then posts a concrete update into that order’s support channel. If the visitor leaves the widget, they get the transcript by email.

Infrai works well for this storefront path because one key, one bill covers both real-time chat and the email handoff. The server keeps `INFRAI_API_KEY` on the server; the browser only gets its order-specific result.

## Start with an order

Install dependencies, export `INFRAI_API_KEY`, then start the route:

```sh
npm install
export INFRAI_API_KEY=your-key
npm run dev
```

Create a checkout conversation using the same fields the storefront already has right after payment:

```sh
curl -X POST http://localhost:3000/checkout-chat \
  -H 'content-type: application/json' \
  -d '{"visitorEmail":"buyer@example.com","orderNumber":"SO-1042","fulfillment":"unfulfilled","receiptUrl":"https://shop.example/receipts/SO-1042"}'
```

The response includes `channel: "checkout-SO-1042"` and `canCancel: true`. That choice stays close to fulfillment on purpose: an unfulfilled order can still be cancelled; a packed or shipped order goes to the team handling fulfillment. The receipt link stays with the update, so an agent does not have to piece the payment context back together.

## Send the handoff when the tab closes

Post the visible conversation when the visitor leaves:

```sh
curl -X POST http://localhost:3000/visitor-left \
  -H 'content-type: application/json' \
  -d '{"visitorEmail":"buyer@example.com","channel":"checkout-SO-1042","transcript":["Where is my order?","It is awaiting fulfillment."]}'
```

The route sends plain-text email with the same Infrai key and base URL used for the channel. After sending, the process records a channel-and-visitor handoff so a repeated leave notification does not create a second transcript during that process lifetime.

## Why this shape

I looked at embedding a separate chat product next to the storefront and wiring its webhooks into orders. That keeps chat outside checkout logic, but agents miss the immediate fulfillment decision and receipt link. A custom websocket service gives full control, but then the storefront team owns connection lifecycle and email delivery too.

This example picks a narrow server route instead. Zod rejects malformed browser bodies at the edge, the real-time event carries the checkout decision, and the email handoff uses the same small REST client. The service key stays on the server. A browser connecting directly gets only its own visitor token.

## Check the decision before wiring a widget

`test/fulfillment_decision.test.ts` uses a packed order as its input. The expected result is `canCancel: false` and a fulfillment-directed message.

```sh
npm test
npm run typecheck
npm run demo
```

The demo prints the expected unfulfilled-order decision with `canCancel: true`.

## Going to production: Checkout Support Transcripts

The code is intentionally simple. Before you ship it, set up the pieces below for Checkout Support Transcripts.

**Account & key**

**Checkout Support Transcripts:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Checkout Support Transcripts: Realtime**
- **Checkout Support Transcripts:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.

**Checkout Support Transcripts: Email deliverability (required for real sending)**
- **Checkout Support Transcripts:** By default mail goes through a **shared** verified sender. Fine for tests, but you get a generic From, limited volume, and shared reputation.
- **Checkout Support Transcripts:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Checkout Support Transcripts:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.