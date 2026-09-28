import { FORMAS_PAGAMENTO_PADRAO } from "./constants";

export function buildPaymentRows(companyId: string, isDemo: boolean) {
  return FORMAS_PAGAMENTO_PADRAO.map((f, ordem) => ({
    company_id: companyId,
    tipo: f.tipo,
    nome: f.nome,
    parcelas: f.parcelas,
    taxa_percentual: f.taxa,
    tarifa_fixa: f.tarifa,
    prazo_recebimento: f.prazo,
    ordem,
    is_demo: isDemo,
  }));
}
