import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { findUniqueAccountByEmail } from "./admin-email";
import { cadastroPermitido } from "./signup-policy";
import { companyExpirationStore, extendExpiration } from "./license-extension";
import { paymentAdminStatus, savePaymentAdmin } from "./admin-payment-contract";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Garante que quem chamou é administrador da plataforma. */
async function exigirAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_platform_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error("Não foi possível verificar suas permissões.");
  if (!data) throw new Error("Acesso restrito aos administradores da plataforma.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface ContaAdmin {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  cpf: string;
  cnpj: string;
  cidade: string;
  uf: string;
  criadoEm: string;
  ultimoAcesso: string | null;
  empresas: number;
}

export interface EmpresaAdmin {
  id: string;
  nome: string;
  ramo: string;
  isDemo: boolean;
  criadoEm: string;
  trialExpiraEm: string | null;
  licencaExpiraEm: string | null;
  donoNome: string;
  donoEmail: string;
}

export interface AdminPlataforma {
  userId: string;
  email: string;
  nome: string;
  desde: string;
}

export const listarAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPlataforma[]> => {
    await exigirAdmin(context);
    const db = await admin();
    const { data: admins, error } = await db
      .from("platform_admins")
      .select("user_id, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error("Não foi possível carregar os administradores.");
    const { data: perfis } = await db.from("profiles").select("id, nome, email");
    const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p]));
    return (admins ?? []).map((a) => ({
      userId: a.user_id,
      email: perfilPorId.get(a.user_id)?.email ?? "",
      nome: perfilPorId.get(a.user_id)?.nome ?? "",
      desde: a.created_at,
    }));
  });

export const adicionarAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ email: z.string().trim().email() }).parse(data))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const db = await admin();
    const userId = await findUniqueAccountByEmail(data.email, async (page, perPage) => {
      const { data: lista, error } = await db.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error("Não foi possível verificar a conta de autenticação.");
      return lista.users;
    });

    const { error } = await db
      .from("platform_admins")
      .upsert({ user_id: userId }, { onConflict: "user_id" });
    if (error) throw new Error("Não foi possível tornar essa conta administradora.");
    return { ok: true as const };
  });

export const removerAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Você não pode remover o seu próprio acesso de administrador.");
    }
    const db = await admin();
    const { error } = await db.from("platform_admins").delete().eq("user_id", data.userId);
    if (error) throw new Error("Não foi possível remover esse administrador.");
    return { ok: true as const };
  });

export const listarContas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContaAdmin[]> => {
    await exigirAdmin(context);
    const db = await admin();

    const usuarios: Array<{
      id: string;
      email?: string | undefined;
      created_at: string;
      last_sign_in_at?: string | null;
    }> = [];
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error("Não foi possível carregar as contas.");
      usuarios.push(...data.users);
      if (data.users.length < 200) break;
    }

    const { data: perfis } = await db
      .from("profiles")
      .select("id, nome, email, telefone, cpf, cnpj, cidade, uf");
    const { data: empresas } = await db.from("companies").select("id, owner_id");

    const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p]));
    const contagem = new Map<string, number>();
    for (const e of empresas ?? []) {
      contagem.set(e.owner_id, (contagem.get(e.owner_id) ?? 0) + 1);
    }

    return usuarios
      .map((u) => {
        const p = perfilPorId.get(u.id);
        return {
          id: u.id,
          email: u.email ?? p?.email ?? "",
          nome: p?.nome ?? "",
          telefone: p?.telefone ?? "",
          cpf: p?.cpf ?? "",
          cnpj: p?.cnpj ?? "",
          cidade: p?.cidade ?? "",
          uf: p?.uf ?? "",
          criadoEm: u.created_at,
          ultimoAcesso: u.last_sign_in_at ?? null,
          empresas: contagem.get(u.id) ?? 0,
        };
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  });

