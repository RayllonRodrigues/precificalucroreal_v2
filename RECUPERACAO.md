# Recuperação técnica local — 25/09/2026

Pasta oficial: `C:\Users\Rayllon\Documents\precificalucroreal`.

## Estado e limites

**ESTRUTURA LOCAL RECUPERADA.** Os módulos de aplicação voltaram a compilar.
Isso não significa banco recuperado nem integração homologada. Os SQLs 0010–0013
são reconstruções dos contratos disponíveis, não cópias dos arquivos originais.
Nenhum acesso ao Supabase, execução SQL, migration remota ou alteração de dados
reais foi realizado. `.env` não foi alterado e seus valores não são documentados aqui.

Não foi usada uma segunda pasta nem criada uma cópia consolidada nesta etapa:
a autorização posterior definiu esta pasta como base para correção direta.

## Arquivos recriados

- `src/integrations/supabase/client.ts`: cliente browser, configuração pública,
  validação contra uso de chave privilegiada e inicialização tardia.
- `src/integrations/supabase/client.server.ts`: cliente administrativo restrito ao
  servidor e cliente por requisição com token do usuário, sem sessão compartilhada.
- `src/integrations/supabase/lazy-client.ts`: inicialização sob demanda.
- `src/integrations/supabase/auth-attacher.ts`: encaminhamento do bearer token.
- `src/integrations/supabase/auth-middleware.ts`: validação remota com `getUser`
  quando a aplicação for utilizada; nenhuma chamada feita durante esta recuperação.
- `src/integrations/supabase/types.ts`: contrato manual de tabelas/RPCs referenciadas.
- `src/routes/api/public/mercadopago.ts` e `src/lib/mercadopago-webhook.ts`: apenas
  POST processa, assinatura/timestamp obrigatórios, consulta ao provedor através do
  helper existente, falhas transitórias retornam 503, GET retorna 405.
- `src/components/ui/`: somente os 17 componentes importados: accordion,
  alert-dialog, alert, badge, button, card, dialog, input, label, progress, select,
  sheet, skeleton, sonner, switch, tabs e textarea. Componentes Radix/shadcn
  compatíveis com as chamadas existentes; não foi gerada uma biblioteca inteira.
- `src/lib/admin-email.ts`, `payment-configuration.ts`, `payment-seed.ts`,
  `demo-data.ts`, `demo-operations.ts`: helpers extraídos para regras verificáveis.
- `tests/admin-email.test.ts`, `demo-operations.test.ts`,
  `mercadopago-webhook.test.ts`, `payment-configuration.test.ts`,
  `pricing-regression.test.ts`: regressões locais sem banco/rede.
- As quatro migrations listadas abaixo e `drizzle/migrations/meta/README.md`.
- Este relatório e `reports/lint-recovery.json`.

## Arquivos existentes alterados nesta reconstrução

- `src/start.ts`: preserva respostas HTTP de autenticação, incluindo 401.
- `src/lib/app-data.ts`: tipos coerentes, rateio inválido explícito, seed sem
  sobrescrever taxas reais, erros propagados e operações atômicas via RPC.
- `src/lib/admin.functions.ts`: promoção por e-mail literal normalizado em contas
  de Auth, rejeição de ambiguidade e contexto Supabase tipado.
- `src/lib/licenca.functions.ts`: exige habilitação funcional para nova cobrança.
- `src/lib/licenca.server.ts`: credencial separada da habilitação de cobrança,
  validação de valor finito e erro de consulta propagado para permitir retentativa.
- `src/lib/pricing.ts`: desconto finito de 0 a 100; modo mínimo ignora lucro não
  utilizado; rateio sem vendas positivas retorna ausência de base, não zero válido.
- `src/routes/precificacao.tsx`: custo fixo manual explícito e lucro não utilizado
  normalizado a zero ao salvar cálculo mínimo.
- `src/routes/pagamentos.tsx` e `configuracoes.tsx`: falhas de restauração/remoção
  deixam de produzir sucesso falso; indicador de operação é liberado corretamente.
- `src/routeTree.gen.ts`: regenerado pelo build para incluir o webhook.
- `package.json` e `package-lock.json`: runner `tsx` instalado e comando de regressão.
- `.env.example`: ambiente de pagamentos ilustrativo alterado para sandbox.
- `README.md`: diferencia instruções futuras de homologação da recuperação local.

`supabase/config.toml` e `drizzle.config.ts` foram preservados. A configuração do
Auth Hook já existia; ela não comprova ativação em um projeto hospedado. A remoção
de integrações Lovable em Vite/dependências ocorreu na etapa anterior da conversa.

## Migrations reconstruídas

| Arquivo | Escopo reconstruído |
| --- | --- |
| `0010_harden_tenant_and_payment_security.sql` | Membership do proprietário, licença, proteção de ownership/company_id, privilégios e cercas RLS restritivas. |
| `0011_harden_residual_tenant_and_payment_risks.sql` | FKs entre registros da mesma empresa e processamento transacional de pagamento com registro de aplicação/reversão. |
| `0012_production_blockers.sql` | FKs de Auth, Auth Hook de cadastro e bloqueio explícito da cota de IA quando a implementação original não existir. |
| `0013_homologation_read_and_storage_hardening.sql` | Contexto limitado para renovação, bucket privado logos, fila de limpeza e RPCs transacionais de empresa/demo. |

