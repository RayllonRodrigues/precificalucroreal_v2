import { round2 } from "./format";
import { buildPaymentRows } from "./payment-seed";
import { estoqueDoItem } from "./item-stock";

/** Existing examples moved unchanged to a payload; persisted by one atomic RPC. */
export function buildDemoPayload(companyId: string) {
  const products = [
    {
      company_id: companyId,
      tipo: "produto" as const,
      nome: "Bolo de pote gourmet",
      categoria: "Confeitaria",
      descricao: "Bolo de pote 250ml, sabor ninho com nutella.",
      sku: "BP-250",
      custo_aquisicao: 6.4,
      embalagem: 1.2,
      frete: 0.8,
      outros_custos: 0.5,
      estoque: 40,
      preco_atual: 18,
      is_demo: true,
    },
    {
      company_id: companyId,
      tipo: "produto" as const,
      nome: "Caneca personalizada",
      categoria: "Personalizados",
      descricao: "Caneca de cerâmica 325ml com estampa sublimada.",
      sku: "CN-325",
      custo_aquisicao: 9.9,
      embalagem: 2.5,
      frete: 3.2,
      outros_custos: 1.1,
      estoque: 25,
      preco_atual: 39.9,
      is_demo: true,
    },
    {
      company_id: companyId,
      tipo: "servico" as const,
      nome: "Consultoria de marketing digital",
      categoria: "Consultoria",
      descricao: "Diagnóstico e plano de ação para redes sociais.",
      horas: 8,
      valor_hora: 85,
      materiais: 0,
      deslocamento: 40,
      terceirizados: 0,
      outros_custos: 30,
      preco_atual: 890,
      is_demo: true,
    },
    {
      company_id: companyId,
      tipo: "servico" as const,
      nome: "Instalação elétrica residencial",
      categoria: "Serviços técnicos",
      descricao: "Instalação completa de ponto elétrico e quadro.",
      horas: 6,
      valor_hora: 70,
      materiais: 180,
      deslocamento: 60,
      terceirizados: 0,
      outros_custos: 25,
      preco_atual: 780,
      is_demo: true,
    },
  ].map((item) => ({
    custo_aquisicao: 0,
    embalagem: 0,
    frete: 0,
    horas: 0,
    valor_hora: 0,
    materiais: 0,
    deslocamento: 0,
    terceirizados: 0,
    ...item,
    estoque: estoqueDoItem(item.tipo, "estoque" in item ? (item.estoque ?? 0) : null),
    id: crypto.randomUUID(),
    ativo: true,
  }));
  const expenses = [
    {
      company_id: companyId,
      descricao: "Aluguel do ponto comercial",
      categoria: "aluguel",
      valor: 1800,
      recorrencia: "mensal",
      dia_vencimento: 5,
      is_demo: true,
    },
    {
      company_id: companyId,
      descricao: "Energia elétrica",
      categoria: "energia",
      valor: 420,
      recorrencia: "mensal",
      dia_vencimento: 12,
      is_demo: true,
    },
    {
      company_id: companyId,
      descricao: "Honorários de contabilidade",
      categoria: "contabilidade",
      valor: 350,
      recorrencia: "mensal",
      dia_vencimento: 10,
      is_demo: true,
    },
  ];
  const employees = [
    {
      company_id: companyId,
      nome: "Atendente de loja",
      salario: 1800,
      quantidade: 2,
      encargos_percentual: 38,
      beneficios: 320,
      outros_custos: 60,
      is_demo: true,
    },
    {
      company_id: companyId,
      nome: "Auxiliar de produção",
      salario: 2100,
      quantidade: 1,
      encargos_percentual: 38,
      beneficios: 280,
      outros_custos: 45,
      is_demo: true,
    },
  ];
  const calculations = products.slice(0, 3).map((item, index) => {
    const custoDireto =
      item.tipo === "produto"
        ? Number(item.custo_aquisicao) +
          Number(item.embalagem) +
          Number(item.frete) +
          Number(item.outros_custos)
        : Number(item.horas) * Number(item.valor_hora) +
          Number(item.materiais) +
          Number(item.deslocamento) +
          Number(item.terceirizados) +
          Number(item.outros_custos);
    const custoFixo = 12.5;
    const impostos = 6;
    const comissao = 2;
    const taxa = index === 0 ? 0.99 : 3.49;
    const lucro = 25;
    const base = custoDireto + custoFixo;
    const preco = round2(base / (1 - (impostos + comissao + taxa + lucro) / 100));
    const precoMin = round2(base / (1 - (impostos + comissao + taxa) / 100));
    const impostosValor = round2((preco * impostos) / 100);
    const comissaoValor = round2((preco * comissao) / 100);
    const taxaValor = round2((preco * taxa) / 100);
    const lucroLiquido = round2(
      preco - custoDireto - custoFixo - impostosValor - comissaoValor - taxaValor,
    );
    return {
      company_id: companyId,
      item_id: item.id,
      item_nome: item.nome,
      tipo: item.tipo,
      modo: "ideal" as const,
      forma_pagamento: index === 0 ? "Pix" : "Crédito à vista",
      parcelas: 1,
      custo_direto: custoDireto,
      custo_fixo_venda: custoFixo,
      impostos_percentual: impostos,
      comissao_percentual: comissao,
      taxa_percentual: taxa,
      tarifa_fixa: 0,
      lucro_percentual: lucro,
      preco_sugerido: preco,
      preco_minimo: precoMin,
      preco_atual: Number(item.preco_atual),
      valor_liquido: round2(preco - taxaValor),
      lucro_liquido: lucroLiquido,
      margem_liquida: round2((lucroLiquido / preco) * 100),
      margem_contribuicao: round2(preco - custoDireto - impostosValor - comissaoValor - taxaValor),
      markup: custoDireto > 0 ? round2(preco / custoDireto) : 0,
      classificacao: "saudavel",
      is_demo: true,
    };
  });

  return {
    products,
    expenses,
    employees,
    calculations,
    payments: buildPaymentRows(companyId, true),
  };
}
