import { selectPaymentToken } from "./payment-configuration";
import { cobrancaMercadoPagoConfere } from "./payment-contract";

/** Reconciliation may use credentials while new charges are disabled. */
export async function obterTokenMercadoPago(paraNovaCobranca = false): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("platform_secrets")
    .select("mercadopago_access_token, mercadopago_ativo")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error("Não foi possível verificar a configuração de pagamento.");
  return selectPaymentToken(data, process.env["MERCADO_PAGO_ACCESS_TOKEN"], paraNovaCobranca);
}

export function obterSegredosWebhookMercadoPago(): string[] {
  return [
    process.env["MERCADO_PAGO_WEBHOOK_SECRET"],
    process.env["MERCADO_PAGO_WEBHOOK_SECRET_PREVIOUS"],
  ]
    .map((secret) => secret?.trim())
    .filter((secret): secret is string => Boolean(secret));
}

export function obterToleranciaWebhookMercadoPago(): number {
  const configured = Number(process.env["MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS"] ?? "300");
  return Number.isInteger(configured) && configured >= 60 && configured <= 3600 ? configured : 300;
}

export function obterAmbienteMercadoPago(): "production" | "sandbox" {
  const environment = process.env["MERCADO_PAGO_ENVIRONMENT"];
  if (environment !== "production" && environment !== "sandbox") {
    throw new Error("MERCADO_PAGO_ENVIRONMENT deve ser production ou sandbox.");
  }
  return environment;
}

export function obterUrlCheckoutMercadoPago(preference: {
  init_point?: string;
  sandbox_init_point?: string;
}): string | null {
  return obterAmbienteMercadoPago() === "production"
    ? (preference.init_point ?? null)
    : (preference.sandbox_init_point ?? null);
}

export function obterUrlAplicacao(): URL {
  const configurada = process.env["APP_URL"]?.trim();
  if (!configurada) throw new Error("APP_URL não está configurada no servidor.");

  const url = new URL(configurada);
  const localhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    (!localhost && url.protocol !== "https:") ||
    (localhost && !["http:", "https:"].includes(url.protocol))
  ) {
    throw new Error("APP_URL deve usar HTTPS.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("APP_URL contém componentes não permitidos.");
  }

  const allowlist = (process.env["APP_URL_ALLOWLIST"] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => new URL(item).origin);
  if (allowlist.length > 0 && !allowlist.includes(url.origin)) {
    throw new Error("APP_URL não pertence à APP_URL_ALLOWLIST.");
  }

  return new URL(url.origin);
}

interface PagamentoMercadoPago {
  id: number;
  status: string;
  status_detail?: string | null;
  external_reference?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  live_mode: boolean;
}

/** Confirma os dados no provedor e aplica a licença em uma transação idempotente. */
export async function confirmarPagamentoMercadoPago(paymentId: string) {
  if (!/^\d+$/.test(paymentId)) return { ok: false as const };

  const token = await obterTokenMercadoPago();
  if (!token) throw new Error("Mercado Pago não está configurado.");

  const resposta = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resposta.ok) {
    console.error("Mercado Pago payment lookup:", resposta.status);
    throw new Error("Não foi possível confirmar o pagamento no Mercado Pago.");
  }

  const pagamento = (await resposta.json()) as PagamentoMercadoPago;
  const cobrancaId = pagamento.external_reference;
  if (
    String(pagamento.id) !== paymentId ||
    !cobrancaId ||
    typeof pagamento.transaction_amount !== "number" ||
    !Number.isFinite(pagamento.transaction_amount) ||
    pagamento.transaction_amount < 0 ||
    pagamento.currency_id !== "BRL" ||
    typeof pagamento.live_mode !== "boolean"
  ) {
    return { ok: false as const };
  }

  const { ambientePagamentoValido, classificarPagamento } = await import("./mercadopago-security");
  if (!ambientePagamentoValido(pagamento.live_mode, obterAmbienteMercadoPago())) {
    return { ok: false as const };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cobranca, error: erroCobranca } = await supabaseAdmin
    .from("license_payments")
    .select("id, valor, provider")
    .eq("id", cobrancaId)
    .maybeSingle();
  if (erroCobranca) throw new Error("Não foi possível consultar a cobrança para reconciliação.");
  if (!cobranca || !cobrancaMercadoPagoConfere(cobranca, pagamento.transaction_amount)) {
    return { ok: false as const };
  }

  const { data: resultado, error: erroAplicacao } = await supabaseAdmin.rpc(
    "process_mercado_pago_payment",
    {
      _charge_id: cobranca.id,
      _payment_id: paymentId,
      _provider_status: pagamento.status,
      _status_detail: pagamento.status_detail ?? "",
      _live_mode: pagamento.live_mode,
    },
  );
  if (erroAplicacao) throw new Error("Não foi possível aplicar a licença paga.");

  const acao = classificarPagamento(pagamento.status, pagamento.status_detail);
  return {
    ok: acao === "activate" && (resultado === "activated" || resultado === "duplicate"),
    resultado,
  } as const;
}
