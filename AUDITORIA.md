**Auditoria técnica — 25/09/2026**

Escopo: cópia local do Precifica; código, dependências, configuração, autenticação, cobrança, persistência e precificação. Não foram alteradas regras de negócio durante a auditoria. Não houve acesso ao banco hospedado nem execução de pagamentos reais. As falhas abaixo descrevem esta cópia, não comprovam o estado da aplicação publicada.

**Resultado: a cópia local não está pronta para publicação.** Há bloqueios de compilação e ausência de implementações essenciais, além de defeitos de lógica.

**Verificações realizadas**

| Verificação | Resultado |
| --- | --- |
| Build da configuração atual | Falha ao resolver `@/integrations/supabase/auth-attacher`; arquivos de UI também estão ausentes |
| `npx tsc --noEmit` | 233 diagnósticos: 120 TS2307, 98 TS7006, 2 TS7031, 11 TS2339 e 2 TS2322; parte é consequência dos módulos ausentes |
| `npm run lint` | 73 erros e 5 avisos; 50 erros indicados como corrigíveis automaticamente |
| `npm run test:security:unit` | 6 testes aprovados |
| `npm audit` | 4 entradas moderadas na cadeia de desenvolvimento do Drizzle/esbuild |
| `npm audit --omit=dev` | Nenhum alerta conhecido retornado para dependências de produção |
| Reprodução direta de cálculos com Node/tsx | Confirmados preço negativo, bloqueio indevido do mínimo e omissão de custo fixo com vendas zeradas |
| Testes SQL, navegador e fluxos completos | Não validados: faltam migrações, módulos e ambiente de homologação confirmado |

**1. Alta — módulos essenciais ausentes impedem executar a aplicação**

Evidência: `src/start.ts:4`, `src/hooks/useAuth.tsx:3` e `src/routes/__root.tsx:14` importam módulos inexistentes. As pastas `src/components/ui` e `src/integrations/supabase` estão vazias. Faltam componentes, cliente público, cliente de servidor, middleware de autenticação, anexação da sessão e tipos do banco.

Impacto: build e TypeScript falham; não é possível validar login, páginas ou autorização no servidor. Recuperar os arquivos originais ou implementar os contratos completos antes de corrigir erros de tipagem derivados.

**2. Alta — migrações do banco não estão presentes**

Evidência: `drizzle.config.ts:5` aponta para `drizzle/migrations`, mas a pasta e seu diretório `meta` não contêm arquivos. `README.md:27` declara essa pasta como fonte oficial e descreve migrações 0011/0012 inexistentes nesta cópia. `supabase/config.toml` referencia um Auth Hook cuja definição também não está disponível.

Impacto: não há como reconstruir tabelas, políticas RLS, restrições, triggers e RPCs usados pela aplicação. A segurança do banco remoto permanece não verificada; não se deve inferir que suas políticas estão ausentes ou corretas. Recuperar o histórico e validar em banco descartável. A [documentação do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) explica a necessidade de validar grants e políticas para os papéis expostos.

**3. Alta — webhook de pagamento aponta para uma rota inexistente**

Evidência: `src/lib/licenca.functions.ts:96` envia `/api/public/mercadopago` como `notification_url`. A pasta `src/routes/api/public` está vazia e a árvore de rotas não registra esse endpoint. `validarAssinaturaMercadoPago` só é usado pelos testes.

Impacto: esta implementação não recebe notificações automáticas de aprovação, estorno ou chargeback. A conferência manual consulta somente cobranças pendentes e procura pagamentos aprovados, portanto não substitui o tratamento de reversões. Restaurar a rota com validação de assinatura e processamento idempotente; testar o ciclo completo em sandbox.

**4. Alta — busca por e-mail pode promover a conta errada a administradora**

Evidência: `src/lib/admin.functions.ts:83` usa `.ilike("email", alvo)` e aceita o ID retornado sem conferir igualdade literal do e-mail.

