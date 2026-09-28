export function selectPaymentToken(
  config: { mercadopago_ativo: boolean; mercadopago_access_token: string | null } | null,
  environmentToken: string | undefined,
  forNewCharge: boolean,
): string | null {
  if (forNewCharge && config?.mercadopago_ativo !== true) return null;
  return config?.mercadopago_access_token?.trim() || environmentToken?.trim() || null;
}

export function requireNewPaymentToken(
  config: { mercadopago_ativo: boolean; mercadopago_access_token: string | null } | null,
  environmentToken: string | undefined,
): string {
  if (config?.mercadopago_ativo !== true) throw new Error("Pagamentos online estão desativados.");
  const token = selectPaymentToken(config, environmentToken, true);
  if (!token) throw new Error("Configuração de pagamento incompleta. Fale com o administrador.");
  return token;
}
