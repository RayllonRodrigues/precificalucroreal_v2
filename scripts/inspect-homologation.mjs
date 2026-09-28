import fs from 'node:fs';
import { connect, root, project } from './homologation-db.mjs';
const sql = connect();
try {
  const report = { project, at: new Date().toISOString(),
    tables: await sql`select schemaname,tablename,rowsecurity from pg_tables where schemaname in ('public','precifica_private') order by 1,2`,
    columns: await sql`select table_schema,table_name,column_name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema in ('public','precifica_private') order by 1,2,ordinal_position`,
    constraints: await sql`select n.nspname,c.relname,x.conname,x.contype,x.convalidated,pg_get_constraintdef(x.oid) as definition from pg_constraint x join pg_class c on c.oid=x.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','precifica_private')`,
    indexes: await sql`select * from pg_indexes where schemaname in ('public','precifica_private')`,
    functions: await sql`select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args,pg_get_function_result(p.oid) as result,p.prosecdef,p.proconfig,p.proacl,pg_get_userbyid(p.proowner) as owner,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','precifica_private')`,
    triggers: await sql`select n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','auth')`,
    policies: await sql`select * from pg_policies where schemaname in ('public','storage')`,
    grants: await sql`select * from information_schema.role_table_grants where table_schema in ('public','precifica_private')`,
    columnGrants: await sql`select * from information_schema.column_privileges where table_schema='public' and grantee in ('anon','authenticated')`,
    rls: await sql`select c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`,
    buckets: await sql`select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='logos'`,
    extensions: await sql`select extname,extversion from pg_extension`,
    migrations: await sql`select version,name from supabase_migrations.schema_migrations`,
  };
  for (const name of ['scripts/security-audit.sql','tests/audit-pending-constraints.sql']) {
    report[name] = await sql.unsafe(fs.readFileSync(new URL(name,root),'utf8'),[],{simple:true});
  }
  fs.writeFileSync(new URL('reports/homologation-schema.json',root),JSON.stringify(report,null,2));
  console.log(JSON.stringify({tables:report.tables.length,functions:report.functions.length,policies:report.policies.length,
    missingRls:report.rls.filter(t=>!t.relrowsecurity).map(t=>t.relname),unvalidatedConstraints:report.constraints.filter(c=>!c.convalidated).length,buckets:report.buckets}));
} finally { await sql.end(); }
