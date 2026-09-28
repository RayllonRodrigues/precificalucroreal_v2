# Baseline e validação de homologação — 28/09/2026

## Validação pública Railway — estado atual

Destino exclusivo: `https://precificalucroreal.up.railway.app`, homologação
`adkfebcanubebtmqyram`. Nenhuma alteração de código, ambiente, schema ou migrations;
produção não acessada. Nenhum usuário criado e nenhum fluxo de email/senha executado.

| Item | Estado atual |
| --- | --- |
| Railway público | **BLOQUEADO** — aplicação retorna HTTP 502 |
| Auth Hook remoto | **APROVADO** — evidência remota anterior preservada |
| Signup bloqueado | **APROVADO** — teste anterior HTTP 403; flag false reconfirmada por leitura nesta rodada; fluxo público Railway bloqueado pelo 502 |
| Signup habilitado | **ADIADO** |
| Confirmação de email | **ADIADO** |
| Recuperação de senha | **ADIADO** |
| Redefinição de senha | **ADIADO** |
| Configuração administrativa Mercado Pago | **APROVADA** — evidências anteriores e testes locais; painel hospedado não verificável nesta rodada |
| Pagamento sandbox externo | **ADIADO** |
| IA | **REGRA DE NEGÓCIO PENDENTE** |
| Storage scheduler | **PENDÊNCIA OPERACIONAL** |

### Evidências desta rodada

- HTTPS validado pelo cliente Node com verificação padrão de certificado e hostname:
  `tlsAuthorized=true`; certificado válido até 26/12/2026. Isso comprova o TLS do
  domínio, não a saúde da aplicação atrás do proxy.
- GET `/`, `/health`, `/entrar` e `/api/public/mercadopago`: todos HTTP 502,
  `Application failed to respond`. POST com JSON vazio no webhook: também 502.
  Não há rota health no código local inspecionado; o 502 não permite verificar
  sua existência no deployment.
- HTML da aplicação, login e assets publicados: **BLOQUEADOS**. As respostas
  observadas são erros do Railway, sem segredo aparente. Não é possível aprovar
  ausência de secrets em JS/HTML hospedados que não foram servidos.
- Webhook publicado, recusa de GET e POST inválido: **BLOQUEADOS** no ambiente
  público. O código local define GET 405 e recusa segura sem webhook secret;
  o 502 do proxy não é evidência de execução dessas proteções.
- Consulta somente leitura no projeto autorizado: `permitir_cadastros=false`,
  `mercadopago_ativo=false`, token salvo ausente. Não houve alteração de flags.
- Ambiente local: `MERCADO_PAGO_ENVIRONMENT=sandbox`; Access Token e webhook secret
  ausentes. `APP_URL=http://localhost:3000` e
  `APP_URL_ALLOWLIST=http://localhost:3000`: **DIVERGENTES** do domínio público
  solicitado. Variáveis efetivas do Railway **NÃO CONFIRMADAS**; não inferidas a
  partir do ambiente local nem alteradas nesta validação.
- Callbacks são montadas server-side a partir de APP_URL e exigem allowlist.
  Com os valores locais atuais apontariam para localhost; não foi criada cobrança.
  Ausência de callbacks localhost/produção no deployment permanece bloqueada.
- Scan dos 73 arquivos de `.output/public` recém-gerados: zero arquivos com valores
  secretos conhecidos, padrão `sb_secret_` ou ref de produção
  `bjtyeikuomxudmtdxtrp`. Esta verificação é local e não substitui a inspeção remota.
- Possível incompatibilidade de deployment a investigar: `vite.config.ts` usa
  `nitro({ preset: "cloudflare-module" })` e package.json não declara `start`.
  Sem logs/comando de inicialização do Railway, isso não comprova a causa do 502.

