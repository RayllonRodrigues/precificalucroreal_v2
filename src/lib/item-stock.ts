/** Services have no stock; product forms keep their existing numeric default. */
export function tipoDoItem(value: string): "produto" | "servico" {
  if (value !== "produto" && value !== "servico") throw new Error("Tipo de item inválido.");
  return value;
}

export function estoqueDoItem(tipo: "produto" | "servico", estoque: number | null): number | null {
  return tipo === "servico" ? null : (estoque ?? 0);
}
