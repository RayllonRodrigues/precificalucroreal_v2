export interface PaymentAdminInput {
  mercadopagoAtivo: boolean;
  token?: string | undefined;
  precoLicenca: number;
  mesesLicenca: number;
  diasTeste: number;
}
interface PaymentAdminDependencies {
  authorize: () => Promise<void>;
  hasToken: () => Promise<boolean>;
  saveSecret: (value: { id: true; mercadopago_ativo: boolean; updated_at: string; mercadopago_access_token?: string }) => Promise<void>;
  saveSettings: (value: { id: true; preco_licenca: number; meses_licenca: number; dias_teste: number }) => Promise<void>;
}
/** Never returns the submitted or stored credential. Empty input preserves it. */
export async function savePaymentAdmin(input: PaymentAdminInput, deps: PaymentAdminDependencies) {
  await deps.authorize();
  const token = input.token?.trim();
  if (input.mercadopagoAtivo && !token) {
    let configured = false;
    try { configured = await deps.hasToken(); }
    catch { throw new Error("Não foi possível verificar a configuração de pagamento."); }
    if (!configured) throw new Error("Configuração incompleta: informe o Access Token antes de ativar pagamentos.");
  }
  try {
    await deps.saveSecret({ id: true, mercadopago_ativo: input.mercadopagoAtivo,
      updated_at: new Date().toISOString(), ...(token ? { mercadopago_access_token: token } : {}) });
  } catch { throw new Error("Não foi possível salvar a credencial de pagamento."); }
  try {
    await deps.saveSettings({ id: true, preco_licenca: input.precoLicenca,
      meses_licenca: input.mesesLicenca, dias_teste: input.diasTeste });
  } catch { throw new Error("Não foi possível salvar o plano da licença."); }
  return { ok: true as const };
}

export function paymentAdminStatus(secret: {mercadopago_ativo: boolean; mercadopago_access_token: string | null} | null) {
  return { mercadopagoAtivo: secret?.mercadopago_ativo ?? false,
    tokenConfigurado: Boolean(secret?.mercadopago_access_token?.trim()) };
}
