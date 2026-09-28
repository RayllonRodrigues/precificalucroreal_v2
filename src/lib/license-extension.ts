import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type ExpirationColumn = "licenca_expira_em" | "trial_expira_em";
export interface ExpirationStore {
  read(): Promise<string | null>;
  compareAndSet(previous: string | null, next: string): Promise<boolean>;
}

/** The conditional UPDATE is atomic; a competing payment causes a fresh read.
 * Only confirmed zero-row conflicts are retried. Network/DB errors are not replayed.
 */
export async function extendExpiration(
  store: ExpirationStore,
  amount: number,
  unit: "months" | "days",
  now: () => Date = () => new Date(),
): Promise<string> {
  if (!Number.isInteger(amount) || amount < 1 || amount > (unit === "months" ? 120 : 365)) {
    throw new Error("Período de extensão inválido.");
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const previous = await store.read();
    const current = previous ? new Date(previous) : null;
    const clock = now();
    const next = new Date(current && current > clock ? current : clock);
    // Preserve the existing JS calendar-month and exact-day behavior.
    if (unit === "months") next.setMonth(next.getMonth() + amount);
    else next.setTime(next.getTime() + amount * 86_400_000);
    const value = next.toISOString();
    if (await store.compareAndSet(previous, value)) return value;
  }
  throw new Error("A licença foi alterada simultaneamente. Tente novamente.");
}

/** Server-side caller must verify platform-admin authorization before using this. */
export function companyExpirationStore(
  db: SupabaseClient<Database>, companyId: string, column: ExpirationColumn,
): ExpirationStore {
  return {
    async read() {
      const { data, error } = await db.from("companies")
        .select("licenca_expira_em, trial_expira_em").eq("id", companyId).maybeSingle();
      if (error) throw new Error("Não foi possível consultar a licença.");
      if (!data) throw new Error("Empresa não encontrada.");
      return data[column];
    },
    async compareAndSet(previous, next) {
      const values = column === "licenca_expira_em"
        ? { licenca_expira_em: next } : { trial_expira_em: next };
      const update = db.from("companies").update(values).eq("id", companyId);
      const filtered = previous === null ? update.is(column, null) : update.eq(column, previous);
      const { data, error } = await filtered.select("id").maybeSingle().retry(false);
      if (error) throw new Error("Não foi possível atualizar a licença.");
      return data !== null;
    },
  };
}
