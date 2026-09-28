import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { handleMercadoPagoWebhook } from "../src/lib/mercadopago-webhook";

const nowMs = 1_800_000_000_000;
const secret = "test-only";
function request(
  method = "POST",
  timestamp = nowMs,
  signingSecret = secret,
  query = "data.id=123",
) {
  const digest = createHmac("sha256", signingSecret)
    .update(`id:123;request-id:test;ts:${timestamp};`)
    .digest("hex");
  return new Request(`http://localhost/api/public/mercadopago?${query}`, {
    method,
    headers: { "x-request-id": "test", "x-signature": `ts=${timestamp},v1=${digest}` },
    ...(method === "POST"
      ? { body: JSON.stringify({ data: { id: "999" }, status: "approved" }) }
      : {}),
  });
}
test("GET, invalid signatures, stale/future timestamps and ambiguous ids never process", async () => {
  let calls = 0;
  const deps = {
    secrets: [secret],
    toleranceSeconds: 300,
    nowMs,
    confirmPayment: async () => {
      calls++;
    },
  };
  for (const req of [
    request("GET"),
    request("POST", nowMs, "invalid"),
    request("POST", nowMs - 301_000),
    request("POST", nowMs + 301_000),
    request("POST", nowMs, secret, "data.id=123&data.id=999"),
  ]) {
    assert.ok((await handleMercadoPagoWebhook(req, deps)).status >= 400);
  }
  assert.equal(calls, 0);
});
test("valid notifications use only signed id and repeat through the idempotent processor", async () => {
  const calls: string[] = [];
  const deps = {
    secrets: [secret],
    toleranceSeconds: 300,
    nowMs,
    confirmPayment: async (id: string) => {
      calls.push(id);
    },
  };
  assert.equal((await handleMercadoPagoWebhook(request(), deps)).status, 200);
  assert.equal((await handleMercadoPagoWebhook(request(), deps)).status, 200);
  assert.deepEqual(calls, ["123", "123"]);
});
test("missing configuration and processor failures produce retryable errors", async () => {
  const deps = {
    secrets: [secret],
    toleranceSeconds: 300,
    nowMs,
    confirmPayment: async () => {
      throw new Error("private provider detail");
    },
  };
  const res = await handleMercadoPagoWebhook(request(), deps);
  assert.equal(res.status, 503);
  assert.doesNotMatch(await res.text(), /private/);
  assert.equal((await handleMercadoPagoWebhook(request(), { ...deps, secrets: [] })).status, 503);
});
