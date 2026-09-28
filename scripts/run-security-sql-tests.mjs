import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error(
    "DATABASE_URL não configurada. Os testes SQL de segurança são obrigatórios em homologação.",
  );
  process.exit(1);
}
if (process.env.SECURITY_SQL_TEST_CONFIRM !== "homologation") {
  console.error(
    "Defina SECURITY_SQL_TEST_CONFIRM=homologation após confirmar que DATABASE_URL não é produção.",
  );
  process.exit(1);
}
if (databaseUrl.includes("bjtyeikuomxudmtdxtrp")) {
  console.error("Execução recusada: DATABASE_URL aponta para o projeto de produção conhecido.");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "tests/tenant-isolation.sql",
  "tests/license-and-ai-rls.sql",
  "tests/payment-idempotency.sql",
];

for (const relativeFile of files) {
  console.log(`Executando ${relativeFile}`);
  const result = spawnSync(
    "psql",
    ["--dbname", databaseUrl, "--set", "ON_ERROR_STOP=1", "--file", path.join(root, relativeFile)],
    { stdio: "inherit" },
  );
  if (result.error) {
    console.error(`Não foi possível executar psql: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