### Validação local

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` | APROVADO, exit 0 |
| `npm run build` | APROVADO, exit 0 |
| `npm run test` — execução 1 | APROVADO, 37/37 |
| `npm run test` — execução 2 | APROVADO, 37/37 |

Logs: `homologation-public-typescript.txt`, `homologation-public-build.txt`,
`homologation-public-tests-1.txt`, `homologation-public-tests-2.txt`.

Próxima ação necessária: inspecionar logs de deployment, comando de start e porta
no Railway; confirmar APP_URL/allowlist hospedadas e ref de homologação. Após
restabelecer resposta da aplicação, repetir smoke público, assets e webhook.
Nenhuma correção de deployment foi aplicada nesta etapa. Pré-produção não aprovada;
produção não declarada pronta.

## Histórico: signup parametrizado e configuração administrativa

Nenhuma alteração de schema, RLS ou RPC; nenhuma migration reaplicada; produção não acessada.

| Item | Estado atual |
| --- | --- |
| Auth Hook remoto | **APROVADO** — ativação e confirmação remota registradas anteriormente |
| Signup bloqueado | **APROVADO** — HTTP 403, sem usuário/profile órfão |
| Signup habilitado | **PENDENTE** — HOMOLOGATION_TEST_EMAIL ausente |
| Configuração administrativa Mercado Pago | **APROVADA** no código e testes locais/integrados descritos abaixo |
| Pagamento sandbox externo | **ADIADO** por decisão do usuário |
| IA | **REGRA DE NEGÓCIO PENDENTE** |
| Storage scheduler | **PENDÊNCIA OPERACIONAL** |
| URL pública Railway | **PENDENTE** — APP_URL continua local |

### Teste de signup preparado

`scripts/test-homologation-signup.mjs` lê `HOMOLOGATION_TEST_EMAIL` e opcionalmente
`HOMOLOGATION_TEST_PASSWORD`. Sem email, registra PENDENTE e não abre cadastro.
Sem senha informada, gera uma senha forte somente em memória, sem imprimi-la.
Não inventa endereço nem reutiliza usuário existente: se o email já existir, recusa o teste.

Quando há email, o runner valida o destino e o Hook por config diff antes de habilitar
temporariamente cadastro. Faz signup público, verifica Auth/profile/metadata, aguarda
confirmação real por email e testa login/sessão. Não usa auto-confirmação administrativa
para fazer o teste passar.

Depois solicita recuperação pelo Auth hospedado. Para completar a redefinição,
`HOMOLOGATION_RECOVERY_LINK_FILE` pode apontar para um arquivo local temporário que
receberá o link efetivamente entregue por email. O runner aceita somente link recovery
do Supabase de homologação, verifica o token pelo Auth, redefine a senha e testa novo
login. Não imprime link, token, senha, email ou sessão. Sem esse link, a recuperação
completa fica PENDENTE, nunca é reportada como aprovada por simulação.

O timeout padrão de confirmação/recuperação é 120 segundos, configurável por
`HOMOLOGATION_TEST_WAIT_SECONDS` até 600 segundos. Em finalização normal, erro, SIGINT
ou SIGTERM tratado, fecha os cadastros antes de limpar o usuário marcado por um ID
único de execução e verifica remoção do profile. Como qualquer processo, não pode
executar finally após encerramento forçado do sistema/SIGKILL; se isso ocorrer,
é necessária conferência operacional de permitir_cadastros e limpeza pelo ID da execução.

Exemplo sem gravar nem mostrar senha:

```powershell
$env:HOMOLOGATION_TEST_EMAIL = Read-Host "Email dedicado de testes sob seu controle"
# Opcional: arquivo fora do repositório onde será salvo o link REAL recebido por email.
$env:HOMOLOGATION_RECOVERY_LINK_FILE = Join-Path $env:TEMP "precifica-hml-recovery-link.txt"
node scripts/test-homologation-signup.mjs
```

Use arquivo vazio/novo para cada teste e remova o arquivo de link após o uso. Não
publique tokens no chat nem no repositório. O teste habilitado não foi executado nesta
rodada, pois HOMOLOGATION_TEST_EMAIL está ausente. Evidência: `homologation-enabled-signup.json`.

### Auditoria de Administração → Pagamentos

- Leitura exige sessão válida e `is_platform_admin`; gravação passa pela mesma
  autorização antes de consultar ou persistir credencial.
- Banco nega SELECT/INSERT/UPDATE/DELETE de platform_secrets ao papel authenticated.
- A resposta de consulta contém somente status booleano e parâmetros do plano; a
  resposta de gravação contém somente `{ ok: true }`.
- O token **salvo** não volta ao browser. O novo valor digitado pelo administrador
  necessariamente existe temporariamente no input de senha para envio ao servidor;
  é limpo após sucesso. Não é serializado para outros componentes ou respostas.
- Interface indica Configurado/Não configurado, sem recuperar o segredo salvo.
- Entrada vazia/branca omite a coluna no upsert; novo valor explícito substitui.
- Ativar pagamentos sem token novo, salvo ou configurado no servidor é recusado antes
  de qualquer persistência. Pagamentos desativados recusam nova cobrança mesmo com
  fallback de token no ambiente. Ativo sem token gera erro controlado de configuração.
- A validação ocorre antes do INSERT da cobrança e antes da chamada de preferência.
- Removido log do corpo bruto da resposta do provedor; agora somente HTTP status é registrado.
- Erros de persistência retornam mensagens fixas, nunca detalhes que possam conter credenciais.

Evidências: `tests/admin-payment-contract.test.ts`,
`reports/homologation-payment-admin.json` (autorização real/ACLs + rollback) e
`reports/homologation-token-storage.json` (upsert real por PostgREST, preservação e
substituição). O teste de persistência usou valor sintético com cobrança desativada,
recusaria tocar uma configuração existente e restaurou o estado vazio original.
Nenhuma cobrança ou preferência foi criada. Não se afirma um E2E do painel implantado
no Railway: foram validados o código compartilhado pelos handlers, banco e API.

### Webhook e callbacks

`MERCADO_PAGO_WEBHOOK_SECRET` permanece exclusivamente no servidor/Railway, sem campo
no painel. A rota responde 503 sem chamar o processador quando não há secret. Testes
verificam também ausência de detalhes sensíveis na resposta. O build público não
contém valores secretos nem referências aos nomes de secrets do servidor; não há
variáveis VITE_* com segredo detectado.

Callbacks e notification_url continuam derivados de APP_URL no servidor. A allowlist
agora é obrigatória: origem ausente ou não listada é recusada. HTTPS é obrigatório
fora de localhost. O teste cobre uma origem Railway sintética, origem fora da lista
e HTTP inválido, sem se conectar a esses domínios. Nenhum domínio Railway foi inventado
como implantação existente. Quando o domínio real for disponibilizado, será necessário
confirmar APP_URL/ALLOWLIST e a configuração Supabase dessa implantação; essa validação
externa permanece pendente.

### Validação desta rodada

| Comando/verificação | Resultado |
| --- | --- |
| npx tsc --noEmit | APROVADO |
| npm run build | APROVADO |
| npm run test — primeira execução | 37 aprovados |
| npm run test — segunda execução | 37 aprovados |
| Teste integrado de administração | APROVADO, dados revertidos |
| Upsert real de token | APROVADO, credencial original restaurada |
| Teste de signup parametrizado | PENDENTE, email ausente; nenhuma abertura de cadastro |
| Auditoria de secrets no cliente | Zero ocorrências detectadas |

Estado final: permitir_cadastros=false, mercadopago_ativo=false, token salvo ausente,
MERCADO_PAGO_ENVIRONMENT=sandbox, zero usuários e profiles sintéticos. Evidência:
`homologation-admin-audit.json`. Nenhuma aprovação de produção é emitida.

---

## Histórico das etapas anteriores

> **Decisão posterior do usuário — Mercado Pago:** configuração e teste externo
> adiados. O administrador já pode cadastrar/substituir o Access Token em
> Administração → Pagamentos. O token é salvo server-side em platform_secrets,
> não é devolvido ao browser e usuários comuns não têm SELECT nessa tabela.
> A orientação indevida para usar credencial de produção foi removida da tela.
> O segredo de assinatura do webhook continua sendo configuração do servidor;
> não foi criado campo ou alterado schema para armazená-lo pelo painel.
> Cobranças permanecem desativadas e ambiente sandbox preservado. Esta decisão
> não representa aprovação do fluxo externo de pagamentos.

> **Atualização mais recente — acesso administrativo liberado:** `config diff`
> passou; foram aplicadas exclusivamente as duas propriedades do Before User Created
> Hook (enabled=true e URI da função hook_enforce_signup_enabled). O novo diff remoto
> confirmou zero alterações declaradas pendentes; 13 propriedades não declaradas
> permaneceram intactas. Signup com cadastro fechado retornou HTTP 403, zero usuários
> e zero profiles. Cadastro temporariamente aberto retornou `email_address_invalid`
> para o email sintético; confirmação/login/recuperação continuam pendentes de uma
> caixa de testes válida e acessível. `permitir_cadastros=false` foi restaurado.
> Evidência: `homologation-hosted-hook-signup.json`. **Auth Hook: APROVADO**;
> **Signup completo: BLOQUEADO**. Os registros de falta de permissão abaixo são
> históricos e foram superados nesta atualização. Nenhuma migration/schema/RLS/RPC
> foi alterada. Pré-produção continua não aprovada.

> Continuação concluída: concorrência de concessão manual corrigida e worker manual
> de Storage testado, sem alterar schema ou reaplicar migrations. Consulte a seção
> “Continuação: pendências bloqueantes” ao final para os resultados atuais.

## Destino e limites

- Projeto autorizado pelo usuário: `adkfebcanubebtmqyram`, HOMOLOGAÇÃO.
- URL: `https://adkfebcanubebtmqyram.supabase.co`.
- Conexão PostgreSQL com CA explícita, validação TLS e hostname habilitados.
- Produção `bjtyeikuomxudmtdxtrp` não foi acessada. A referência antiga em `supabase/config.toml` foi corrigida localmente.
- Inspeção inicial: nenhum objeto da aplicação em public, nenhum usuário Auth, nenhum bucket e nenhum trigger em auth.users. Evidência: `homologation-before.json`.
- Esta implementação define um NOVO schema. Não recupera nem afirma reproduzir o histórico 0000–0009.
- Migrations reconstruídas 0010–0013 não foram executadas nem modificadas; os quatro SHA-256 antes/depois coincidem.

