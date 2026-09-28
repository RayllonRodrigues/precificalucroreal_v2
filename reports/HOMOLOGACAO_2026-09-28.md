# Baseline e validação de homologação — 28/09/2026

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
| Média | Concessão manual atual é read-modify-write no servidor | Revisar atomicidade com pagamentos concorrentes antes de uso financeiro real |
| Média | Reversões com concessões sobrepostas exigem reconciliação | Definir contrato de estorno sem apagar direitos de outras origens |
| Média | Não há worker de retry de Storage comprovado | Definir operação da fila e testar falha/retry real |
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

## Veredito

**HOMOLOGAÇÃO APROVADA COM PENDÊNCIAS**, limitada à baseline e aos cenários efetivamente testados. **Não aprovada para produção**: Auth Hook/signup, IA e integração externa de pagamentos ainda estão bloqueados ou incompletos.
