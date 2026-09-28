const MAPA: Array<[RegExp, string]> = [
  [/invalid login|invalid credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar. Verifique a caixa de entrada."],
  [/already registered|user already/i, "Este e-mail já possui cadastro. Faça login."],
  [/password should be at least/i, "A senha precisa ter ao menos 6 caracteres."],
  [
    /known to be weak|easy to guess|pwned|leaked password/i,
    "Essa senha é muito comum e já apareceu em vazamentos. Crie uma senha diferente, com letras, números e símbolos.",
  ],
  [/weak password/i, "Escolha uma senha mais forte: use letras, números e símbolos."],
  [/unable to validate email|invalid email/i, "Informe um e-mail válido."],
  [/email rate limit|over_email_send_rate_limit|too many requests|rate limit/i, "Muitas tentativas. Aguarde alguns minutos e tente de novo."],
  [/user not found/i, "Não encontramos uma conta com esse e-mail."],
  [/new password should be different/i, "A nova senha precisa ser diferente da anterior."],
  [/token has expired|invalid token|expired/i, "Este link expirou. Peça um novo."],
  [/network|fetch failed|failed to fetch/i, "Sem conexão com a internet. Tente novamente."],
  [/provider is not enabled|unsupported provider/i, "Esse modo de entrada ainda não está disponível."],
  [/signups not allowed|signup is disabled/i, "Novos cadastros estão desativados no momento."],
];

/** Converte mensagens de erro de autenticação para português. */
export function mensagemAuth(erro: unknown, padrao = "Não foi possível concluir. Tente novamente.") {
  const texto =
    typeof erro === "string" ? erro : erro instanceof Error ? erro.message : (erro as { message?: string } | null)?.message ?? "";
  if (!texto) return padrao;
  for (const [regex, msg] of MAPA) if (regex.test(texto)) return msg;
  return /[áàâãéêíóôõúçÁ-Ú]|ção|senha|e-mail/.test(texto) ? texto : padrao;
}

const MAPA_DB: Array<[RegExp, string]> = [
  [/duplicate key|already exists|unique constraint/i, "Já existe um registro com esses dados."],
  [/violates foreign key/i, "Este registro está ligado a outro e não pode ser alterado."],
  [/permission denied|row-level security|not authorized|jwt/i, "Você não tem permissão para fazer isso."],
  [/network|fetch failed|failed to fetch/i, "Sem conexão com a internet. Tente novamente."],
  [/timeout/i, "A operação demorou demais. Tente novamente."],
  [/not null|null value/i, "Preencha todos os campos obrigatórios."],
];

/** Converte erros do banco/rede para mensagens em português. */
export function mensagemErro(erro: unknown, padrao = "Não foi possível salvar. Tente novamente.") {
  const texto =
    typeof erro === "string" ? erro : erro instanceof Error ? erro.message : (erro as { message?: string } | null)?.message ?? "";
  if (!texto) return padrao;
  for (const [regex, msg] of MAPA_DB) if (regex.test(texto)) return msg;
  return /[áàâãéêíóôõúçÁ-Ú]|ção|informe|preencha/i.test(texto) ? texto : padrao;
}