## Baseline aplicada

`supabase/migrations/20260928132125_initial_precifica_schema_homologation.sql`

Criada pelo comando oficial `supabase migration new`. Como não existia journal histórico Drizzle recuperado, o novo histórico fica separado em `supabase/migrations`, sem importar os arquivos de recuperação.

A aplicação normal pelo CLI interrompeu na trava de homologação: o pooler não propagou a opção customizada de inicialização da sessão. A aplicação definitiva usou `scripts/apply-homologation-baseline.mjs`, que valida os destinos, define a trava dentro da transação, aplica a baseline e registra versão/nome/SQL em `supabase_migrations.schema_migrations` atomicamente. Uma tentativa intermediária falhou ao registrar o array de statements e foi integralmente revertida; a aplicação seguinte concluiu. A prévia final do CLI reconhece o banco atualizado, sem migrations pendentes.

O runner recusa histórico já preenchido e a baseline recusa schema public já preenchido. Não é um mecanismo de reset ou de atualização de bancos existentes.

## Tabelas

Todas as 14 tabelas obrigatórias foram criadas:

| Tabela | Contrato principal |
| --- | --- |
| profiles | Mesmo UUID de auth.users, email e metadata permitida; campos pessoais opcionais nullable |
| companies | Proprietário Auth, configurações financeiras, trial e licença; UUID gerado |
| company_members | FK empresa/usuário, unique empresa/usuário; único papel implementado: proprietario |
| products_services | Produto/serviço por CHECK, estoque nullable; produto exige valor não nulo |
| employees | Quantidade, salário, benefícios, encargos, outros custos e ativo |
| expenses | Categoria, valor, recorrência, vencimento opcional e ativo |
| payment_methods | Unique company_id/tipo/parcelas, taxas, prazo, ordem e ativo |
| pricing_calculations | Item opcional para cálculo manual; FK composta mantém item na mesma empresa |
| pricing_scenarios | FK composta mantém cálculo na mesma empresa |
| platform_admins | UUID do usuário Auth, acesso administrativo verificado no servidor |
| platform_settings | Singleton boolean true; defaults novos e explícitos |
| platform_secrets | Singleton server-side; sem acesso de usuários comuns |
| license_payments | Empresa, usuário opcional, valor, meses, status, provider, preference_id e init_point |
| storage_cleanup_jobs | Chave bucket/path, tentativas e último erro; server-side |

