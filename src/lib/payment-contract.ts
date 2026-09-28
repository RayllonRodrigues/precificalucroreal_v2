import type { TablesInsert } from "@/integrations/supabase/types";

export function novaCobrancaMercadoPago(input: {
  company_id: string;
  user_id: string;
  valor: number;
  meses: number;
}): TablesInsert<"license_payments"> {
  return { ...input, provider: "mercadopago", status: "pendente" };
}

export function cobrancaMercadoPagoConfere(
  cobranca: { provider: string; valor: number } | null,
  valor: number,
): boolean {
  return (
    !!cobranca &&
    cobranca.provider === "mercadopago" &&
    Number.isFinite(valor) &&
    Number.isFinite(Number(cobranca.valor)) &&
    valor === Number(cobranca.valor)
  );
}
