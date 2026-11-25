// node examples/payment.js   (set FARADPAY_API_KEY first)
const { Faradpay } = require("../src");

const faradpay = new Faradpay({ apiKey: process.env.FARADPAY_API_KEY });

(async () => {
  const payment = await faradpay.createPayment({
    priceAmount: 10,
    priceCurrency: "USDTBSC",
    payCurrency: "USDTBSC",
    orderId: "ORDER-" + Date.now(),
    orderDescription: "Deposit (Online)",
    ipnCallbackUrl: "https://your-site.com/faradpay/ipn", // optional, https only
  });
  console.log("Pay", payment.priceAmount, payment.payCurrency, "to", payment.payAddress);

  const status = await faradpay.getPayment(payment.paymentId);
  console.log("Status:", status.status);
})().catch((e) => console.error(e.name, e.statusCode, e.message, e.errors));