Todas têm trava de recuperação que falha por padrão. Não devem ser aplicadas como
substitutos de migrations históricas. Não foram fabricados `_journal.json`, hashes,
timestamps ou snapshots. Não há schema inicial 0000–0009 nesta cópia.

As três RPCs novas são adaptadores das operações existentes, para impedir gravações
parciais: `create_company_with_payment_methods`, `seed_company_demo` e
`remove_company_demo`. O frontend agora depende delas. Ainda não estão instaladas
em nenhum banco por este trabalho. A criação restringe campos e injeta ownership
do usuário autenticado; seed/remoção são executados com privilégios do chamador.
O seed usa `ON CONFLICT ... DO NOTHING` nas formas de pagamento; nunca atualiza a
taxa real existente. A restauração explícita de taxas padrão continua sendo uma
operação diferente, iniciada pelo usuário.

## Verificação local

| Verificação | Resultado |
| --- | --- |
| Instalação de dependências | Concluída localmente, incluindo `tsx`; lock atualizado. |
| `npx tsc --noEmit` | Passou, sem erros. |
| `npm run build` | Passou; cliente e servidor gerados em `.output`, sem deploy. Há avisos de depreciação de `inputValidator` do TanStack. |
| `npm run test:security:unit` | 20 testes passaram; 0 falhas. |
| `npm run test:pricing` | 5 testes passaram; são os mesmos casos incluídos nos 20 acima. |
| `npm run lint` | Executado; não passou. Após ajustes apenas em arquivos trabalhados, a verificação ESLint restante tem 42 erros e 7 avisos. |
| SQL / Supabase / Mercado Pago real | Não executados. Nenhum banco de homologação confirmado. |

Detalhamento do lint, também registrado em `reports/lint-recovery.json`:

- Prettier: 42 erros restantes em código existente.
- `no-explicit-any`: 0 ocorrências.
- Hooks: 3 avisos `react-hooks/exhaustive-deps`.
- Fast Refresh: 4 avisos `react-refresh/only-export-components`.
- Outras regras/erros funcionais detectados pelo ESLint: 0.

Não foi executada formatação global. A ausência de erros funcionais no lint não
equivale a validar o comportamento integrado da aplicação.

Os testes cobrem assinatura/timestamp, ambiente e checkout, bloqueio de GET,
propagação de falhas do processador, e-mail literal/ambíguo, cobrança desabilitada,
propagação de erros de operações demo e as regressões de precificação. A atomicidade,
RLS e idempotência SQL ainda precisam ser testadas em banco; mocks locais não
comprovam essas propriedades.

## TODO DE RECUPERAÇÃO/VALIDAÇÃO

1. Recuperar schema inicial, histórico original e metadados. Comparar nullability,
   defaults, enums, status de pagamentos, chaves e relações com os tipos manuais.
2. Revisar grants de coluna, políticas, triggers e todas as RPCs legadas; uma função
   antiga com SECURITY DEFINER pode contornar RLS. As cercas reconstruídas não
   substituem inventário completo de privilégios do banco real.
3. Recuperar matriz de permissões dos demais papéis. A reconstrução só concede
   escrita ao proprietário com membership e licença ativa; papéis desconhecidos
   não receberam permissão por suposição.
4. Recuperar armazenamento e janela de renovação da cota de IA. Os testes indicam
   limite cinco, mas não o período. A migration preserva implementação existente;
   sem ela, instala função que bloqueia uso e informa a pendência. Portanto o teste
   SQL de cota ativa não passará com esse substituto de segurança.
5. Reconciliar concessões de licença anteriores antes de habilitar o novo registro
   técnico de idempotência. Reversões com concessões sobrepostas/manuais são
   bloqueadas para não subtrair licenças indevidas. Validar concorrência e ordem
   das consultas ao provedor, estornos parciais e estados terminais em sandbox.
6. Conferir cascatas de exclusão e estrutura real de `storage_cleanup_jobs`.
   Homologar upload/leitura privada/remoção/reprocessamento do bucket logos e
   vínculo entre `logo_url` e o caminho da empresa.
7. Confirmar Auth Hook no ambiente de homologação e testar cadastros habilitados e
   desabilitados. Recuperar também eventuais triggers originais de perfil/trial.
8. Ajustar fixtures SQL para usuários sintéticos válidos em `auth.users` ou usar
   constraints diferidas dentro de transação revertida. `NOT VALID` não isenta
   novos inserts dos testes. Nenhum teste SQL foi modificado para simular sucesso.
9. Executar os testes de tenant isolation, licença, pagamentos, novas transações
   demo e Storage em homologação descartável; só depois gerar tipos do schema
   validado e planejar migrations corretivas com identificadores adequados.
10. Resolver os avisos de lint e revisar dependências de desenvolvimento: a
    instalação reportou quatro alertas moderados na cadeia esbuild/Drizzle.
    Não foi aplicado `npm audit fix --force`.

Pode-se continuar o desenvolvimento local no Windows. Fluxos dependentes de banco
não devem ser considerados funcionais/homologados antes das etapas acima.
