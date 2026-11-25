"use strict";

const crypto = require("node:crypto");

class FaradpayError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.name = "FaradpayError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

class Faradpay {
  /**
   * @param {object} opts
   * @param {string} opts.apiKey      Your API key (panel: Store settings -> Keys). Keep it on your server.
   * @param {string} [opts.ipnSecret] Your IPN secret (panel: Store settings -> Notification). Needed to verify callbacks.
   * @param {string} [opts.baseUrl]   Defaults to https://gateway.faradpay.com/api
   * @param {number} [opts.timeoutMs] Request timeout, default 15000
   */
  constructor({ apiKey, ipnSecret, baseUrl = "https://gateway.faradpay.com/api", timeoutMs = 15000 } = {}) {
    if (!apiKey) throw new Error("apiKey is required");
    this.apiKey = apiKey;
    this.ipnSecret = ipnSecret;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
  }

  async _request(method, path, { body, query } = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(query || {})) if (v !== undefined) url.searchParams.set(k, v);

    const res = await fetch(url, {
      method,
      headers: {
        "x-api-key": this.apiKey,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.status === "error") {
      throw new FaradpayError(json?.message || `HTTP ${res.status}`, res.status, json?.errors);
    }
    return json.data;
  }

  // ---- Payments (pay-in) ----------------------------------------------------

  /** Creates a payment. Returns { paymentId, payAddress, payCurrency, priceAmount, expiresAt, ... } */
  createPayment({ priceAmount, priceCurrency, payCurrency, orderId, orderDescription, ipnCallbackUrl }) {
    return this._request("POST", "/payment", {
      body: { priceAmount, priceCurrency, payCurrency, orderId, orderDescription, ipnCallbackUrl },
    });
  }

  /** Returns { status, amount, currency, network, transactionHash, ... } */
  getPayment(paymentId) {
    return this._request("GET", `/payment/${encodeURIComponent(paymentId)}/status`);
  }

  // ---- Payouts (withdrawals) --------------------------------------------------

  /**
   * @param {{address:string,currency:string,amount:number,ipnCallbackUrl?:string}[]} withdrawals
   * up to 100, all in the same currency. Returns { batchPayoutId, withdrawals: [...] }
   */
  createPayout(withdrawals) {
    return this._request("POST", "/payout", { body: { withdrawals } });
  }

  getPayout(batchPayoutId) {
    return this._request("GET", `/payout/${encodeURIComponent(batchPayoutId)}/status`);
  }

  // ---- Registered payout addresses ----------------------------------------------

  addAddress({ externalId, currency, address }) {
    return this._request("POST", "/payout-address", { body: { externalId, currency, address } });
  }

  /** up to 100 items of { externalId, currency, address } */
  addAddresses(addresses) {
    return this._request("POST", "/payout-address/bulk", { body: { addresses } });
  }

  updateAddress({ externalId, currency, address }) {
    return this._request("PUT", "/payout-address", { body: { externalId, currency, address } });
  }

  listAddresses({ externalId, currency } = {}) {
    return this._request("GET", "/payout-address", { query: { externalId, currency } });
  }

  deleteAddress({ externalId, currency }) {
    return this._request("DELETE", "/payout-address", { query: { externalId, currency } });
  }

  // ---- Callbacks (IPN) ----------------------------------------------------------

  /**
   * Checks that a callback really comes from Faradpay.
   * @param {string|Buffer} rawBody  The raw request body exactly as received (NOT re-encoded JSON).
   * @param {string} signature       Value of the X-CALLBACK-SIGNATURE header.
   * @returns {boolean}
   */
  verifyCallback(rawBody, signature) {
    if (!this.ipnSecret) throw new Error("ipnSecret is required to verify callbacks");
    if (!signature || typeof signature !== "string") return false;
    const expected = crypto.createHmac("sha256", this.ipnSecret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

module.exports = { Faradpay, FaradpayError };
