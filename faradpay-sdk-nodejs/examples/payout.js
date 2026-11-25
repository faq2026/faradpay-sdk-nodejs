// node examples/payout.js   (set FARADPAY_API_KEY first)
const { Faradpay } = require("../src");

const faradpay = new Faradpay({ apiKey: process.env.FARADPAY_API_KEY });

(async () => {
  // 1) Only if "Registered addresses only" is ON in your panel: register the address first.
  await faradpay.addAddress({
    externalId: "user_123",
    currency: "USDTBSC",
    address: "0xYourCustomerWalletAddress",
  });

  // 2) Send the payout (amount + fee are taken from your custody balance).
  const batch = await faradpay.createPayout([
    {
      address: "0xYourCustomerWalletAddress",
      currency: "USDTBSC",
      amount: 1,
      ipnCallbackUrl: "https://your-site.com/faradpay/payout-ipn", // optional
    },
  ]);
  console.log("Batch:", batch.batchPayoutId);

  // 3) Later: check it (or wait for the callback).
  const status = await faradpay.getPayout(batch.batchPayoutId);
  console.log(status.withdrawals.map((w) => w.status));
})().catch((e) => console.error(e.name, e.statusCode, e.message, e.errors));