Tabela adicional privada: `precifica_private.payment_effects`, para identidade e efeitos idempotentes dos pagamentos. O inventário completo de colunas, defaults, nulabilidade, índices, constraints, ACLs, policies e corpos das funções está em `homologation-schema.json`.

## Funções, triggers e RPCs

Há 20 funções da aplicação, incluindo cinco funções privadas. Foram criados 10 triggers:

- auth.users AFTER INSERT cria profile;
- companies BEFORE INSERT persiste trial;
- companies AFTER INSERT cria membership proprietario;
- companies BEFORE INSERT/UPDATE protege campos sensíveis;
- seis triggers de UPDATE impedem mudar tenant/id nas tabelas operacionais.

| RPC | Resultado | Permissão principal |
| --- | --- | --- |
| get_my_company_context | APROVADO: contexto isolado, dados mínimos com licença expirada | authenticated |
| is_platform_admin | APROVADO: identidade própria, sem consulta arbitrária de outro usuário | authenticated |
| queue_logo_cleanup | APROVADO: rejeita logo ativo, fila idempotente | authenticated + can_write |
| delete_company_admin | APROVADO: exclusão sintética; chamada direta do cliente recusada | service_role + ator platform admin |
| process_mercado_pago_payment | APROVADO para eventos sintéticos sandbox, inclusive concorrência | service_role |
| create_company_with_payment_methods | APROVADO: owner fixado, membership/trial/formas, rollback em erro | authenticated |
| seed_company_demo | APROVADO: isolamento e preservação de taxa real | authenticated + licença + permitir_demo |
| remove_company_demo | APROVADO: preserva registros não demo | authenticated + licença |