Condição: se um administrador informar `ana_silva@example.com`, esse padrão pode corresponder a `anaXsilva@example.com`; se houver uma única correspondência e a conta pretendida não existir, ela pode ser promovida. `_` e `%` são curingas conforme a [documentação do PostgreSQL](https://www.postgresql.org/docs/current/functions-matching.html). Trata-se de um defeito de seleção do destinatário, não de acesso administrativo anônimo confirmado.

Correção: comparar e-mails normalizados por igualdade literal, resolver o usuário na fonte de autenticação e conferir novamente o endereço antes de conceder o privilégio.

**5. Alta — carregar demonstração pode sobrescrever taxas reais**

Evidência: `src/routes/configuracoes.tsx:266` chama `seedDemoData` para a empresa atual. `src/lib/app-data.ts:457` chama `seedPaymentMethods(companyId, true)`, que faz `upsert` por `company_id,tipo,parcelas` na linha 331.

Impacto: formas de pagamento existentes que correspondam à chave recebem taxas/tarifas padrão e `is_demo=true`, substituindo configurações reais. `removeDemoData`, na linha 525, não restaura esses valores nem remove formas de pagamento. Usar dados isolados para demonstração ou inserir apenas exemplos que não colidam com registros existentes.

**6. Média — desativar cobrança online não bloqueia o token de ambiente**

Evidência: `src/lib/licenca.server.ts:9` descarta o token salvo quando `mercadopago_ativo=false`, mas a linha 10 retorna `MERCADO_PAGO_ACCESS_TOKEN` como alternativa. A interface apresenta a configuração como “Cobrança online ativa”.

Impacto: com a variável de ambiente configurada, o sistema pode continuar criando cobranças após o administrador desligar a opção. Separar a verificação de habilitação da origem da credencial; bloquear novas cobranças sem impedir a reconciliação de pagamentos existentes.

**7. Média — criação e remoção de exemplos ignoram erros do banco**

Evidência: `src/lib/app-data.ts:331`, 341, 404, 434, 521 e 532 aguardam operações Supabase sem verificar o campo `error`. As telas exibem mensagens de sucesso após essas funções retornarem.

Impacto: falhas de permissão, validação ou conexão podem deixar operações incompletas e ainda mostrar sucesso. Conferir cada resultado, tratar falhas e usar uma transação no servidor quando o conjunto precisar ser atômico. A criação de empresa também depende desse preenchimento de formas de pagamento.

**8. Média — desconto acima de 100% produz preço negativo válido**

Evidência: `src/lib/pricing.ts:150` aplica o desconto sem limite superior. `NumberField`, em `src/components/bits.tsx:104`, só implementa um mínimo; o campo promocional não restringe o máximo.

Reprodução executada: custo direto 100, impostos 10%, lucro 20%, desconto 150%, modo promocional. Resultado: `precoSugerido=-71.43` e `erro=null`. A função de salvar só bloqueia quando `resultado.erro` está preenchido.

Correção: validar intervalo do desconto e números finitos no núcleo de cálculo, na interface e na persistência. O banco pode rejeitar o valor, mas isso não pôde ser verificado e não corrige o resultado incorreto exibido.

**9. Média — margem desejada bloqueia indevidamente o preço mínimo**

Evidência: `src/lib/pricing.ts:136` rejeita `somaIdeal >= 100` independentemente do modo. A interface oculta o campo de lucro quando o modo é mínimo.

Reprodução executada: custo direto 100, impostos 10%, margem desejada 95%, modo mínimo. A função retorna erro, embora o preço mínimo calculável sem a margem desejada seja 111,11. Validar apenas os percentuais relevantes ao modo solicitado.

**10. Média — quantidade de vendas zerada elimina os custos fixos do cálculo**

Evidência: `src/lib/pricing.ts:81` retorna zero quando vendas mensais é zero ou negativo. O cadastro inicial e as configurações aceitam zero; a precificação continua habilitada.

Reprodução executada: despesas mensais 3000 e vendas mensais 0 geram custo fixo por venda 0. Com custo direto 100, impostos 10% e lucro 20%, o preço sugerido é 142,86 sem erro. A tela inclui uma orientação para informar vendas, mas não impede tratar o resultado incompleto como válido. Exigir uma base de rateio positiva ou um custo fixo manual explícito antes de salvar esse cálculo.

**Dependências e cobertura**

Os quatro alertas moderados correspondem a uma cadeia com `drizzle-kit`, `@esbuild-kit/esm-loader`, `@esbuild-kit/core-utils` e esbuild antigo. Não são quatro falhas independentes comprovadas no aplicativo. O [aviso GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) trata de acesso ao servidor de desenvolvimento do esbuild; a exposição desse servidor não foi demonstrada aqui. Revisar a cadeia antes de atualizar; a sugestão automática atual do npm envolve uma versão antiga do Drizzle e não deve ser aplicada sem avaliação.

Os seis testes existentes validam helpers de assinatura, ambiente, classificação de status e URL de checkout. Eles não demonstram funcionamento do webhook, processamento no banco, autenticação, isolamento entre empresas ou precificação. Faltam testes de regressão para os casos reproduzidos acima. O script também usa `tsx` sem declará-lo diretamente; hoje ele é disponibilizado por dependências transitivas.

**Ordem recomendada de correção**

1. Recuperar módulos e histórico de migrações; restabelecer compilação e banco de homologação.
2. Corrigir seleção de administradores, processamento de notificações e sobrescrita de dados pela demonstração.
3. Corrigir habilitação de cobrança, tratamento de erros e validações de precificação.
4. Criar testes de regressão, executar testes SQL e validar login, cadastro, pagamento e uso diário no navegador.
5. Resolver lint e revisar dependências de desenvolvimento antes da publicação.
