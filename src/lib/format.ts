/** Formatação e parsing no padrão brasileiro. */

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Valores monetários são armazenados em centavos internamente ao calcular. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return currency.format(0);
  return currency.format(round2(value));
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return decimal.format(0);
  return decimal.format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0%";
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

/** Aceita "1.234,56", "1234,56", "1234.56" e retorna número. */
export function parseDecimal(input: string | number | null | undefined): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (!input) return 0;
  const cleaned = String(input)
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function applyRounding(value: number, mode: string): number {
  switch (mode) {
    case "inteiro":
      return Math.ceil(value);
    case "0.90":
      return Math.floor(value) + 0.9 >= value ? Math.floor(value) + 0.9 : Math.ceil(value) + 0.9;
    case "0.99":
      return Math.floor(value) + 0.99 >= value ? Math.floor(value) + 0.99 : Math.ceil(value) + 0.99;
    case "5":
      return Math.ceil(value / 5) * 5;
    default:
      return round2(value);
  }
}