Helpers: is_member, is_owner, can_write, tenant_license_active e can_access_logo. Funções SECURITY DEFINER usam search_path explícito e não possuem EXECUTE concedido a PUBLIC. As funções sensíveis de exclusão e pagamento não são executáveis por authenticated/anon. As funções de trigger não são RPCs públicas.

## Auth e trial

APROVADO: criação de usuário pelo Auth Admin API dispara o trigger, preenche UUID/email/nome/telefone/cpf/cnpj/cidade/uf e permite login com senha. Perfis de outras identidades ficam invisíveis; edição do próprio perfil é limitada às colunas pessoais. O teste administrativo usa service_role, assim como os handlers existentes após exigirAdmin.

BLOQUEADO: configuração hospedada do Before User Created Hook. Conector e CLI recusaram acesso administrativo ao projeto. `hook_enforce_signup_enabled` existe e foi testado diretamente: false/ausente bloqueia e true permite. Isso NÃO comprova que o Auth hospedado a invoca.

A tentativa de signup público com endereço sintético não roteável foi rejeitada por `email_address_invalid`, antes de comprovar o Hook. Signup público, envio/confirmação de email e recuperação de senha não estão aprovados.

Trial: APROVADO para dias_teste configurado, zero dias, fallback de 30 dias sem configuração, persistência de datas antigas após mudança da configuração e precedência de licença paga válida sobre trial expirado. O provisionamento agora existe no banco novo; os comentários antigos em CONTRATOS_LOCAIS.md descrevem a etapa anterior.

## RLS e Storage

- RLS habilitada nas 14 tabelas públicas. FORCE RLS=false; o bypass administrativo é restrito ao servidor e às funções verificadas.
- Dados operacionais: leitura exige membership e licença; escrita exige proprietário e licença.
- UPDATE possui USING e WITH CHECK; mudanças de company_id/id são protegidas também por trigger.
- Sem autoinscrição em memberships, promoção a platform admin ou escrita cliente de licença/pagamentos/secrets.
- Empresas expiradas conservam contexto mínimo e leitura de cobranças para renovação.
- As 62 policies, inclusive suas expressões, estão no inventário. Não havia policies antigas da aplicação a preservar.
- `logos`: privado, 2.097.152 bytes, image/png, image/jpeg e image/webp.
- APROVADO via Storage API: upload, URL assinada e download, recusa cross-tenant, MIME/tamanho, licença expirada, remoção, proteção de logo ativo e fila idempotente.
- NÃO CONFIRMÁVEL nesta rodada: worker de retry automático da fila. Foi comprovada persistência da fila; não foi criado um agendador.

## Financeiro

Provider tem default mercadopago e CHECK; o INSERT da aplicação continua enviando o provider explicitamente. preference_id não nulo é único. Meses são positivos. Pagamentos e empresas possuem FKs; efeitos financeiros impedem exclusão destrutiva do histórico por cascata.

APROVADO: aprovação, aprovação repetida, estados pendente/rejeitado/cancelado, estorno, chargeback, estorno repetido, identidade de pagamento única entre cobranças, concorrência de aprovação e de reversão, recusa de live_mode=true e impossibilidade de reviver efeito já revertido.

Reversão após uma concessão manual/sobreposta é recusada para não apagar direito de outra origem. Reconciliação dessa situação permanece manual. A baseline não inventa um histórico financeiro anterior.

Não houve chamada ao Mercado Pago nem cobrança externa: foram testados a RPC e seus efeitos com IDs sintéticos. Checkout sandbox, callbacks, assinatura real e integração externa ainda precisam de teste separado com credenciais sandbox. Os testes locais do webhook continuaram passando.

## Tipos e divergências resolvidas

