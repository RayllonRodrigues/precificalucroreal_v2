# Runtime Railway

## Diagnóstico e correção

O preset anterior `cloudflare-module` produzia `.output/server/index.mjs`
exportando um handler Cloudflare (fetch, scheduled, queue e bindings ASSETS).
Executar esse arquivo com Node encerrava com exit 0, sem listener HTTP. Não havia
script start. Esse artefato não servia como servidor Node persistente no Railway.
Sem logs do deployment, não é possível afirmar que essa foi a única causa remota
do 502; a incompatibilidade local foi reproduzida e corrigida.

Preset atual: `node-server`, conforme o preset oficial de servidor Node do Nitro:
https://nitro.build/deploy/runtimes/node

Entrypoint confirmado após build: `.output/server/index.mjs`.
Script start: `node --import ./scripts/node-runtime.mjs .output/server/index.mjs`.
O preload só configura host `0.0.0.0` e faz PORT prevalecer sobre NITRO_PORT;
o servidor HTTP continua sendo o Nitro. Nenhuma porta de produção foi fixada.

## Configuração Railway

- Runtime: Node 22, >=22.12 e <23 (teste local com 22.17.1).
- Build command: `npm run build` (dependências de build/dev devem ser instaladas).
- Start command: `npm start`.
- Healthcheck: `/health`.
- Porta: `PORT` fornecida pelo Railway; não definir NITRO_PORT com outra porta.
- APP_URL: `https://precificalucroreal.up.railway.app`.
- APP_URL_ALLOWLIST: `https://precificalucroreal.up.railway.app`.

As duas variáveis APP_URL permanecem leituras de process.env em runtime no bundle
do servidor. Nenhum domínio foi fixado no código e nenhum .env foi modificado.
As variáveis públicas VITE são incorporadas pelo build; usar os valores existentes
de homologação no Railway. Não é necessário fornecer secrets de pagamento para boot.
Credenciais do cliente privilegiado são verificadas apenas no acesso ao cliente lazy;
token Mercado Pago é buscado ao usar pagamento; secret do webhook é lido no handler.

## Evidência local

Build, TypeScript, npm run test e npm run test:security: exit 0; 37/37 em cada suíte.
O smoke iniciou exatamente npm start, com PORT=41873 e sem variáveis Supabase,
DATABASE_URL, APP_URL ou Mercado Pago no processo. Fetch externo do servidor foi
bloqueado no smoke. Nenhum banco ou provedor externo foi acessado.

| Requisição | Resultado |
| --- | --- |
| GET / | 200, HTML da aplicação |
| GET /health | 200, {"status":"ok"} |
| GET /entrar | 200, HTML de login |
| GET /api/public/mercadopago | 405 |
| POST /api/public/mercadopago, JSON vazio | 503, Webhook indisponível, sem crash |
| GET /health após POST | 200; processo ainda vivo |

Segundo boot com PORT=41874: listener confirmado pelo sistema operacional em
0.0.0.0:41874. Ambos os processos de teste foram encerrados ao final.
Logs e resultados: railway-runtime-{build,typescript,test,security}.txt e
railway-runtime-smoke.json. /health não depende de serviços externos.

Arquivos de implementação alterados: vite.config.ts, package.json, package-lock.json,
scripts/node-runtime.mjs, src/routes/health.ts e src/routeTree.gen.ts (gerado pelo build).

**PRONTO PARA NOVO DEPLOY NO RAILWAY**. Deployment remoto não realizado nesta etapa;
repetir smoke público após deploy. Isso não aprova produção nem outras pendências.
