import fs from 'node:fs';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

// Only authentication and an empty protocol message; no SQL or catalog reads.
const root = new URL('../', import.meta.url);
const readEnv = (name) => {
  const file = new URL(name, root);
  return fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {};
};
const env = { ...readEnv('.env'), ...readEnv('.env.local'), ...process.env };
let sql;
let timer;
try {
  const url = new URL(env.DATABASE_URL);
  if (url.hostname !== 'aws-0-sa-east-1.pooler.supabase.com' ||
      decodeURIComponent(url.username) !== 'postgres.adkfebcanubebtmqyram') {
    throw Object.assign(new Error(), { code: 'UNEXPECTED_TARGET' });
  }
  sql = postgres({
    host: url.hostname,
    port: Number(url.port || 5432),
    database: url.pathname.slice(1),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: {
      ca: fs.readFileSync(new URL('certs/supabase-prod-ca-2021.crt', root), 'utf8'),
      rejectUnauthorized: true,
    },
    max: 1, fetch_types: false, prepare: false, target_session_attrs: null,
    connect_timeout: 12, idle_timeout: 1, max_lifetime: 20,
    connection: {
      application_name: 'precifica_connection_check',
      default_transaction_read_only: 'on',
    },
    onnotice: () => {},
    debug: (_id, query) => {
      if (query !== '') throw Object.assign(new Error(), { code: 'NONEMPTY_QUERY_BLOCKED' });
    },
  });
  await Promise.race([
    sql.unsafe('', [], { simple: true }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(), { code: 'CHECK_TIMEOUT' })), 16000);
    }),
  ]);
  console.log(JSON.stringify({ connected: true, project: 'adkfebcanubebtmqyram',
    tlsCertificateVerified: true, sqlStatementsExecuted: 0, dataChanged: false }));
} catch (error) {
  const message = String(error.message ?? '').toLowerCase();
  console.error(JSON.stringify({ connected: false,
    code: /^[A-Z0-9_]+$/.test(String(error.code ?? '')) ? error.code : 'CONNECTION_FAILED',
    category: message.includes('tenant') ? 'pooler_tenant_not_found' :
      message.includes('password') ? 'authentication_failed' :
      message.includes('certificate') ? 'tls_certificate_error' : 'connection_failed',
    sqlStatementsExecuted: 0, dataChanged: false }));
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  if (sql) await sql.end({ timeout: 1 });
}