- Tipos reais gerados pelo Supabase CLI em `reports/supabase-generated-types.ts`.
- Compatibilidade testada em memória antes de substituir `src/integrations/supabase/types.ts`; contrato manual anterior preservado em `reports/supabase-manual-types-before.ts`.
- O schema usa text + CHECK para tipo/modo; geração retorna string, não um enum TypeScript inventado. Três usos frontend receberam validação `tipoDoItem`; há teste local contra valores inválidos.
- Estoque nullable confirmado; item_id nullable confirmado; defaults de cobrança agora comprovados.
- provider e meses são opcionais no tipo INSERT gerado porque existem defaults físicos. A aplicação mantém o envio explícito de provider.
- O gerador descreve `delete_company_admin` como retorno string, mas SQL escalar pode retornar NULL quando não há logo; consumidores já verificam retorno truthy. Isso é limitação do tipo gerado, não garantia de non-null.
- Nenhuma alteração nas regras de precificação foi realizada.

## Testes e evidências

| Verificação | Resultado |
| --- | --- |
| Node / npm | 22.17.1 / 11.18.0 |
| npx tsc --noEmit | APROVADO |
| npm run build | APROVADO |
| npm run test | APROVADO: 26 testes |
| npm run test:security | APROVADO: 26 testes |
| tenant-isolation.sql | APROVADO, fixtures Auth sintéticas adaptadas em memória e rollback |
| payment-idempotency.sql | APROVADO, fixtures Auth + live_mode=false e rollback |
| homologation-contract.sql | APROVADO, RLS/profile/trial/grants e rollback |
| API Auth/REST/Storage | 12 grupos APROVADOS; signup/Hook BLOQUEADO |
| Concorrência financeira | 6 cenários APROVADOS |
| scripts/security-audit.sql | Executado em conexão read-only |
| tests/audit-pending-constraints.sql | Executado; zero constraints pendentes no inventário completo |
| Advisor oficial de segurança | APROVADO: nenhuma ocorrência retornada pelo CLI |
| license-and-ai-rls.sql original | BLOQUEADO: pressupõe regra histórica de cinco chamadas sem janela definida |

Não se enfraqueceram FKs/constraints para os testes. As fixtures antigas de isolamento/pagamento receberam usuários Auth sintéticos dentro da mesma transação. Os testes originais permanecem preservados. As asserções de RLS/licença foram exercitadas pelo novo teste mesmo sem executar o arquivo que exige a cota de IA.

Estado final confirmado: zero usuários Auth, empresas, cobranças, objetos logos e jobs de limpeza de teste. Permanecem somente o schema e as configurações iniciais: cadastros=false, demo=false, dias_teste=30 e Mercado Pago desativado, sem token no banco. Evidência: `homologation-final-state.json`.

## Pendências e riscos

| Severidade | Situação | Próximo passo |
| --- | --- | --- |
| Alta | Auth Hook hospedado não configurado/confirmado por falta de permissão | Autenticar CLI/conector com conta que administra este projeto; revisar config diff e ativar somente o hook |
| Alta | Signup público completo não comprovado | Após ativar Hook, testar bloqueio/abertura explícita, confirmação de email, login e profile |
| Alta | Cota de IA sem regra aprovada | Definir janela/reset/limite e concorrência; função nova retorna false até lá |
| Alta | Pagamento externo sandbox não validado | Configurar credenciais sandbox e executar fluxo checkout/webhook real de teste |
| Resolvido | Concessão manual usava read-modify-write sem proteção | Atualização condicional atômica + retry de conflito; concorrência real aprovada nesta continuação |
| Média | Reversões com concessões sobrepostas exigem reconciliação | Definir contrato de estorno sem apagar direitos de outras origens |
| Média | Worker manual comprovado; scheduler ainda não definido | Definir host, periodicidade e monitoração da operação da fila |
| Baixa | Histórico antigo irrecuperável | Manter baseline explicitamente nova; não atribuir origem histórica às decisões |

## Comandos para reproduzir em homologação

Os scripts validam project ref/URL/host e usam TLS validado; não dependem do projeto vinculado globalmente no CLI.

```powershell
node scripts/inspect-homologation.mjs
node scripts/homologation-cli.mjs preview
node scripts/homologation-cli.mjs advisors
node scripts/homologation-cli.mjs types
node scripts/test-homologation-sql.mjs
npx tsx scripts/test-homologation-api.mts
node scripts/test-homologation-payments.mjs
npx tsc --noEmit
npm run build
npm run test
npm run test:security
```

Somente para um destino autorizado vazio, a baseline é instalada por `node scripts/apply-homologation-baseline.mjs`. O script recusa reaplicação. Não executar 0010–0013 nem liberar suas travas.

Para o Hook, quando houver permissão administrativa, primeiro revisar:

