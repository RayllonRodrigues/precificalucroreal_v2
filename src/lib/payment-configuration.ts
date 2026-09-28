export function selectPaymentToken(
  config: { mercadopago_ativo: boolean; mercadopago_access_token: string | null } | null,
  environmentToken: string | undefined,
  forNewCharge: boolean,
): string | null {
  if (forNewCharge && config?.mercadopago_ativo !== true) return null;
  return config?.mercadopago_access_token?.trim() || environmentToken?.trim() || null;
}
