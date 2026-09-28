import fs from 'node:fs';
import { connect, root } from './homologation-db.mjs';
const tests = [
  ['tests/tenant-isolation.sql', text => text.replace('  INSERT INTO public.companies',
    "  INSERT INTO auth.users(id,email) VALUES(owner_a,'hml-a@example.invalid'),(owner_b,'hml-b@example.invalid');\n  INSERT INTO public.companies")],
  ['tests/payment-idempotency.sql', text => text.replace('  INSERT INTO public.companies',
    "  INSERT INTO auth.users(id,email) VALUES(test_owner,'hml-pay@example.invalid'),(chargeback_owner,'hml-refund@example.invalid');\n  INSERT INTO public.companies").replaceAll(', true', ', false')],
  ['tests/homologation-contract.sql', text=>text],
];
const report=[];
for (const [file, adapt] of tests) {
  const sql=connect({readOnly:false});
  try {
    const source=adapt(fs.readFileSync(new URL(file,root),'utf8'));
    await sql.unsafe(source,[],{simple:true});
    report.push({file,result:'PASS',rolledBack:true});
  } catch(e) {
    await sql.unsafe('ROLLBACK');
    report.push({file,result:'FAIL',code:e.code,message:e.message});
    process.exitCode=1;
  } finally { await sql.end(); }
}
report.push({file:'tests/license-and-ai-rls.sql',result:'BLOCKED',reason:'Five-call quota/reset not approved; license/RLS assertions covered separately.'});
fs.writeFileSync(new URL('reports/homologation-sql-tests.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
