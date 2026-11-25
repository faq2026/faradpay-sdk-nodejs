// npm i express   then   node examples/callback-express.js
const express = require("express");
const { Faradpay } = require("../src");

const faradpay = new Faradpay({
  apiKey: process.env.FARADPAY_API_KEY,
  ipnSecret: process.env.FARADPAY_IPN_SECRET, // panel: Store settings -> Notification
});

const app = express();

// IMPORTANT: keep the RAW body. Do not use express.json() on this route,
// the signature is calculated on the exact bytes Faradpay sent.
app.post("/faradpay/ipn", express.raw({ type: "application/json" }), (req, res) => {
  if (!faradpay.verifyCallback(req.body, req.headers["x-callback-signature"])) {
    return res.status(401).end(); // not from Faradpay: ignore it
  }
  const event = JSON.parse(req.body.toString("utf8"));

  // Deposit callback: event.payment_status === "finished", event.order_id, event.actually_paid ...
  // Payout callback:  event.status === "FINISHED" | "FAILED", event.id, event.txHash ...
  // Make this idempotent: ignore an event.payment_id / event.id you already processed.
  console.log("Verified callback", event);

  res.status(200).end();
});

app.listen(3000, () => console.log("Listening on :3000"));
