/** Match the local Auth Hook: only an explicitly enabled configuration allows signup. */
export function cadastroPermitido(config: { permitir_cadastros: boolean | null } | null): boolean {
  return config?.permitir_cadastros === true;
}
