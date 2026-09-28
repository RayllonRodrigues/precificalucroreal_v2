import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  ambientePagamentoValido,
  classificarPagamento,
  validarAssinaturaMercadoPago,
} from "../src/lib/mercadopago-security";

const secret = "test-webhook-secret";
const dataId = "123456789";
const requestId = "request-123";
const nowMs = 1_800_000_000_000;

function signature(timestamp: string, signingSecret = secret) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const hash = createHmac("sha256", signingSecret).update(manifest).digest("hex");
  return `ts=${timestamp},v1=${hash}`;
}

test("accepts a valid recent signature with current or previous secret", () => {
  const timestamp = String(nowMs);
  assert.equal(
    validarAssinaturaMercadoPago({
      signature: signature(timestamp),
      requestId,
      dataId,
      secrets: ["new-secret", secret],
      toleranceSeconds: 300,
      nowMs,
    }),
    true,
  );
});

test("rejects an otherwise valid old signature", () => {
  const timestamp = String(nowMs - 301_000);
  assert.equal(
    validarAssinaturaMercadoPago({
      signature: signature(timestamp),
      requestId,
      dataId,
      secrets: [secret],
      toleranceSeconds: 300,
      nowMs,
    }),
    false,
  );
});

test("rejects an invalid signature", () => {
  assert.equal(
    validarAssinaturaMercadoPago({
      signature: signature(String(nowMs), "wrong-secret"),
      requestId,
      dataId,
      secrets: [secret],
      toleranceSeconds: 300,
      nowMs,
    }),
    false,
  );
});

test("does not mix sandbox and production payments", () => {
  assert.equal(ambientePagamentoValido(true, "production"), true);
  assert.equal(ambientePagamentoValido(false, "production"), false);
  assert.equal(ambientePagamentoValido(false, "sandbox"), true);
  assert.equal(ambientePagamentoValido(true, "sandbox"), false);
});

test("classifies payment states conservatively", () => {
  assert.equal(classificarPagamento("approved", "accredited"), "activate");
  assert.equal(classificarPagamento("pending"), "record");
  assert.equal(classificarPagamento("rejected"), "record");
  assert.equal(classificarPagamento("refunded"), "reverse");
  assert.equal(classificarPagamento("cancelled"), "reverse");
  assert.equal(classificarPagamento("charged_back"), "reverse");
  assert.equal(classificarPagamento("approved", "partially_refunded"), "reverse");
});
