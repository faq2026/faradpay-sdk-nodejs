const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const { Faradpay } = require("../src");

const fp = new Faradpay({ apiKey: "k", ipnSecret: "secret" });
const body = JSON.stringify({ id: "1", status: "FINISHED", amount: 0.6 });
const sig = crypto.createHmac("sha256", "secret").update(body).digest("hex");

test("accepts a correct signature", () => assert.strictEqual(fp.verifyCallback(body, sig), true));
test("rejects a changed body", () => assert.strictEqual(fp.verifyCallback(body + " ", sig), false));
test("rejects a wrong or missing signature", () => {
  assert.strictEqual(fp.verifyCallback(body, "abc"), false);
  assert.strictEqual(fp.verifyCallback(body, undefined), false);
});
