import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import { companyOperations } from "../src/lib/demo-operations";
import { buildDemoPayload } from "../src/lib/demo-data";

test("company creation omits the unassigned UUID from payment methods", async () => {
  const company = { id: "created-company" };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) },
    rpc: async (name: string, args: { _payment_methods: Record<string, unknown>[] }) => {
      assert.equal(name, "create_company_with_payment_methods");
      assert.ok(args._payment_methods.length > 0);
      for (const method of args._payment_methods) {
        assert.equal(Object.hasOwn(method, "company_id"), false);
        assert.equal(method.is_demo, false);
      }
      return { data: company, error: null };
    },
  } as unknown as SupabaseClient<Database>;
  assert.equal(await companyOperations(client).create({ nome: "Empresa" }), company);
});

test("demo examples keep existing values and calculations reference newly inserted IDs", () => {
  const payload = buildDemoPayload("tenant");
  assert.equal(payload.products.length, 4);
  assert.equal(payload.expenses.length, 3);
  assert.equal(payload.employees.length, 2);
  assert.equal(payload.products[0]?.custo_aquisicao, 6.4);
  const ids = new Set(payload.products.map((p) => p.id));
  for (const calc of payload.calculations) {
    assert.ok(ids.has(calc.item_id));
    assert.ok(Number.isFinite(calc.preco_sugerido));
    assert.equal(calc.is_demo, true);
  }
  assert.equal(
    payload.payments.every((p) => p.is_demo && p.company_id === "tenant"),
    true,
  );
});
test("creation, demo seed and removal propagate errors without fallback writes or false success", async () => {
  const calls: string[] = [];
  const error = new Error("database denied operation");
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) },
    rpc: async (name: string) => {
      calls.push(name);
      return { data: null, error };
    },
  } as unknown as SupabaseClient<Database>;
  const ops = companyOperations(client);
  await assert.rejects(ops.create({ nome: "Empresa" }), /database denied/);
  await assert.rejects(ops.seed("tenant"), /database denied/);
  await assert.rejects(ops.remove("tenant"), /database denied/);
  assert.deepEqual(calls, [
    "create_company_with_payment_methods",
    "seed_company_demo",
    "remove_company_demo",
  ]);
});

test("deleted account clears only the local session and never creates a company", async () => {
  let signedOut = false;
  const client = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: { status: 403, code: "user_not_found" } }),
      signOut: async (options: { scope: string }) => {
        assert.equal(options.scope, "local");
        signedOut = true;
        return { error: null };
      },
    },
    rpc: async () => { assert.fail("Invalid account must not reach the database write"); },
  } as unknown as SupabaseClient<Database>;
  await assert.rejects(companyOperations(client).create({ nome: "Empresa" }), /sessão não é mais válida/);
  assert.equal(signedOut, true);
});

test("temporary Auth failure blocks saving without discarding the session", async () => {
  const client = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: { status: 503 } }),
      signOut: async () => { assert.fail("A temporary failure must not log the user out"); },
    },
    rpc: async () => { assert.fail("Unverified account must not reach the database write"); },
  } as unknown as SupabaseClient<Database>;
  await assert.rejects(companyOperations(client).create({ nome: "Empresa" }), /validar sua sessão/);
});
