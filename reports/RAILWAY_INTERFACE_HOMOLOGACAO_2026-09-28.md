# Interface de homologação funcional no Railway

Data: 28/09/2026.
Repositório: RayllonRodrigues/precificalucroreal_v2, main.
Commit: cd54690dce9d4bf64fd45a1561868e1bd961f781.
Deployment completo: 62ce36c6-75ad-4b9b-bc78-52db8ec80456, SUCCESS.
Aplicação: https://precificalucroreal-production.up.railway.app.
Supabase de homologação: adkfebcanubebtmqyram.

## Configuração aplicada

As variáveis foram enviadas ao Railway sem imprimir credenciais e comparadas com os valores remotos após a gravação.

- Públicas configuradas: VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.
- Servidor configurado: SUPABASE_PROJECT_ID, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, SECURITY_SQL_TEST_CONFIRM=homologation.
- APP_URL e APP_URL_ALLOWLIST configuradas exatamente com a URL Railway acima.
- MERCADO_PAGO_ENVIRONMENT=sandbox. Nenhuma credencial de pagamento foi adicionada; mercadopago_ativo=false confirmado por leitura antes e depois do deploy.
- DB_MIGRATION_URL não configurada: não é exigida pelo runtime; sua referência está em drizzle.config.ts, destinado ao tooling de migrations. Esse tooling não foi executado.
- Healthcheck Railway configurado como /health, confirmado nos metadados do deployment ativo. Rota mantida como liveness simples, independente do banco.

As chaves existentes foram validadas exclusivamente contra o projeto de homologação. A chave pública é publishable, e a credencial privilegiada é secret server-side; nenhuma chave privilegiada foi colocada em VITE_*.

## Validação no navegador

Chromium headless em sessão anônima, esperando networkidle; requests a outros projetos Supabase e ao Mercado Pago bloqueados no navegador de teste. Nenhum login, cadastro, envio de e-mail ou cobrança foi realizado.

| Rota | HTTP inicial | Resultado após JavaScript |
| --- | --- | --- |
| / | 200 | Página inicial renderizada |
| /entrar | 200 | Formulário de login renderizado |
| /painel | 200 | Redireciona para /entrar |
| /administracao | 200 | Redireciona para /admin e renderiza acesso administrativo |

- Sem a tela “Não foi possível carregar esta página”.
- Console sem erros nas quatro rotas, incluindo ausência do erro de configuração Supabase.
- Nenhuma resposta de asset com falha observada.
- Hidratação verificada pela navegação cliente das rotas protegidas e interação com input controlado: preencher, retirar foco, conferir valor e limpar; sem submeter formulário.
- GET /health: 200, {"status":"ok"}.

## Segurança do bundle

Varredura local: 61 arquivos públicos, sem achados.
Varredura remota: 63 recursos (assets JavaScript/CSS descobertos recursivamente e HTML), sem falhas de download e sem achados.

Foram procurados nomes das variáveis sensíveis, valores secretos locais conhecidos e padrões de chaves privadas/URLs PostgreSQL/tokens de pagamento. SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, DB_MIGRATION_URL, access token Mercado Pago e webhook secrets não foram detectados. Nenhum valor secreto é registrado neste relatório.

## Testes

- npx tsc --noEmit: aprovado.
- npm run build: aprovado localmente; novo build remoto também aprovado.
- npm run test: 37/37 aprovados.
- npm run test:security: 37/37 aprovados.

## Escopo e resultado

INTERFACE RAILWAY: APROVADA no escopo de renderização, hidratação e acesso anônimo solicitado. Isso não aprova login autenticado, signup/e-mail ou pagamentos, que não foram exercitados.

Nenhuma alteração de código, schema ou migrations; nenhum acesso ao Supabase de produção. Não foram executados lint, prettier ou npm audit nesta etapa. Não houve commit/push; a correção consiste nas variáveis e healthcheck do Railway, seguidos de build completo do commit já publicado.

Evidências locais: railway-interface-browser-2026-09-28.json, railway-interface-bundle-scan-2026-09-28.json e railway-interface-login-2026-09-28.png.

Este resultado supera os bloqueios de configuração e renderização registrados na auditoria anterior, preservada como histórico.
