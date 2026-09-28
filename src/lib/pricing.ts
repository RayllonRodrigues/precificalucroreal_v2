import { round2 } from "./format";

export type PricingModo = "ideal" | "minimo" | "promocional";
export type Classificacao = "saudavel" | "atencao" | "prejuizo";

export interface PricingInput {
  custoDireto: number;
  custoFixoVenda: number | null;
  impostosPercentual: number;
  comissaoPercentual: number;
  taxaPercentual: number;
  tarifaFixa: number;
  lucroPercentual: number;
  descontoPercentual: number;
  modo: PricingModo;
  precoAtual: number;
  parcelas: number;
}

export interface PricingResult {
  erro: string | null;
  precoIdeal: number;
  precoMinimo: number;
  precoSugerido: number;
  precoAtual: number;
  diferencaAtual: number;
  custoDireto: number;
  custoFixoVenda: number;
  impostosValor: number;
  comissaoValor: number;
  taxaValor: number;
  valorLiquido: number;
  lucroLiquido: number;
  margemLiquida: number;
  margemContribuicao: number;
  indiceMargemContribuicao: number;
  markup: number;
  precoParcela: number;
  abaixoDoMinimo: boolean;
  classificacao: Classificacao;
  composicao: { nome: string; valor: number }[];
}

export function calcularCustoDiretoProduto(item: {
  custo_aquisicao: number;
  embalagem: number;
  frete: number;
  outros_custos: number;
}): number {
  return round2(
    Number(item.custo_aquisicao) +
      Number(item.embalagem) +
      Number(item.frete) +
      Number(item.outros_custos),
  );
}

export function calcularCustoDiretoServico(item: {
  horas: number;
  valor_hora: number;
  materiais: number;
  deslocamento: number;
  terceirizados: number;
  outros_custos: number;
}): number {
  return round2(
    Number(item.horas) * Number(item.valor_hora) +
      Number(item.materiais) +
      Number(item.deslocamento) +
      Number(item.terceirizados) +
      Number(item.outros_custos),
  );
}

export function custoFixoPorVenda(
  despesasMensais: number,
  folhaMensal: number,
  proLabore: number,
  vendasMensais: number,
): number | null {
  if (!Number.isFinite(vendasMensais) || vendasMensais <= 0) return null;
  if (![despesasMensais, folhaMensal, proLabore].every((v) => Number.isFinite(v) && v >= 0))
    return null;
  return round2((despesasMensais + folhaMensal + proLabore) / vendasMensais);
}

export function custoMensalFuncionario(emp: {
  quantidade: number;
  salario: number;
  beneficios: number;
  outros_custos: number;
  encargos_percentual: number;
}): number {
  return round2(
    Number(emp.quantidade) *
      (Number(emp.salario) +
        Number(emp.beneficios) +
        Number(emp.outros_custos) +
        (Number(emp.salario) * Number(emp.encargos_percentual)) / 100),
  );
}

