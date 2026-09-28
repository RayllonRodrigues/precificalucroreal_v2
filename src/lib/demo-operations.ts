import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import { buildDemoPayload } from "./demo-data";
import { buildPaymentRows } from "./payment-seed";

/** One RPC per operation: the database transaction rolls back on any failure. */
export function companyOperations(db: SupabaseClient<Database>) {
  return {
    async create(values: Omit<TablesInsert<"companies">, "owner_id">) {
      const { data, error } = await db.rpc("create_company_with_payment_methods", {
        _company: values,
        // The RPC supplies the new company ID. An empty string fails UUID parsing.
        _payment_methods: buildPaymentRows("", false).map(({ company_id: _companyId, ...method }) => method),
      });
      if (error) throw error;
      if (!data) throw new Error("Não foi possível criar a empresa.");
      return data;
    },
    async seed(companyId: string) {
      const { error } = await db.rpc("seed_company_demo", {
        _company_id: companyId,
        _payload: buildDemoPayload(companyId),
      });
      if (error) throw error;
    },
    async remove(companyId: string) {
      const { error } = await db.rpc("remove_company_demo", { _company_id: companyId });
      if (error) throw error;
    },
  };
}
