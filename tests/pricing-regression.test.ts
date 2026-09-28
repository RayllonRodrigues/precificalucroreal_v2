import assert from "node:assert/strict";
import test from "node:test";
import { calcularPrecificacao, custoFixoPorVenda, type PricingInput } from "../src/lib/pricing";

const base: PricingInput = {
  custoDireto: 100,
  custoFixoVenda: 0,
  impostosPercentual: 10,
  comissaoPercentual: 0,
  taxaPercentual: 0,
  tarifaFixa: 0,
  lucroPercentual: 20,
  descontoPercentual: 0,
  modo: "ideal",
  precoAtual: 0,
  parcelas: 1,
};

test("promotional discount rejects out-of-range and non-finite values", () => {
  for (const descontoPercentual of [-1, 100.01, 150, NaN, Infinity, -Infinity]) {
    const r = calcularPrecificacao({ ...base, modo: "promocional", descontoPercentual });
    assert.ok(r.erro);
    assert.ok(r.precoSugerido >= 0 && Number.isFinite(r.precoSugerido));
  }
});
test("discount boundaries produce a non-negative price and expose loss", () => {
  assert.equal(
    calcularPrecificacao({ ...base, modo: "promocional", descontoPercentual: 0 }).precoSugerido,
    142.86,
  );
  const r = calcularPrecificacao({ ...base, modo: "promocional", descontoPercentual: 100 });
  assert.equal(r.erro, null);
  assert.equal(r.precoSugerido, 0);
  assert.equal(r.classificacao, "prejuizo");
});
test("minimum mode ignores unused profit and discount, including NaN", () => {
  for (const lucroPercentual of [95, 150, NaN, Infinity]) {
    const r = calcularPrecificacao({
      ...base,
      modo: "minimo",
      lucroPercentual,
      descontoPercentual: NaN,
    });
    assert.equal(r.erro, null);
    assert.equal(r.precoSugerido, 111.11);
  }
  assert.ok(calcularPrecificacao({ ...base, modo: "minimo", impostosPercentual: 100 }).erro);
});
test("allocation requires positive sales or an explicitly supplied manual amount", () => {
  for (const sales of [0, -1, NaN, Infinity]) {
    const custoFixoVenda = custoFixoPorVenda(3000, 0, 0, sales);
    assert.equal(custoFixoVenda, null);
    assert.ok(calcularPrecificacao({ ...base, custoFixoVenda }).erro);
  }
  assert.equal(custoFixoPorVenda(3000, 0, 0, 100), 30);
  assert.equal(calcularPrecificacao({ ...base, custoFixoVenda: 30 }).precoSugerido, 185.71);
  assert.equal(calcularPrecificacao({ ...base, custoFixoVenda: 0 }).erro, null);
});
test("non-finite costs and invalid installments cannot be saved as valid calculations", () => {
  for (const custoDireto of [NaN, Infinity, -1])
    assert.ok(calcularPrecificacao({ ...base, custoDireto }).erro);
  for (const parcelas of [0, 1.5, Infinity])
    assert.ok(calcularPrecificacao({ ...base, parcelas }).erro);
});