```powershell
npx supabase config diff --project-ref adkfebcanubebtmqyram
npx supabase config push --project-ref adkfebcanubebtmqyram
```

O config local declara apenas o hook Before User Created. Não usar a produção como destino e não habilitar cadastros antes de confirmar a ativação hospedada.

## Continuação: pendências bloqueantes

Nenhuma migration foi criada, aplicada ou reaplicada nesta rodada. Nenhuma alteração de schema foi necessária. A correção da licença usa UPDATE condicional atômico sobre o contrato já existente.

### Auth Hook e signup

Tentativas realizadas na ordem solicitada:

1. `npx supabase config diff --project-ref adkfebcanubebtmqyram`: falhou com `ConfigDiffReadStatusError`, informando falta de permissão para visualizar a configuração.
2. Management API: não há `SUPABASE_ACCESS_TOKEN` utilizável no ambiente, nas variáveis Windows de usuário/sistema ou no arquivo convencional de token. Não foi reutilizada a secret key da aplicação como credencial administrativa.
3. Integração Supabase, get_project no ref autorizado: recusou com `You do not have permission to perform this action`.

Como o diff remoto não pôde ser revisado, **config push não foi executado**. A configuração local segue contendo somente o Hook esperado, mas isso não comprova ativação hospedada.

`permitir_cadastros=false` foi preservado. Os testes públicos de signup/confirmar email/recuperar e redefinir senha dependem da ativação do Hook e permanecem bloqueados; não se usou criação por Auth Admin como substituto desses testes. Os testes existentes de criação de profile e login via Auth Admin foram reexecutados e passaram. A ausência final de usuários/profiles sintéticos foi conferida.

Desbloqueio necessário: autenticar o CLI ou a integração com uma conta que tenha permissão de configuração **neste projeto**, repetir o diff, aplicar somente o Hook e confirmar remotamente. Secrets não devem ser enviados no chat.

### Mercado Pago sandbox real

Ambiente local: sandbox. Access token e segredo de webhook ausentes no processo/arquivos utilizados e nas variáveis Windows de usuário/sistema. `platform_secrets` continua sem token e com Mercado Pago desativado. `APP_URL` é localhost, sem endpoint HTTPS público de callback/webhook comprovado.

Não houve chamada de checkout nem pagamento externo. Não foram usadas credenciais de produção. Eventos sintéticos internos continuam sendo testes da RPC, não um teste de pagamento real sandbox.

Desbloqueio necessário: credenciais comprovadamente sandbox, comprador de teste, URL HTTPS acessível e permitida para callbacks/webhook, e acesso ao checkout de teste. Depois validar assinatura real, consulta do pagamento, duplicidade e reversão suportada. Não habilitar pagamentos reais para contornar esse bloqueio.

### Concessão manual e trial

O risco de perda de atualização foi confirmado em `liberarLicenca`: uma leitura seguida de UPDATE incondicional poderia sobrescrever a extensão realizada por um pagamento concorrente. `estenderTeste` possuía o mesmo padrão.

Correção em `src/lib/license-extension.ts`, usada pelos dois handlers:

- lê a expiração atual;
- calcula a mesma extensão anterior (meses via Date.setMonth; dias via 86.400.000 ms);
- atualiza somente se a coluna ainda contém o valor lido, usando igualdade ou IS NULL;
- se nenhuma linha foi alterada, relê e recalcula, com limite de oito conflitos;
- erro de rede/DB não é reaplicado automaticamente, pois pode haver resultado de commit desconhecido;
- mantém `exigirAdmin` e o acesso server-side existentes.

A escrita é atômica no PostgreSQL; o retry reage ao pagamento que ganhou a corrida. Não foram necessárias RPC nova, migration ou novas permissões. Remover licença continua sendo a operação explícita de zerar a data, sem mudar sua semântica.

Testes reais com a RPC de pagamento:

1. pagamento entre leitura e UPDATE da concessão: conflito detectado, releitura e soma preservada;
2. concessão antes do pagamento: ambas as extensões preservadas;
3. duas concessões e um pagamento simultâneos: soma final preservada.

Evidência: `homologation-license-concurrency.json`. O teste financeiro anterior de seis cenários também passou novamente. Reversões com direitos sobrepostos continuam recusadas para reconciliação, como antes.

### Storage cleanup

Implementado `scripts/storage-cleanup-worker.mjs`: uma passagem manual e limitada sobre a fila existente, exclusivamente no projeto fixado de homologação.

