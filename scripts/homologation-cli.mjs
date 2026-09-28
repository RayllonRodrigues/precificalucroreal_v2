import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { connect, env, project, root } from './homologation-db.mjs';

const mode = process.argv[2];
const db = connect(); // Validate target before invoking any CLI operation.
await db.end();
const url = new URL(env.DATABASE_URL);
const password = decodeURIComponent(url.password);
url.password = '';
url.search = '';
url.searchParams.set('sslmode', 'verify-full');
url.searchParams.set('sslrootcert', fileURLToPath(new URL('certs/supabase-prod-ca-2021.crt', root)));
url.searchParams.set('options', `-c precifica.homologation_project=${project}`);
const commands = {
  preview: ['db','push','--dry-run','--skip-vault','--db-url',url.href],
  advisors: ['db','advisors','--db-url',url.href,'--type','security'],
  types: ['gen','types','typescript','--db-url',url.href,'--schema','public'],
};
if (!commands[mode]) throw Error('Use preview/advisors/types. Apply with apply-homologation-baseline.mjs to preserve the transaction-local guard.');
const cli = path.join(path.dirname(process.execPath),'node_modules/npm/bin/npx-cli.js');
const result = spawnSync(process.execPath,[cli,'--yes','supabase',...commands[mode]], {
  cwd: fileURLToPath(root), encoding:'utf8', timeout:180000,
  env:{...process.env,PGPASSWORD:password}, maxBuffer:16*1024*1024,
});
const redact = text => String(text ?? '').replaceAll(password,'[REDACTED]')
  .replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[DATABASE_URL]');
if (mode==='types' && result.status===0) {
  fs.writeFileSync(new URL('reports/supabase-generated-types.ts',root),result.stdout);
  console.log('Types generated in reports/supabase-generated-types.ts');
} else {
  const output=redact(result.stdout)+redact(result.stderr);
  fs.writeFileSync(new URL(`reports/homologation-cli-${mode}.txt`,root),output);
  console.log(output);
}
process.exitCode=result.status??1;
