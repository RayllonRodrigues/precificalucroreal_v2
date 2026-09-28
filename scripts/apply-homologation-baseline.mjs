import fs from 'node:fs';
import { connect, project, root } from './homologation-db.mjs';
// Supavisor does not propagate custom startup options. Set the guard inside
// the SAME transaction and record the CLI-created migration in its own history.
const filename = '20260928132125_initial_precifica_schema_homologation.sql';
const source = fs.readFileSync(new URL(`supabase/migrations/${filename}`, root), 'utf8');
const sql = connect({ readOnly: false });
try {
  await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(823467231)`;
    await tx`select set_config('precifica.homologation_project', ${project}, true)`;
    await tx.unsafe(`CREATE SCHEMA IF NOT EXISTS supabase_migrations;
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version text PRIMARY KEY, statements text[], name text
      )`, [], {simple:true});
    const history = await tx`select version from supabase_migrations.schema_migrations`;
    if (history.length) throw Error('NONEMPTY_MIGRATION_HISTORY');
    await tx.unsafe(source, [], { simple: true });
    await tx`insert into supabase_migrations.schema_migrations(version,name,statements)
      values ('20260928132125','initial_precifica_schema_homologation',ARRAY[${source}]::text[])`;
  });
  console.log(JSON.stringify({ applied: filename, project, tls: true, atomic: true }));
} catch (error) {
  console.error(JSON.stringify({ applied: false, code: error.code ?? 'BASELINE_FAILED',
    message: error.message, position: error.position }));
  process.exitCode = 1;
} finally { await sql.end(); }
