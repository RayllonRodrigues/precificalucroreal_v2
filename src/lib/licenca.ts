import type { Tables } from "@/integrations/supabase/types";

export const PRECO_LICENCA_PADRAO = 129.9;
// Recovery fallback only. A persisted trial_expira_em always takes precedence.
// dias_teste provisioning must be validated server-side before it drives new trials.
export const DIAS_TESTE_PADRAO = 30;

type EmpresaLicenca = Pick<Tables<"companies">, "created_at"> & {
  trial_expira_em?: string | null;
  licenca_expira_em?: string | null;
};

export interface StatusLicenca {
  /** 'licenca' quando existe licença paga válida, 'teste' durante o período gratuito. */
  tipo: "licenca" | "teste";
  bloqueado: boolean;
  expiraEm: Date | null;
  diasRestantes: number;
}

function paraData(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function statusLicenca(empresa: EmpresaLicenca | null | undefined): StatusLicenca {
  if (!empresa) {
    return { tipo: "teste", bloqueado: false, expiraEm: null, diasRestantes: DIAS_TESTE_PADRAO };
  }

  const agora = Date.now();
  const licenca = paraData(empresa.licenca_expira_em);
  if (licenca && licenca.getTime() > agora) {
    return {
      tipo: "licenca",
      bloqueado: false,
      expiraEm: licenca,
      diasRestantes: Math.ceil((licenca.getTime() - agora) / 86_400_000),
    };
  }

  const criacao = paraData(empresa.created_at);
  const fimTeste =
    paraData(empresa.trial_expira_em) ??
    (criacao ? new Date(criacao.getTime() + DIAS_TESTE_PADRAO * 86_400_000) : null);

  if (!fimTeste) {
    return { tipo: "teste", bloqueado: false, expiraEm: null, diasRestantes: DIAS_TESTE_PADRAO };
  }

  const restantes = Math.ceil((fimTeste.getTime() - agora) / 86_400_000);
  return {
    tipo: "teste",
    bloqueado: fimTeste.getTime() <= agora,
    expiraEm: fimTeste,
    diasRestantes: Math.max(0, restantes),
  };
}
