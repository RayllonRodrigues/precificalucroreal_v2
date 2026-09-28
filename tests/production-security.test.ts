import assert from "node:assert/strict";
import test from "node:test";
import { obterUrlCheckoutMercadoPago } from "../src/lib/licenca.server";

test("checkout URL follows the configured Mercado Pago environment", () => {
  const previous = process.env.MERCADO_PAGO_ENVIRONMENT;
  const preference = {
    init_point: "https://www.mercadopago.com/checkout",
    sandbox_init_point: "https://sandbox.mercadopago.com/checkout",
  };
  try {
    process.env.MERCADO_PAGO_ENVIRONMENT = "production";
    assert.equal(obterUrlCheckoutMercadoPago(preference), preference.init_point);
    process.env.MERCADO_PAGO_ENVIRONMENT = "sandbox";
    assert.equal(obterUrlCheckoutMercadoPago(preference), preference.sandbox_init_point);
  } finally {
    if (previous === undefined) delete process.env.MERCADO_PAGO_ENVIRONMENT;
    else process.env.MERCADO_PAGO_ENVIRONMENT = previous;
  }
});
