import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connect,root} from './homologation-db.mjs';
import {savePaymentAdmin,paymentAdminStatus} from '../src/lib/admin-payment-contract.ts';
const db=connect({readOnly:false});const owner=randomUUID(),normal=randomUUID();
const report:string[]=[];const rollback=Error('EXPECTED_ROLLBACK');
try{
 await db.begin(async tx=>{
  await tx`insert into auth.users(id,email) values(${owner},${owner+'@example.invalid'}),(${normal},${normal+'@example.invalid'})`;
  await tx`insert into public.platform_admins(user_id) values(${owner})`;
  const identity=async(id:string)=>{await tx.unsafe('RESET ROLE; SET LOCAL ROLE authenticated',[],{simple:true});await tx`select set_config('request.jwt.claim.sub',${id},true)`;};
  let writes=0;
  const deps={
    authorize:async()=>{if(!(await tx`select public.is_platform_admin() as ok`)[0].ok)throw Error('Forbidden');},
    hasToken:async()=>false,
    saveSecret:async(v:any)=>{
      writes++;await tx.unsafe('RESET ROLE; SET LOCAL ROLE service_role',[],{simple:true});
      if(v.mercadopago_access_token!==undefined)await tx`update public.platform_secrets set mercadopago_access_token=${v.mercadopago_access_token},mercadopago_ativo=${v.mercadopago_ativo} where id=true`;
      else await tx`update public.platform_secrets set mercadopago_ativo=${v.mercadopago_ativo} where id=true`;
    },saveSettings:async()=>{},
  };
  const input={mercadopagoAtivo:false,precoLicenca:129.9,mesesLicenca:12,diasTeste:30};
  await identity(normal);await assert.rejects(savePaymentAdmin({...input,token:'synthetic-only'},deps),/Forbidden/);assert.equal(writes,0);
  for(const action of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal((await tx`select has_table_privilege(current_user,'public.platform_secrets',${action}) as allowed`)[0].allowed,false);
  report.push('real non-admin authorization and direct secret table privileges denied');
  await identity(owner);const response=await savePaymentAdmin({...input,token:'synthetic-only'},deps);
  const current=async()=> (await tx`select mercadopago_ativo,mercadopago_access_token from public.platform_secrets where id=true`)[0];
  assert.equal((await current()).mercadopago_access_token,'synthetic-only');
  assert.doesNotMatch(JSON.stringify([response,paymentAdminStatus(await current())]),/synthetic-only/);
  report.push('real platform admin saves credential; response exposes status only');
  await identity(owner);await savePaymentAdmin({...input,token:'   '},deps);assert.equal((await current()).mercadopago_access_token,'synthetic-only');
  await identity(owner);await savePaymentAdmin({...input,token:'replacement-only'},deps);assert.equal((await current()).mercadopago_access_token,'replacement-only');
  report.push('empty preserves; explicit replacement updates');
  throw rollback;
 });
}catch(e){if(e!==rollback){console.error('Payment administration integration failed');process.exitCode=1;}}
finally{await db.end();const result={status:process.exitCode?'FAIL':'PASS',tests:report,rolledBack:true};fs.writeFileSync(new URL('reports/homologation-payment-admin.json',root),JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
