export const APP_NAME = "Precifica";
export const APP_SLOGAN = "Lucro certo";

export const CATEGORIAS_DESPESA = [
  "aluguel",
  "energia",
  "água",
  "internet",
  "sistemas",
  "contabilidade",
  "marketing",
  "transporte",
  "manutenção",
  "impostos fixos",
  "outros",
] as const;

export const RECORRENCIAS = ["mensal", "bimestral", "trimestral", "semestral", "anual"] as const;

export const RECORRENCIA_DIVISOR: Record<string, number> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const RAMOS = [
  "Alimentação",
  "Artesanato",
  "Beleza e estética",
  "Comércio varejista",
  "Confecção e moda",
  "Construção e reformas",
  "Consultoria",
  "Educação",
  "Eventos",
  "Saúde e bem-estar",
  "Serviços técnicos",
  "Tecnologia",
  "Transporte",
  "Outro",
] as const;

export const REGIMES = [
  { value: "mei", label: "MEI", imposto: 0 },
  { value: "simples", label: "Simples Nacional", imposto: 6 },
  { value: "presumido", label: "Lucro Presumido", imposto: 13.33 },
  { value: "real", label: "Lucro Real", imposto: 18 },
  { value: "outro", label: "Outro / informar percentual", imposto: 0 },
] as const;

export const ARREDONDAMENTOS = [
  { value: "nenhum", label: "Sem arredondamento" },
  { value: "inteiro", label: "Valor inteiro (para cima)" },
  { value: "0.90", label: "Terminar em ,90" },
  { value: "0.99", label: "Terminar em ,99" },
  { value: "5", label: "Múltiplo de 5" },
] as const;

export interface FormaPagamentoPadrao {
  tipo: string;
  nome: string;
  parcelas: number;
  taxa: number;
  tarifa: number;
  prazo: number;
}

export const FORMAS_PAGAMENTO_PADRAO: FormaPagamentoPadrao[] = [
  { tipo: "dinheiro", nome: "Dinheiro", parcelas: 1, taxa: 0, tarifa: 0, prazo: 0 },
  { tipo: "pix", nome: "Pix", parcelas: 1, taxa: 0.99, tarifa: 0, prazo: 0 },
  { tipo: "debito", nome: "Cartão de débito", parcelas: 1, taxa: 1.99, tarifa: 0, prazo: 1 },
  { tipo: "credito", nome: "Crédito à vista", parcelas: 1, taxa: 3.49, tarifa: 0, prazo: 30 },
  ...Array.from({ length: 11 }, (_, i) => {
    const parcelas = i + 2;
    return {
      tipo: "credito_parcelado",
      nome: `Crédito ${parcelas}x`,
      parcelas,
      taxa: Number((3.99 + parcelas * 0.45).toFixed(2)),
      tarifa: 0,
      prazo: 30,
    };
  }),
];
