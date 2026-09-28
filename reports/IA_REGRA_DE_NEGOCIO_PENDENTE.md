# IA — REGRA DE NEGÓCIO PENDENTE

Inspeção do código atual em 28/09/2026. Nenhuma regra de limite foi implementada nesta rodada.

## Referências encontradas

| Local | Dependência comprovada |
| --- | --- |
| src/integrations/supabase/types.ts — Functions.consume_ai_rate_limit | Assinatura gerada: company_id UUID, retorno boolean |
| supabase/migrations/20260928132125_initial_precifica_schema_homologation.sql:697 | Implementação existente retorna false; não conta chamadas, não consulta provedor e não reseta janela |
| tests/license-and-ai-rls.sql:40–50 | Teste antigo presume cinco chamadas aceitas e a sexta recusada, sem especificar janela/reset |
| tests/license-and-ai-rls.sql:110 | Espera recusa para licença expirada |
| tests/license-and-ai-rls.sql:119 | Espera recusa para não membro |
| tests/license-and-ai-rls.sql:141 | Espera falta de EXECUTE para anon |
| drizzle/migrations/0012_production_blockers.sql:34–50 | Material de recuperação, não aplicado: stub e aviso explícito de regra histórica desconhecida |
| scripts/test-homologation-sql.mjs | Mantém bloqueado o teste antigo que pressupõe cinco chamadas; testa RLS/licença separadamente |
| drizzle/migrations/meta/README.md | Registra ausência da implementação persistente histórica |

Não foram encontradas chamadas `.rpc("consume_ai_rate_limit")` no frontend ou nos handlers atuais, nem integração executável com provedor de IA em `src`. Também não há contador, tabela de janela, rotina de reset ou UI de consumo implementados. As referências a reset em Auth são recuperação de senha; não são cota de IA.

## Proposta técnica, ainda não aprovada como regra de negócio

| Aspecto | Proposta | Decisão necessária |
| --- | --- | --- |
| Unidade | Uma operação lógica de geração, identificada por request_id; retry da mesma operação não consome novamente | Confirmar se cobrança é por chamada, geração concluída ou tokens/custo |
| Escopo | company_id verificado no servidor, nunca um contador por navegador/usuário | Confirmar compartilhamento da cota entre membros e tratamento de múltiplas empresas |
| Janela | Sugestão para avaliação: janela diária em UTC, de 00:00 até 00:00 do dia seguinte; ciclo de licença é alternativa se a cota for comercial mensal | Aprovar duração, calendário versus ciclo de licença e quantidade permitida; nenhuma janela nem quantidade adotada no código |
| Reset | Mudança de window_start cria uma nova janela; não zerar contadores por cron | Aprovar se há acúmulo, prorrata ou migração de plano no meio da janela |
| Concorrência | Reserva atômica condicionada a remaining > 0, com unique(company_id,window_start) e request_id único por operação | Aprovar quando reservar/consumir e quando liberar uma reserva |
| Persistência | Registro privado de janela/consumo e registro de requisições idempotentes; nenhuma escrita pelo browser | Aprovar retenção e trilha de auditoria; não armazenar prompts/secrets sem necessidade |
| Excesso | Recusar antes da chamada ao provedor, retornar código estável e instante da próxima janela, sem consumo extra | Aprovar mensagem, comportamento comercial e eventual upgrade |
| Erro do provedor | Reserva separada da confirmação evita consumo repetido; desfecho desconhecido requer reconciliação | Aprovar cobrança de falhas, cancelamentos, timeouts e prazo de reserva |
| Autorização | Membership e licença ativa no instante da reserva; sem privilégio implícito de platform admin | Aprovar eventual cota de trial; usuário sem membership e licença expirada não consomem |

Uma assinatura puramente booleana não informa retry_after, consumo nem identidade da operação. Se a proposta for aprovada, revisar o contrato da RPC/handler antes de implementar, em vez de esconder novas regras dentro do boolean atual.

## Critérios para a futura implementação

- Limite e janela formalmente definidos; não reutilizar o número cinco só por existir em um teste antigo.
- N requisições concorrentes respeitam exatamente o teto aprovado.
- Repetição do mesmo request_id não debita novamente.
- Falha/retry/timeouts seguem uma política explícita de reserva/consumo.
- Reset funciona em borda de janela e com relógio do banco.
- Isolamento entre tenants, licença e papéis são verificados antes de chamar o provedor.
- Testes antigos serão adaptados ao contrato aprovado, preservando as provas de autorização.

**Status: REGRA DE NEGÓCIO PENDENTE.** Não foram criadas tabelas, migrations ou funções de cota nesta rodada.
