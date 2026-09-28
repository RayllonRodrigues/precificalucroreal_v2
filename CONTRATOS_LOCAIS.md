# Correções locais do contrato — 25/09/2026

> Atualização de 28/09/2026: foi criada e validada uma **nova baseline de homologação**,
> sem executar 0010–0013. Profiles/trial/RLS/RPCs agora possuem implementação testada
> nesse novo ambiente e `types.ts` foi gerado do banco real. Auth Hook hospedado,
> signup público, cota de IA e pagamento externo permanecem pendentes.
> Consulte [o relatório e as evidências](reports/HOMOLOGACAO_2026-09-28.md).
> O restante deste documento preserva o registro histórico da fase local anterior;
> suas afirmações de ausência de schema/tipos gerados não descrevem a baseline nova.

Nenhuma migration foi criada ou modificada. Nenhum acesso ao Supabase ou SQL foi
executado. Os tipos continuam sendo contratos manuais, não schema confirmado.

## Estoque e pagamentos

`products_services.estoque` aceita `number | null` em Row/Insert/Update. Formulário,
duplicação e exemplos demo usam a mesma conversão: produto mantém estoque numérico;
serviço envia null. O estado numérico do formulário é apenas um valor de edição,
convertido antes de persistir. Homologação precisa confirmar a coluna nullable.

Toda nova cobrança Mercado Pago inclui explicitamente `provider: "mercadopago"`
e `status: "pendente"`. O tipo de INSERT exige provider; não se assumiu enum SQL.
A conferência continua recusando outro provider e valor divergente.

## Profile: bloqueador de homologação

Cadastro Auth envia nome, telefone, cpf, cnpj, cidade e uf como metadata. Isso não
constitui criação de `profiles`. Nenhum trigger histórico foi inventado.

Não é seguro adicionar INSERT do browser: não há permissão comprovada e a migration
reconstruída oferece somente leitura do próprio perfil. O Hook Before User Created
atual controla aceitação do cadastro; não cria perfil nem confirma a sessão.

Uma futura criação server-side deverá validar o usuário com getUser, obter seu ID
e e-mail do Auth, aceitar somente os campos de perfil conhecidos e nunca copiar
metadata para privilégios. Ainda exige confirmar chave/constraints, campos
obrigatórios, triggers existentes e comportamento de conflito sem sobrescrever
perfis reais. Cadastro sem sessão imediata também exige ponto de sincronização
após confirmação/login; um INSERT logo após signUp não cobre esse caso.

Por essas dependências, não foi adicionada gravação de perfil. Cadastro completo
com administração do perfil permanece bloqueado para homologação até validar esse
contrato. A metadata é conservada pelo fluxo atual de Auth; não foi anunciada
sincronização de perfil inexistente.

## Trial: uma regra de leitura, sem provisionamento presumido

A fonte confiável para uma empresa existente é `companies.trial_expira_em` retornada
pelo backend. `statusLicenca` dá precedência a essa data; se ausente/inválida, calcula
`created_at + DIAS_TESTE_PADRAO` (30 dias). Licença paga válida continua prevalecendo.
O cálculo é apenas local e não grava trial. A autorização efetiva depende do banco.

`platform_settings.dias_teste` permanece como configuração administrativa, mas não
é fonte efetiva de provisionamento nesta recuperação: falta comprovar sua aplicação
na criação. A leitura do plano usa o mesmo fallback de 30 dias, não um valor global
que possa reinterpretar empresas antigas. A interface administrativa identifica a
pendência; alterar essa configuração não recalcula trials existentes. Zero continua
sendo um valor administrativo válido, sem conversão silenciosa para 30.

Em homologação, confirmar um mecanismo backend que aplique dias_teste a novas
empresas e persista trial_expira_em. Só então a duração anunciada de novos trials
poderá seguir essa configuração. As migrations preservadas não foram adaptadas.

## Cadastro e Auth Hook

Configuração ausente, nula, desabilitada, ainda carregando ou com erro não habilita
cadastro no fluxo local. Somente permitir_cadastros explicitamente true permite
prosseguir. Essa regra corresponde ao Hook reconstruído. Não foi criado override
de desenvolvimento; ambientes de desenvolvimento também precisam de configuração
explícita. O Hook hospedado e sua ativação permanecem por confirmar.

## Testes locais e SQL separados

- `npm run test` e `npm run test:security`: somente testes locais, sem SQL.
- `npm run test:security:sql`: mantém o runner SQL e suas travas de homologação.
- `npm run test:security:all`: composição explícita de unitários e SQL, para uso
  futuro apenas em homologação confirmada. Não executado nesta rodada.

As regressões locais cobrem estoque, provider, configuração de cadastro ausente e
fallback/precedência do trial. Não validam constraints, RLS, triggers ou RPCs reais.

## Arquivos desta rodada

Alterados: `src/integrations/supabase/types.ts`; em `src/lib`, `demo-data.ts`,
`licenca.functions.ts`, `licenca.server.ts`, `licenca.ts`, `platform.functions.ts`,
`admin.functions.ts`; em `src/routes`, `itens.tsx`, `entrar.tsx`,
`administracao.tsx`, `licenca.tsx`; `package.json` e `README.md`.

Criados: `src/lib/item-stock.ts`, `src/lib/payment-contract.ts`,
`src/lib/signup-policy.ts`, `tests/local-contracts.test.ts` e este documento.

As assinaturas RPC foram revisadas contra os consumidores atuais e preservadas:
não há divergência adicional comprovada que justifique inventar tipos do banco.
Retornos sem payload continuam ignorados pelos consumidores. FKs e enums não foram
completados por inferência. A tipagem manual não substitui a futura geração a partir
de schema homologado.

## Resultado da validação

- `npx tsc --noEmit`: passou.
- Verificação TypeScript adicional incluindo `tests/local-contracts.test.ts`: zero diagnósticos.
- `npm run build`: passou; cliente/servidor gerados, sem deploy. Avisos existentes de depreciação de `inputValidator` permanecem.
- `npm run test:security`: 25 testes passaram, zero falhas, sem SQL.
- `npm run test`: os mesmos 25 testes passaram, zero falhas, sem SQL.
- SHA-256 das quatro migrations conferido antes/depois: arquivos idênticos, travas preservadas.

Continuam bloqueadores: criação/sincronização de profiles, provisionamento inicial
de trial, confirmação do schema e RLS, RPCs reais, histórico de pagamentos e cota
de IA. Não há aprovação de homologação ou produção com base apenas nesses testes.