export const atualizarConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        nome: z.string().trim().max(120),
        telefone: z.string().trim().max(20),
        cpf: z.string().trim().max(20).optional(),
        cnpj: z.string().trim().max(25).optional(),
        cidade: z.string().trim().max(120),
        uf: z.string().trim().max(2),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const db = await admin();
    const { error } = await db
      .from("profiles")
      .update({
        nome: data.nome,
        telefone: data.telefone || null,
        cpf: data.cpf ? data.cpf.replace(/\D/g, "") : null,
        cnpj: data.cnpj ? data.cnpj.replace(/\D/g, "") : null,
        cidade: data.cidade || null,
        uf: data.uf || null,
      })
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível salvar os dados da conta.");
    return { ok: true as const };
  });

export const excluirConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.id === context.userId) {
      throw new Error("Você não pode excluir a sua própria conta.");
    }
    const db = await admin();
    const { count, error: ownerError } = await db
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", data.id);
    if (ownerError) throw new Error("Não foi possível verificar as empresas dessa conta.");
    if ((count ?? 0) > 0) {
      throw new Error("Transfira ou exclua as empresas desta conta antes de excluir o acesso.");
    }
    const { error } = await db.auth.admin.deleteUser(data.id);
    if (error) throw new Error("Não foi possível excluir o acesso dessa conta.");
    return { ok: true as const };
  });

export const listarEmpresas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmpresaAdmin[]> => {
    await exigirAdmin(context);
    const db = await admin();

    const { data: empresas, error } = await db
      .from("companies")
      .select("id, nome, ramo, is_demo, created_at, owner_id, trial_expira_em, licenca_expira_em")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar as empresas.");

    const { data: perfis } = await db.from("profiles").select("id, nome, email");
    const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p]));

    return (empresas ?? []).map((e) => ({
      id: e.id,
      nome: e.nome,
      ramo: e.ramo ?? "",
      isDemo: e.is_demo,
      criadoEm: e.created_at,
      trialExpiraEm: e.trial_expira_em,
      licencaExpiraEm: e.licenca_expira_em,
      donoNome: perfilPorId.get(e.owner_id)?.nome ?? "",
      donoEmail: perfilPorId.get(e.owner_id)?.email ?? "",
    }));
  });

export const atualizarEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        nome: z.string().trim().min(1).max(120),
        ramo: z.string().trim().max(120),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const db = await admin();
    const { error } = await db
      .from("companies")
      .update({ nome: data.nome, ramo: data.ramo || null })
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível salvar os dados da empresa.");
    return { ok: true as const };
  });

export const excluirEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const db = await admin();

    const { data: logoPath, error } = await db.rpc("delete_company_admin", {
      _company_id: data.id,
      _actor_id: context.userId,
    });
    if (error) throw new Error("Não foi possível excluir a empresa.");

    let storageCleanupPending = false;
    if (logoPath) {
      const { error: storageError } = await db.storage.from("logos").remove([logoPath]);
      if (storageError) {
        storageCleanupPending = true;
        console.error("Logo cleanup failed after company deletion:", storageError.message);
        const { error: trackingError } = await db
          .from("storage_cleanup_jobs")
          .update({
            attempts: 1,
            last_error: storageError.message.slice(0, 500),
          })
          .eq("bucket_id", "logos")
          .eq("object_path", logoPath);
        if (trackingError)
          console.error("Failed to update Storage cleanup job:", trackingError.message);
      } else {
        const { error: trackingError } = await db
          .from("storage_cleanup_jobs")
          .delete()
          .eq("bucket_id", "logos")
          .eq("object_path", logoPath);
        if (trackingError) {
          storageCleanupPending = true;
          console.error("Failed to complete Storage cleanup job:", trackingError.message);
        }
      }
    }
    return { ok: true as const, storageCleanupPending };
  });

export interface ResumoPlataforma {
  contas: number;
  contasNovas30: number;
  empresas: number;
  empresasDemo: number;
  itens: number;
  calculos: number;
  despesas: number;
  funcionarios: number;
  formasPagamento: number;
  margemMedia: number;
  faturamentoTotal: number;
  porMes: Array<{ mes: string; contas: number; empresas: number }>;
  topEmpresas: Array<{ nome: string; calculos: number }>;
}

