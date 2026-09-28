import assert from "node:assert/strict";
import test from "node:test";
import { selectPaymentToken } from "../src/lib/payment-configuration";

test("disabled or missing payment configuration blocks new charges even with env token", () => {
  assert.equal(
    selectPaymentToken(
      { mercadopago_ativo: false, mercadopago_access_token: "saved" },
      "env",
      true,
    ),
    null,
  );
  assert.equal(selectPaymentToken(null, "env", true), null);
});
test("existing payments can still be reconciled and active charges use credential fallback", () => {
  assert.equal(
    selectPaymentToken(
      { mercadopago_ativo: false, mercadopago_access_token: "saved" },
      "env",
      false,
    ),
    "saved",
  );
  assert.equal(
    selectPaymentToken({ mercadopago_ativo: true, mercadopago_access_token: null }, "env", true),
    "env",
  );
});
