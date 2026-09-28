import { companyOperations } from "./demo-operations";
import { buildPaymentRows } from "./payment-seed";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { RECORRENCIA_DIVISOR } from "./constants";
import { custoMensalFuncionario, custoFixoPorVenda } from "./pricing";
import { round2 } from "./format";

export type Company = Tables<"companies">;
export type Item = Tables<"products_services">;
export type Employee = Tables<"employees">;
export type Expense = Tables<"expenses">;
export type PaymentMethod = Tables<"payment_methods">;
export type Calculation = Tables<"pricing_calculations">;

/* -------------------------------------------------- empresa */

export function useCompany() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["company", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Company | null> => {
      const { data, error } = await supabase.rpc("get_my_company_context");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

/** URL temporária da logo guardada no armazenamento privado. */
export function useCompanyLogo(path: string | null | undefined) {
  return useQuery({
    queryKey: ["company-logo", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from("logos")
        .createSignedUrl(path as string, 60 * 60 * 24);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}

export function useUploadCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      file,
      oldPath,
    }: {
      companyId: string;
      file: File;
      oldPath?: string | null;
    }) => {
      const extensions: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const ext = extensions[file.type];
      if (!ext) throw new Error("Envie uma imagem PNG, JPEG ou WebP.");
      if (file.size <= 0 || file.size > 2 * 1024 * 1024) {
        throw new Error("A logo deve ter no máximo 2 MB.");
      }
      const path = `${companyId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("companies")
        .update({ logo_url: path })
        .eq("id", companyId);
      if (error) {
        const { error: cleanupError } = await supabase.storage.from("logos").remove([path]);
        if (cleanupError) console.error("Failed to remove orphan logo:", cleanupError.message);
        throw error;
      }
      let cleanupPending = false;
      if (oldPath && oldPath !== path) {
        const { error: removeError } = await supabase.storage.from("logos").remove([oldPath]);
        if (removeError) {
          const { error: queueError } = await supabase.rpc("queue_logo_cleanup", {
            _company_id: companyId,
            _object_path: oldPath,
          });
          if (queueError)
            throw new Error(
              "A logo foi atualizada, mas a limpeza pendente não pôde ser registrada.",
            );
          cleanupPending = true;
        }
      }
      return { path, cleanupPending };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useRemoveCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, path }: { companyId: string; path: string | null }) => {
      const { error } = await supabase
        .from("companies")
        .update({ logo_url: null })
        .eq("id", companyId);
      if (error) throw error;
      let cleanupPending = false;
      if (path) {
        const { error: storageError } = await supabase.storage.from("logos").remove([path]);
        if (storageError) {
          const { error: queueError } = await supabase.rpc("queue_logo_cleanup", {
            _company_id: companyId,
            _object_path: path,
          });
          if (queueError)
            throw new Error("A logo foi removida, mas a limpeza pendente não pôde ser registrada.");
          cleanupPending = true;
        }
      }
      return { cleanupPending };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Omit<TablesInsert<"companies">, "owner_id">) => {
      if (!user) throw new Error("Sessão necessária para criar a empresa.");
      return companyOperations(supabase).create(values);
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<"companies"> }) => {
      const { data, error } = await supabase
        .from("companies")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* -------------------------------------------------- coleções genéricas */

type TableName =
  "products_services" | "employees" | "expenses" | "payment_methods" | "pricing_calculations";

function useCollection<T>(table: TableName, companyId: string | undefined, order = "created_at") {
  return useQuery({
    queryKey: [table, companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("company_id", companyId!)
        .order(order, { ascending: table !== "pricing_calculations" });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export const useItems = (companyId?: string) => useCollection<Item>("products_services", companyId);
export const useEmployees = (companyId?: string) => useCollection<Employee>("employees", companyId);
export const useExpenses = (companyId?: string) => useCollection<Expense>("expenses", companyId);
export const usePaymentMethods = (companyId?: string) =>
  useCollection<PaymentMethod>("payment_methods", companyId, "ordem");
export const useCalculations = (companyId?: string) =>
  useCollection<Calculation>("pricing_calculations", companyId);

export function useSaveRow<TName extends TableName>(table: TName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | null; values: Record<string, unknown> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = supabase.from(table) as any;
      if (id) {
        const { error } = await query.update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await query.insert(values).select("id").single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteRow(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* -------------------------------------------------- derivados */

export function despesaMensalizada(expense: Expense): number {
  const divisor = RECORRENCIA_DIVISOR[expense.recorrencia] ?? 1;
  return round2(Number(expense.valor) / divisor);
}

export function totalDespesasMensais(expenses: Expense[] | undefined): number {
  return round2(
    (expenses ?? []).filter((e) => e.ativo).reduce((sum, e) => sum + despesaMensalizada(e), 0),
  );
}

export function totalFolhaMensal(employees: Employee[] | undefined): number {
  return round2(
    (employees ?? [])
      .filter((e) => e.ativo)
      .reduce(
        (sum, e) =>
          sum +
          custoMensalFuncionario({
            quantidade: e.quantidade,
            salario: Number(e.salario),
            beneficios: Number(e.beneficios),
            outros_custos: Number(e.outros_custos),
            encargos_percentual: Number(e.encargos_percentual),
          }),
        0,
      ),
  );
}

export interface Indicadores {
  despesas: number;
  folha: number;
  proLabore: number;
  custoFixoTotal: number;
  custoFixoPorVenda: number | null;
  ticketMedio: number;
  margemMedia: number;
  lucroMedio: number;
  indiceMargemMedio: number;
  pontoEquilibrio: number | null;
}

export function calcularIndicadores(
  company: Company | null | undefined,
  expenses: Expense[] | undefined,
  employees: Employee[] | undefined,
  calcs: Calculation[] | undefined,
): Indicadores {
  const despesas = totalDespesasMensais(expenses);
  const folha = totalFolhaMensal(employees);
  const proLabore = Number(company?.pro_labore ?? 0);
  const custoFixoTotal = round2(despesas + folha + proLabore);
  const vendas = company?.vendas_mensais ?? 0;
  const lista = calcs ?? [];
  const ticketMedio = lista.length
    ? round2(lista.reduce((s, c) => s + Number(c.preco_sugerido), 0) / lista.length)
    : 0;
  const margemMedia = lista.length
    ? round2(lista.reduce((s, c) => s + Number(c.margem_liquida), 0) / lista.length)
    : 0;
  const lucroMedio = lista.length
    ? round2(lista.reduce((s, c) => s + Number(c.lucro_liquido), 0) / lista.length)
    : 0;
  const indices = lista
    .filter((c) => Number(c.preco_sugerido) > 0)
    .map((c) => Number(c.margem_contribuicao) / Number(c.preco_sugerido))
    .filter((v) => v > 0);
  const indiceMargemMedio = indices.length
    ? round2(indices.reduce((s, v) => s + v, 0) / indices.length)
    : 0;

  return {
    despesas,
    folha,
    proLabore,
    custoFixoTotal,
    custoFixoPorVenda: custoFixoPorVenda(despesas, folha, proLabore, vendas),
    ticketMedio,
    margemMedia,
    lucroMedio,
    indiceMargemMedio,
    pontoEquilibrio:
      indiceMargemMedio > 0 && custoFixoTotal > 0
        ? round2(custoFixoTotal / indiceMargemMedio)
        : null,
  };
}

/* -------------------------------------------------- formas de pagamento */

export async function seedPaymentMethods(companyId: string, isDemo: boolean) {
  const { error } = await supabase
    .from("payment_methods")
    .upsert(buildPaymentRows(companyId, isDemo), {
      onConflict: "company_id,tipo,parcelas",
      ignoreDuplicates: isDemo,
    });
  if (error) throw error;
}

export function paymentLabel(pm: PaymentMethod): string {
  return pm.nome;
}

/* -------------------------------------------------- modo demonstração */

export async function seedDemoData(companyId: string) {
  await companyOperations(supabase).seed(companyId);
}

export async function removeDemoData(companyId: string) {
  await companyOperations(supabase).remove(companyId);
}