export const resumoPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResumoPlataforma> => {
    await exigirAdmin(context);
    const db = await admin();

    const conta = async (
      tabela: "products_services" | "expenses" | "employees" | "payment_methods",
    ) => {
      const { count } = await db.from(tabela).select("id", { count: "exact", head: true });
      return count ?? 0;
    };

    const { data: empresas } = await db
      .from("companies")
      .select("id, nome, is_demo, created_at, faturamento_mensal");
    const { data: calculos } = await db
      .from("pricing_calculations")
      .select("company_id, margem_liquida");
    const { data: perfis } = await db.from("profiles").select("id, created_at");

    const [itens, despesas, funcionarios, formasPagamento] = await Promise.all([
      conta("products_services"),
      conta("expenses"),
      conta("employees"),
      conta("payment_methods"),
    ]);

    const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const contasNovas30 = (perfis ?? []).filter(
      (p) => new Date(p.created_at).getTime() >= limite,
    ).length;

    const margens = (calculos ?? []).map((c) => Number(c.margem_liquida) || 0);
    const margemMedia = margens.length ? margens.reduce((a, b) => a + b, 0) / margens.length : 0;

    const mesesMap = new Map<string, { contas: number; empresas: number }>();
    const chave = (iso: string) => iso.slice(0, 7);
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      mesesMap.set(d.toISOString().slice(0, 7), { contas: 0, empresas: 0 });
    }
    for (const p of perfis ?? []) {
      const k = chave(p.created_at);
      if (mesesMap.has(k)) mesesMap.get(k)!.contas += 1;
    }
    for (const e of empresas ?? []) {
      const k = chave(e.created_at);
      if (mesesMap.has(k)) mesesMap.get(k)!.empresas += 1;
    }

    const porEmpresa = new Map<string, number>();
    for (const c of calculos ?? []) {
      porEmpresa.set(c.company_id, (porEmpresa.get(c.company_id) ?? 0) + 1);
    }
    const nomePorId = new Map((empresas ?? []).map((e) => [e.id, e.nome]));
    const topEmpresas = [...porEmpresa.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, qtd]) => ({ nome: nomePorId.get(id) ?? "—", calculos: qtd }));

    return {
      contas: (perfis ?? []).length,
      contasNovas30,
      empresas: (empresas ?? []).length,
      empresasDemo: (empresas ?? []).filter((e) => e.is_demo).length,
      itens,
      calculos: (calculos ?? []).length,
      despesas,
      funcionarios,
      formasPagamento,
      margemMedia,
      faturamentoTotal: (empresas ?? []).reduce(
        (soma, e) => soma + (Number(e.faturamento_mensal) || 0),
        0,
      ),
      porMes: [...mesesMap.entries()].map(([mes, v]) => ({ mes, ...v })),
      topEmpresas,
    };
  });

export interface ConfigGlobais {
  margemPadrao: number;
  impostoPadrao: number;
  comissaoPadrao: number;
  arredondamento: string;
  permitirCadastros: boolean;
  permitirDemo: boolean;
  mensagemAviso: string;
}

export const obterConfigGlobais = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConfigGlobais> => {
    await exigirAdmin(context);
    const db = await admin();
    const { data } = await db.from("platform_settings").select("*").eq("id", true).maybeSingle();
    return {
      margemPadrao: Number(data?.margem_padrao ?? 30),
      impostoPadrao: Number(data?.imposto_padrao ?? 0),
      comissaoPadrao: Number(data?.comissao_padrao ?? 0),
      arredondamento: data?.arredondamento ?? "nenhum",
      permitirCadastros: cadastroPermitido(data),
      permitirDemo: data?.permitir_demo ?? true,
      mensagemAviso: data?.mensagem_aviso ?? "",
    };
  });

