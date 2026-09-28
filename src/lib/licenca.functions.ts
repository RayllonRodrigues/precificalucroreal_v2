import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { novaCobrancaMercadoPago } from "./payment-contract";
import { DIAS_TESTE_PADRAO } from "./licenca";

export interface PlanoLicenca {
  preco: number;
  meses: number;
  diasTeste: number;
}

/** Preço e duração da licença, definidos nas configurações globais. */
export const obterPlanoLicenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanoLicenca> => {
    const { data } = await context.supabase
      .from("platform_settings")
      .select("preco_licenca, meses_licenca")
      .eq("id", true)
      .maybeSingle();
    return {
      preco: Number(data?.preco_licenca ?? 129.9),
      meses: Number(data?.meses_licenca ?? 12),
      // Initial trial provisioning is unverified; never reinterpret existing trials
      // using the current global setting. Persisted company expiration takes precedence.
      diasTeste: DIAS_TESTE_PADRAO,
    };
  });

/** Cria a cobrança da licença anual no Mercado Pago e devolve o link de pagamento. */
export const criarPagamentoLicenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        companyId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { obterTokenMercadoPago, obterUrlAplicacao, obterUrlCheckoutMercadoPago } =
      await import("./licenca.server");
    const token = await obterTokenMercadoPago(true);
    if (!token) {
      throw new Error(
        "O pagamento ainda não está configurado. Fale com o suporte para concluir a contratação.",
      );
    }

    // Confirma que quem pediu é membro da empresa (RLS aplica-se ao cliente do usuário).
    const { data: empresa, error: erroEmpresa } = await context.supabase
      .rpc("get_my_company_context")
      .eq("id", data.companyId)
      .maybeSingle();
    if (erroEmpresa || !empresa) throw new Error("Empresa não encontrada.");

    const { data: config } = await context.supabase
      .from("platform_settings")
      .select("preco_licenca, meses_licenca")
      .eq("id", true)
      .maybeSingle();
    const preco = Number(config?.preco_licenca ?? 129.9);
    const meses = Number(config?.meses_licenca ?? 12);
    const appUrl = obterUrlAplicacao();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cobranca, error: erroCobranca } = await supabaseAdmin
      .from("license_payments")
      .insert(
        novaCobrancaMercadoPago({
          company_id: empresa.id,
          user_id: context.userId,
          valor: preco,
          meses,
        }),
      )
      .select("id")
      .single();
    if (erroCobranca || !cobranca) throw new Error("Não foi possível iniciar o pagamento.");

    const resposta = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: cobranca.id,
            title: `Licença Precifica - ${meses} meses`,
            description: `Acesso completo do Precifica para ${empresa.nome}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: preco,
          },
        ],
        external_reference: cobranca.id,
        notification_url: new URL("/api/public/mercadopago", appUrl).toString(),
        back_urls: {
          success: new URL("/licenca?pagamento=sucesso", appUrl).toString(),
          pending: new URL("/licenca?pagamento=pendente", appUrl).toString(),
          failure: new URL("/licenca?pagamento=falhou", appUrl).toString(),
        },
        auto_return: "approved",
      }),
    });

    if (!resposta.ok) {
      console.error("Mercado Pago:", resposta.status, await resposta.text());
      throw new Error("Não foi possível abrir o pagamento. Tente novamente em instantes.");
    }

    const pref = (await resposta.json()) as {
      id: string;
      init_point?: string;
      sandbox_init_point?: string;
    };
    const url = obterUrlCheckoutMercadoPago(pref);
    if (!url) throw new Error("Não foi possível abrir o pagamento.");

    const { error: erroPreferencia } = await supabaseAdmin
      .from("license_payments")
      .update({ preference_id: pref.id, init_point: url })
      .eq("id", cobranca.id);
    if (erroPreferencia) throw new Error("Não foi possível persistir a preferência de pagamento.");

    return { url };
  });

/** Confirma no Mercado Pago se a última cobrança foi paga e libera o acesso. */
export const conferirPagamentoLicenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ companyId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ liberado: boolean }> => {
    const { obterTokenMercadoPago, confirmarPagamentoMercadoPago } =
      await import("./licenca.server");
    const token = await obterTokenMercadoPago();
    const { data: membro } = await context.supabase
      .rpc("get_my_company_context")
      .eq("id", data.companyId)
      .maybeSingle();
    if (!membro) throw new Error("Empresa não encontrada.");
    if (!token) return { liberado: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cobrancas } = await supabaseAdmin
      .from("license_payments")
      .select("id, meses, status")
      .eq("company_id", data.companyId)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(5);

    for (const cobranca of cobrancas ?? []) {
      const busca = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${cobranca.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!busca.ok) continue;
      const resultado = (await busca.json()) as { results?: Array<{ id: number; status: string }> };
      const aprovado = (resultado.results ?? []).find((p) => p.status === "approved");
      if (!aprovado) continue;

      const confirmacao = await confirmarPagamentoMercadoPago(String(aprovado.id));
      if (confirmacao.ok) return { liberado: true };
    }

    return { liberado: false };
  });
