# Faradpay Node.js SDK

Node.js SDK for the [Faradpay](https://gateway.faradpay.com) crypto payment gateway: accept payments, keep them in your custody balance, send payouts, and verify signed callbacks. No dependencies, Node 18+.

API docs: https://documenter.getpostman.com/view/60410737/2sBYPv4Yoh

## Install

```bash
npm install faradpay-sdk
```

## Get your keys

1. Sign up at https://gateway.faradpay.com/register.
2. Panel → **Store settings → Keys**: create an **API key**.
3. Panel → **Store settings → Notification**: generate your **IPN secret** (used to verify callbacks).

Keep both on your server (environment variables). Never put them in a web page or app.

```js
const { Faradpay } = require("faradpay-sdk");

const faradpay = new Faradpay({
  apiKey: process.env.FARADPAY_API_KEY,
  ipnSecret: process.env.FARADPAY_IPN_SECRET, // only needed to verify callbacks
});
```

## Accept a payment

```js
const payment = await faradpay.createPayment({
  priceAmount: 10,
  priceCurrency: "USDTBSC",
  payCurrency: "USDTBSC",
  orderId: "ORDER-1001",                          // optional, unique per merchant
  orderDescription: "Deposit (Online)",           // optional
  ipnCallbackUrl: "https://your-site.com/ipn",    // optional, https only
});

// Show the customer: payment.payAddress, payment.payCurrency, payment.priceAmount
// Valid until payment.expiresAt (6 hours)

const { status } = await faradpay.getPayment(payment.paymentId);
// waiting | confirming | partial | finished | failed | expired
```

Credit your customer only after a **verified `finished` callback**.

## Send a payout

```js
// If "Registered addresses only" is ON in your panel, register the address first:
await faradpay.addAddress({ externalId: "user_123", currency: "USDTBSC", address: "0x..." });

const batch = await faradpay.createPayout([
  { address: "0x...", currency: "USDTBSC", amount: 1, ipnCallbackUrl: "https://your-site.com/payout-ipn" },
]);

const result = await faradpay.getPayout(batch.batchPayoutId);
// each withdrawal: WAITING | PROCESSING | SENDING | FINISHED | FAILED
```

- Up to 100 withdrawals per request, all in the same currency.
- Amount + fee are taken from your **custody balance**. If the balance is too low the request is refused and nothing is created.

## Registered payout addresses

Register the wallet address of each of your users from your backend (`externalId` is your own user id). With **Registered addresses only** ON, payouts go only to registered, active addresses.

```js
await faradpay.addAddress({ externalId, currency, address });
await faradpay.addAddresses([{ externalId, currency, address }, ...]); // up to 100
await faradpay.updateAddress({ externalId, currency, address });       // goes through the activation delay again
await faradpay.listAddresses({ externalId, currency });                // both filters optional
await faradpay.deleteAddress({ externalId, currency });
```

## Verify callbacks (IPN)

Faradpay sends the header `X-CALLBACK-SIGNATURE`: HMAC-SHA256 of the **raw body** with your IPN secret. Verify it before trusting a callback:

```js
app.post("/ipn", express.raw({ type: "application/json" }), (req, res) => {
  if (!faradpay.verifyCallback(req.body, req.headers["x-callback-signature"])) {
    return res.status(401).end();
  }
  const event = JSON.parse(req.body.toString("utf8"));
  // Payment: event.payment_status === "finished"
  // Payout:  event.status === "FINISHED" | "FAILED"
  res.status(200).end();
});
```

Use the raw body (not `express.json()`), and make your handler idempotent (ignore a `payment_id` / `id` you already processed).

## Errors

Failed calls throw `FaradpayError` with `message`, `statusCode` and `errors`:

```js
try {
  await faradpay.createPayout([...]);
} catch (e) {
  console.log(e.statusCode, e.message, e.errors);
}
```

| Code | Meaning |
|---|---|
| 400 | Invalid request (body, amount, currency, or balance too low) |
| 401 | Missing or invalid API key |
| 403 | Not allowed: account blocked, IP not whitelisted, payouts disabled, or address not registered |
| 404 | Not found |
| 409 | Duplicate (for example the same `orderId`) |
| 429 | Too many requests |

## Examples

See [`examples/`](examples): `payment.js`, `payout.js`, `callback-express.js`.

## Test

```bash
npm test
```

## License

MIT