export function calcularPrecificacao(input: PricingInput): PricingResult {
  const base = input.custoDireto + (input.custoFixoVenda ?? 0) + input.tarifaFixa;
  const somaMinimo = input.impostosPercentual + input.comissaoPercentual + input.taxaPercentual;
  const somaIdeal = somaMinimo + (input.modo === "minimo" ? 0 : input.lucroPercentual);

  const vazio = (erro: string): PricingResult => ({
    erro,
    precoIdeal: 0,
    precoMinimo: 0,
    precoSugerido: 0,
    precoAtual: input.precoAtual,
    diferencaAtual: 0,
    custoDireto: input.custoDireto,
    custoFixoVenda: input.custoFixoVenda ?? 0,
    impostosValor: 0,
    comissaoValor: 0,
    taxaValor: 0,
    valorLiquido: 0,
    lucroLiquido: 0,
    margemLiquida: 0,
    margemContribuicao: 0,
    indiceMargemContribuicao: 0,
    markup: 0,
    precoParcela: 0,
    abaixoDoMinimo: false,
    classificacao: "prejuizo",
    composicao: [],
  });

  if (input.custoFixoVenda === null) {
    return vazio(
      "Informe vendas mensais positivas para o rateio ou um custo fixo manual explícito.",
    );
  }
  const usados = [
    input.custoDireto,
    input.custoFixoVenda,
    input.tarifaFixa,
    input.impostosPercentual,
    input.comissaoPercentual,
    input.taxaPercentual,
    input.precoAtual,
  ];
  if (input.modo !== "minimo") usados.push(input.lucroPercentual);
  if (input.modo === "promocional") usados.push(input.descontoPercentual);
  if (
    !usados.every((v) => Number.isFinite(v) && v >= 0) ||
    !Number.isInteger(input.parcelas) ||
    input.parcelas < 1 ||
    !Number.isFinite(base)
  ) {
    return vazio("Informe valores finitos, não negativos e uma quantidade válida de parcelas.");
  }
  if (input.modo === "promocional" && input.descontoPercentual > 100) {
    return vazio("O desconto promocional deve estar entre 0% e 100%.");
  }
  if (somaMinimo >= 100) {
    return vazio(
      "A soma de impostos, comissão e taxa de pagamento atingiu 100%. Reduza os percentuais para calcular.",
    );
  }
  if (somaIdeal >= 100) {
    return vazio(
      "A soma de impostos, comissão, taxa e margem de lucro atingiu 100%. Reduza os percentuais para calcular.",
    );
  }
  if (base <= 0) {
    return vazio("Informe ao menos um custo para calcular o preço.");
  }

  const precoIdeal = round2(base / (1 - somaIdeal / 100));
  const precoMinimo = round2(base / (1 - somaMinimo / 100));

  let precoSugerido = precoIdeal;
  if (input.modo === "minimo") precoSugerido = precoMinimo;
  if (input.modo === "promocional") {
    precoSugerido = round2(precoIdeal * (1 - input.descontoPercentual / 100));
  }
  if (![precoIdeal, precoMinimo, precoSugerido].every((v) => Number.isFinite(v) && v >= 0)) {
    return vazio("Os valores informados excedem o limite do cálculo.");
  }

  const impostosValor = round2((precoSugerido * input.impostosPercentual) / 100);
  const comissaoValor = round2((precoSugerido * input.comissaoPercentual) / 100);
  const taxaValor = round2((precoSugerido * input.taxaPercentual) / 100 + input.tarifaFixa);
  const valorLiquido = round2(precoSugerido - taxaValor);
  const lucroLiquido = round2(
    precoSugerido -
      input.custoDireto -
      input.custoFixoVenda -
      impostosValor -
      comissaoValor -
      taxaValor,
  );
  const margemLiquida = precoSugerido > 0 ? round2((lucroLiquido / precoSugerido) * 100) : 0;
  const margemContribuicao = round2(
    precoSugerido - input.custoDireto - impostosValor - comissaoValor - taxaValor,
  );
  const indiceMargemContribuicao =
    precoSugerido > 0 ? round2(margemContribuicao / precoSugerido) : 0;
  const markup = input.custoDireto > 0 ? round2(precoSugerido / input.custoDireto) : 0;
  const abaixoDoMinimo = precoSugerido < precoMinimo;

  let classificacao: Classificacao = "saudavel";
  if (lucroLiquido < 0) classificacao = "prejuizo";
  else if (abaixoDoMinimo || margemLiquida < 5) classificacao = "atencao";

  return {
    erro: null,
    precoIdeal,
    precoMinimo,
    precoSugerido,
    precoAtual: input.precoAtual,
    diferencaAtual: round2(input.precoAtual - precoSugerido),
    custoDireto: input.custoDireto,
    custoFixoVenda: input.custoFixoVenda,
    impostosValor,
    comissaoValor,
    taxaValor,
    valorLiquido,
    lucroLiquido,
    margemLiquida,
    margemContribuicao,
    indiceMargemContribuicao,
    markup,
    precoParcela: input.parcelas > 0 ? round2(precoSugerido / input.parcelas) : precoSugerido,
    abaixoDoMinimo,
    classificacao,
    composicao: [
      { nome: "Custo direto", valor: input.custoDireto },
      { nome: "Custo fixo", valor: input.custoFixoVenda },
      { nome: "Impostos", valor: impostosValor },
      { nome: "Comissão", valor: comissaoValor },
      { nome: "Taxa de pagamento", valor: taxaValor },
      { nome: "Lucro", valor: Math.max(lucroLiquido, 0) },
    ].filter((p) => p.valor > 0),
  };
}

export const CLASSIFICACAO_LABEL: Record<Classificacao, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  prejuizo: "Prejuízo",
};
