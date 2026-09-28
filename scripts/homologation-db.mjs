import fs from 'node:fs';
import { parseEnv } from 'node:util';
import postgres from 'postgres';
export const project = 'adkfebcanubebtmqyram';
export const root = new URL('../', import.meta.url);
const read = name => fs.existsSync(new URL(name, root)) ? parseEnv(fs.readFileSync(new URL(name, root), 'utf8')) : {};
export const env = { ...read('.env'), ...read('.env.local'), ...process.env };
export function connect({ readOnly = true } = {}) {
  const u = new URL(env.DATABASE_URL);
  if (u.hostname !== 'aws-0-sa-east-1.pooler.supabase.com' || decodeURIComponent(u.username) !== `postgres.${project}` || u.pathname !== '/postgres') throw Error('HOMOLOGATION_TARGET_MISMATCH');
  for (const name of ['SUPABASE_URL', 'VITE_SUPABASE_URL']) {
    if (new URL(env[name]).origin !== `https://${project}.supabase.co`) throw Error('HOMOLOGATION_API_MISMATCH');
  }
  return postgres({ host: u.hostname, port: Number(u.port), database: 'postgres',
    username: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    ssl: { ca: fs.readFileSync(new URL('certs/supabase-prod-ca-2021.crt', root), 'utf8'), rejectUnauthorized: true },
    max: 1, prepare: false, fetch_types: false, target_session_attrs: null,
    connect_timeout: 15, onnotice: () => {},
    connection: { application_name: 'precifica_homologation', statement_timeout: 30000, default_transaction_read_only: readOnly ? 'on' : 'off' },
  });
}
