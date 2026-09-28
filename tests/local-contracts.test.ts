import assert from "node:assert/strict";
import test from "node:test";
import { estoqueDoItem, tipoDoItem } from "../src/lib/item-stock";
import { buildDemoPayload } from "../src/lib/demo-data";
import { novaCobrancaMercadoPago, cobrancaMercadoPagoConfere } from "../src/lib/payment-contract";
import { cadastroPermitido } from "../src/lib/signup-policy";
import { statusLicenca, DIAS_TESTE_PADRAO } from "../src/lib/licenca";
import type { TablesInsert, TablesUpdate, Tables } from "../src/integrations/supabase/types";

test("database text item type is validated without inventing an enum", () => {
  assert.equal(tipoDoItem("produto"), "produto");
  assert.equal(tipoDoItem("servico"), "servico");
  assert.throws(() => tipoDoItem("desconhecido"));
});

test("product stock remains numeric; services persist null in forms, duplication and demo", () => {
  const produto: TablesInsert<"products_services"> = {
    company_id: "tenant",
    nome: "Produto",
    tipo: "produto",
    estoque: estoqueDoItem("produto", 12),
  };
  const servico: TablesInsert<"products_services"> = {
    company_id: "tenant",
    nome: "Servico",
    tipo: "servico",
    estoque: estoqueDoItem("servico", 12),
  };
  const update: TablesUpdate<"products_services"> = { estoque: null };
  const row: Pick<Tables<"products_services">, "estoque"> = { estoque: null };
  assert.equal(produto.estoque, 12);
  assert.equal(servico.estoque, null);
  assert.equal(update.estoque, row.estoque);
  assert.equal(estoqueDoItem("produto", null), 0);
  for (const item of buildDemoPayload("tenant").products) {
    if (item.tipo === "servico") assert.equal(item.estoque, null);
    else assert.equal(typeof item.estoque, "number");
  }
});

test("Mercado Pago insert explicitly supplies provider and pending state", () => {
  const input = { company_id: "tenant", user_id: "user", valor: 129.9, meses: 12 };
  assert.deepEqual(novaCobrancaMercadoPago(input), {
    ...input,
    provider: "mercadopago",
    status: "pendente",
  });
  // Fixed fields cannot be overridden by an object containing extra runtime keys.
  assert.equal(
    novaCobrancaMercadoPago({ ...input, ...{ provider: "other" } }).provider,
    "mercadopago",
  );
});

test("payment verification refuses another provider, missing charge and amount mismatch", () => {
  assert.equal(cobrancaMercadoPagoConfere({ provider: "other", valor: 129.9 }, 129.9), false);
  assert.equal(cobrancaMercadoPagoConfere(null, 129.9), false);
  assert.equal(cobrancaMercadoPagoConfere({ provider: "mercadopago", valor: 129.9 }, 130), false);
  assert.equal(cobrancaMercadoPagoConfere({ provider: "mercadopago", valor: 129.9 }, NaN), false);
  assert.equal(cobrancaMercadoPagoConfere({ provider: "mercadopago", valor: 129.9 }, 129.9), true);
});

test("signup is closed for absent, null or disabled configuration; explicit true enables it", () => {
  assert.equal(cadastroPermitido(null), false);
  assert.equal(cadastroPermitido({ permitir_cadastros: null }), false);
  assert.equal(cadastroPermitido({ permitir_cadastros: false }), false);
  assert.equal(cadastroPermitido({ permitir_cadastros: true }), true);
});

test("trial uses persisted backend expiration, otherwise creation plus 30 days without writes", () => {
  const company = { created_at: "2020-01-01T00:00:00.000Z", trial_expira_em: null };
  const before = { ...company };
  assert.equal(DIAS_TESTE_PADRAO, 30);
  assert.equal(statusLicenca(company).expiraEm?.toISOString(), "2020-01-31T00:00:00.000Z");
  assert.equal(
    statusLicenca({
      ...company,
      trial_expira_em: "2020-01-08T00:00:00.000Z",
    }).expiraEm?.toISOString(),
    "2020-01-08T00:00:00.000Z",
  );
  assert.equal(
    statusLicenca({ ...company, trial_expira_em: "invalid" }).expiraEm?.toISOString(),
    "2020-01-31T00:00:00.000Z",
  );
  assert.deepEqual(company, before);
});
