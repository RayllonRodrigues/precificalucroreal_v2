# Auditoria técnica — precificalucroreal_v2

Data: 28/09/2026. Repositório: RayllonRodrigues/precificalucroreal_v2, main.
Commit auditado: cd54690dce9d4bf64fd45a1561868e1bd961f781.
Deployment Railway: 9dfcc33f-646e-4aab-8c2b-bc91d093bd0a, SUCCESS.
URL testada: https://precificalucroreal-production.up.railway.app.

## Parecer

O runtime Node está implantado e responde, mas a aplicação não está funcional no navegador. A aprovação anterior baseada em HTTP 200 era insuficiente: o JavaScript falha após a entrega do HTML. Não considerar o ambiente pronto para uso.

## Achados, por prioridade

### 1. P1 — Configuração pública ausente derruba todas as páginas testadas

Playwright/Chromium, sessão anônima, após networkidle: `/`, `/entrar`, `/painel` e `/administracao` respondem HTTP 200, mas exibem “Não foi possível carregar esta página”. O console confirma `Error: Configure a URL e a chave pública do Supabase.`

`railway variable list --json`, com saída filtrada sem credenciais, confirmou ausência de `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O acesso ao cliente em `src/integrations/supabase/client.ts:6-8` lança a exceção; `src/hooks/useAuth.tsx:24` inicializa esse cliente no provider compartilhado.

Correção proposta: definir as variáveis públicas do projeto correto no Railway e reconstruir o deploy. Como são `import.meta.env`, apenas reiniciar o processo não substitui os valores incorporados no build. Nunca usar chave de serviço em variável VITE. Repetir teste no navegador após a correção.

### 2. P1 — Backend também está sem configuração obrigatória

Ausentes: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. A URL pode usar a alternativa pública, mas ela também está ausente. `src/integrations/supabase/client.server.ts:9-17` impede a criação do cliente privilegiado sem configuração. `src/lib/platform.functions.ts` depende desse cliente para carregar as opções públicas de cadastro.

Impacto inferido do código e das variáveis: corrigir somente o frontend não basta para liberar configuração da plataforma e operações administrativas. Nenhuma chamada direta ao banco foi feita para demonstrar o impacto.

Correção proposta: configurar os valores de servidor do projeto correto, preservando a chave de serviço exclusivamente no servidor.

### 3. P2 — Monitoramento não detecta a indisponibilidade funcional

O deployment ativo tem `serviceManifest.deploy.healthcheckPath: null`. A rota `/health` retorna HTTP 200 com `{"status":"ok"}`, ao mesmo tempo que as páginas falham no navegador.

`src/routes/health.ts:6` responde incondicionalmente; isso é válido como sinal de processo vivo, mas não comprova prontidão funcional.

Correção proposta: configurar `/health` como verificação de inicialização e adicionar validação das variáveis obrigatórias no build/boot. Incluir smoke de navegador que verifique conteúdo esperado, ausência da tela de erro e console. Não é necessário expor credenciais nem tornar a liveness dependente do banco.

### 4. P2 — Origem pública do aplicativo não configurada

`APP_URL` e `APP_URL_ALLOWLIST` estão ausentes. `src/lib/licenca.server.ts:49-70` rejeita configuração ausente ou fora da lista permitida. `src/lib/licenca.functions.ts:101-105` usa essa origem para URLs de notificação e retorno.

Impacto inferido: esse caminho de criação de cobrança ficará bloqueado mesmo depois de resolver os demais pré-requisitos. Não foi criada cobrança nem chamado o provedor de pagamentos.

Correção proposta: configurar a origem efetivamente utilizada e sua lista permitida antes de habilitar esse fluxo. A compatibilidade dos redirecionamentos de autenticação no painel do provedor não foi auditada.

### 5. P3 — Lint do código-fonte não passa

`npx eslint src --format json`: 406 erros, todos de `prettier/prettier`; 7 avisos, sendo 4 de `react-refresh/only-export-components` e 3 de `react-hooks/exhaustive-deps`.

Impacto: a etapa de qualidade falha, embora TypeScript e testes passem. Corrigir formatação em uma alteração separada e revisar os avisos. A contagem cobre `src`, não todos os arquivos do repositório.

### 6. P3 — Dependências de desenvolvimento com aviso de segurança

`npm audit --json`: 4 pacotes com severidade moderada na cadeia `drizzle-kit` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` → `esbuild`. São ocorrências relacionadas ao mesmo advisory, não quatro falhas independentes.

Advisory reportado pelo npm: https://github.com/advisories/GHSA-67mh-4wv8-2f99. O cenário descrito envolve acesso ao servidor de desenvolvimento do esbuild; a exploração no runtime publicado não foi demonstrada.

`npm audit --omit=dev --json`: zero vulnerabilidades reportadas. A correção automática sugerida pelo npm altera a versão principal do drizzle-kit; não foi aplicada.

## Verificações aprovadas

- Origem Railway: repositório v2, branch main, commit correto, deployment SUCCESS.
- Build remoto e inicialização verificados nesta sessão: `node .output/server/index.mjs`, listener em todas as interfaces na porta 8080.
- `package.json` contém o start solicitado; Nitro usa `node-server`.
- `npm test`: 37 testes aprovados, zero falhas.
- `npx tsc --noEmit`: exit 0.
- A revisão do middleware encontrou validação de usuário no servidor com `auth.getUser(token)` e cliente por requisição.
- As funções administrativas examinadas validam permissão antes de usar o cliente privilegiado.
- Há middleware CSRF explícito para server functions e bloqueio de chave privilegiada no cliente público.

Esses controles no código não comprovam configuração de RLS nem isolamento no banco implantado.

## Limitações e alterações

Não foram feitos login autenticado, cadastro, redefinição de senha, envio de e-mail, criação de cobrança, escrita em banco, execução de migrations ou testes SQL. Os fluxos autenticados estão bloqueados pela falha global observada; não foram aprovados por esta auditoria. Não foram auditados dados, políticas ou configuração remota do Supabase nem a conta Mercado Pago.

Nenhum código, variável Railway, deploy, banco ou configuração externa foi alterado durante a auditoria. Apenas este relatório e uma captura de evidência foram adicionados localmente; sem commit ou push.

Evidência visual: `audit-v2-login-error-2026-09-28.png`, capturada na URL `/entrar` após execução do JavaScript.