export const salvarConfigGlobais = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        margemPadrao: z.number().min(0).max(999),
        impostoPadrao: z.number().min(0).max(100),
        comissaoPadrao: z.number().min(0).max(100),
        arredondamento: z.string().max(30),
        permitirCadastros: z.boolean(),
        permitirDemo: z.boolean(),
        mensagemAviso: z.string().max(300),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const db = await admin();
    const { error } = await db.from("platform_settings").upsert(
      {
        id: true,
        margem_padrao: data.margemPadrao,
        imposto_padrao: data.impostoPadrao,
        comissao_padrao: data.comissaoPadrao,
        arredondamento: data.arredondamento,
        permitir_cadastros: data.permitirCadastros,
        permitir_demo: data.permitirDemo,
        mensagem_aviso: data.mensagemAviso || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) throw new Error("Não foi possível salvar as configurações globais.");
    return { ok: true as const };
  });

/* -------------------------------------------------- licenças e pagamento */

export interface ConfigPagamento {
  mercadopagoAtivo: boolean;
  tokenConfigurado: boolean;
  precoLicenca: number;
  mesesLicenca: number;
  diasTeste: number;
}

export const obterConfigPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConfigPagamento> => {
    await exigirAdmin(context);
    const db = await admin();
    const { data: secrets } = await db
      .from("platform_secrets")
      .select("mercadopago_ativo, mercadopago_access_token")
      .eq("id", true)
      .maybeSingle();
    const { data: settings } = await db
      .from("platform_settings")
      .select("preco_licenca, meses_licenca, dias_teste")
      .eq("id", true)
      .maybeSingle();
    return {
      ...paymentAdminStatus(secrets),
      precoLicenca: Number(settings?.preco_licenca ?? 129.9),
      mesesLicenca: Number(settings?.meses_licenca ?? 12),
      diasTeste: Number(settings?.dias_teste ?? 30),
    };
  });

export const salvarConfigPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        mercadopagoAtivo: z.boolean(),
        token: z.string().trim().max(500).optional(),
        precoLicenca: z.number().min(0).max(100000),
        mesesLicenca: z.number().int().min(1).max(120),
        diasTeste: z.number().int().min(0).max(365),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return savePaymentAdmin(data, {
      authorize: () => exigirAdmin(context),
      hasToken: async () => {
        const db = await admin();
        const { data: stored, error } = await db.from("platform_secrets")
          .select("mercadopago_access_token").eq("id", true).maybeSingle();
        if (error) throw new Error("Configuration read failed");
        return Boolean(stored?.mercadopago_access_token?.trim() || process.env["MERCADO_PAGO_ACCESS_TOKEN"]?.trim());
      },
      saveSecret: async (value) => {
        const db = await admin();
        const { error } = await db.from("platform_secrets").upsert(value);
        if (error) throw new Error("Secret write failed");
      },
      saveSettings: async (value) => {
        const db = await admin();
        const { error } = await db.from("platform_settings").upsert(value);
        if (error) throw new Error("Settings write failed");
      },
    });
  });

/** Concede manualmente uma licença à empresa, a partir de hoje ou do vencimento atual. */
export const liberarLicenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), meses: z.number().int().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const db = await admin();
    const ate = await extendExpiration(
      companyExpirationStore(db, data.id, "licenca_expira_em"), data.meses, "months",
    );
    return { ok: true as const, ate };
  });

/** Remove a licença concedida, voltando a empresa para as regras do período de teste. */
export const removerLicenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const db = await admin();
    const { error } = await db
      .from("companies")
      .update({ licenca_expira_em: null })
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível remover a licença.");
    return { ok: true as const };
  });

/** Estende o período de teste gratuito da empresa. */
export const estenderTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), dias: z.number().int().min(1).max(365) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const db = await admin();
    const ate = await extendExpiration(
      companyExpirationStore(db, data.id, "trial_expira_em"), data.dias, "days",
    );
    return { ok: true as const, ate };
  });