- aceita somente bucket logos e paths canônicos `<uuid>/logo-...png|jpg|jpeg|webp`;
- trava empresa antes de job, na mesma ordem das RPCs, para evitar deadlocks e proteger logo ativo;
- mantém a trava durante a remoção; nunca remove logo atualmente referenciado;
- falha incrementa attempts e conserva o job, com erro sanitizado;
- sucesso remove o job; repetição após remoção externa é segura;
- usa locks de linha/SKIP LOCKED para coordenar workers;
- chamada externa tem timeout; logs não imprimem credenciais.

`scripts/test-homologation-cleanup.mjs` passou em seis cenários: falha inicial e criação real do job, falha do worker com retenção, sucesso posterior, objeto já removido, logo ativo e dois workers concorrentes, além de validação de path/bucket. A indisponibilidade do Storage foi injetada na borda da API; banco, RPC, locks e remoção posterior foram reais em objetos sintéticos. Nenhum objeto real foi removido.

Execução manual:

```powershell
node scripts/storage-cleanup-worker.mjs
```

**Pendência operacional:** não há scheduler definido. Não foi criada tarefa automática, Cron ou Edge Function por suposição. Definir host, intervalo, credenciais seguras, monitoração e tratamento dos jobs marcados ACTIVE_LOGO/INVALID_LOGO_PATH antes de operar continuamente. O worker não descobre objetos órfãos sem job; cobre a fila já contratada pela aplicação.

### IA

**REGRA DE NEGÓCIO PENDENTE.** Inventário e proposta em [IA_REGRA_DE_NEGOCIO_PENDENTE.md](IA_REGRA_DE_NEGOCIO_PENDENTE.md). Não há chamada executável à RPC no frontend/handlers atuais. Os cinco usos aceitos são apenas uma expectativa do teste SQL antigo, sem janela definida. A função existente continua recusando consumo; nenhuma implementação de cota foi adicionada.

### Validação desta continuação

| Verificação | Resultado atual |
| --- | --- |
| npx tsc --noEmit | APROVADO |
| npm run build | APROVADO |
| npm run test — execução 1 | APROVADO: 30 testes |
| npm run test — execução 2 | APROVADO: 30 testes |
| npm run test:security | APROVADO: 30 testes |
| Scripts SQL compatíveis | APROVADOS; script antigo com cota de IA permanece bloqueado |
| API Auth Admin/REST/Storage | 12 grupos aprovados; signup público bloqueado |
| Concorrência licença | 3 cenários reais aprovados |
| Concorrência financeira anterior | 6 cenários aprovados novamente |
| Cleanup | Worker e retry aprovados; scheduler pendente |
| Advisor de segurança | APROVADO: reexecutado, nenhuma ocorrência |

Conferência final desta continuação: baseline local idêntica ao SQL registrado no banco,
quatro migrations de recuperação com SHA-256 preservado e histórico com somente a baseline
anterior. Zero usuários, profiles, empresas, pagamentos, logos e jobs de teste restantes.
`permitir_cadastros=false` e `permitir_demo=false`. Evidência:
`homologation-followup-state.json`.

Arquivos principais alterados/criados nesta rodada: `src/lib/license-extension.ts`, `src/lib/admin.functions.ts`, `tests/license-extension.test.ts`, `scripts/storage-cleanup-worker.mjs`, `scripts/test-homologation-license-concurrency.mts`, `scripts/test-homologation-cleanup.mjs` e os relatórios. Tipos gerados, baseline e migrations de recuperação foram preservados.

### Status final solicitado

| Item | Status |
| --- | --- |
| Auth Hook | **APROVADO** — ativado e confirmado remotamente; signup fechado retorna 403 sem órfãos |
| Signup | **BLOQUEADO** — depende de email válido de testes para confirmação e recuperação |
| Mercado Pago sandbox | **BLOQUEADO** — credenciais e endpoint público ausentes |
| IA | **REGRA DE NEGÓCIO PENDENTE** |
| Storage cleanup | **PENDENTE** — worker aprovado, falta scheduler/operação |
| Concorrência licença | **APROVADO** |

## Veredito

**HOMOLOGAÇÃO APROVADA COM PENDÊNCIAS**, limitada à baseline e aos cenários efetivamente testados. **Não aprovada para produção**: Auth Hook/signup, IA e integração externa de pagamentos ainda estão bloqueados ou incompletos.

**Pré-produção também não aprovada nesta continuação**: o Auth Hook foi aprovado na atualização mais recente, mas signup completo e Mercado Pago sandbox permanecem bloqueados.
