import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {connect,root} from './homologation-db.mjs';
const sql=connect({readOnly:false});
const owner=randomUUID(),company=randomUUID(),charge=randomUUID(),second=randomUUID();
const payment=String(BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)));
const results=[];
const invoke=async(id,status,live=false,paymentId=payment)=>{
  const db=connect({readOnly:false});
  try{return await db.begin(async tx=>{
    await tx.unsafe('SET LOCAL ROLE service_role');
    return (await tx`select public.process_mercado_pago_payment(${id},${paymentId},${status},'test',${live}) as result`)[0].result;
  });}finally{await db.end();}
};
try{
 await sql`insert into auth.users(id,email) values(${owner},${'hml-finance-'+owner+'@example.invalid'})`;
 await sql`insert into public.companies(id,owner_id,nome) values(${company},${owner},'Synthetic concurrency test')`;
 await sql`insert into public.license_payments(id,company_id,valor,meses,provider) values(${charge},${company},129.9,12,'mercadopago'),(${second},${company},129.9,12,'mercadopago')`;
 assert.deepEqual((await Promise.all([invoke(charge,'approved'),invoke(charge,'approved')])).sort(),['activated','duplicate']);
 results.push('concurrent duplicate approval grants once');
 await assert.rejects(invoke(second,'approved'));results.push('payment ID cannot bind another charge');
 await assert.rejects(invoke(charge,'approved',true));results.push('production/live event rejected');
 assert.deepEqual((await Promise.all([invoke(charge,'refunded'),invoke(charge,'refunded')])).sort(),['duplicate','reversed']);
 assert.equal((await sql`select licenca_expira_em from public.companies where id=${company}`)[0].licenca_expira_em,null);
 results.push('concurrent reversal applies once');
 assert.equal(await invoke(charge,'approved'),'duplicate');results.push('late approval cannot revive reversed effect');
 assert.equal(await invoke(second,'approved',false,payment+'1'),'activated');
 await sql`update public.companies set licenca_expira_em=licenca_expira_em+interval '3 months' where id=${company}`;
 await assert.rejects(invoke(second,'refunded',false,payment+'1'));
 results.push('manual/overlapping grant protected from automatic reversal');
 console.log(JSON.stringify({status:'PASS',tests:results}));
}catch(e){console.error(JSON.stringify({status:'FAIL',code:e.code,message:e.message}));process.exitCode=1;}
finally{
 await sql`delete from precifica_private.payment_effects where charge_id in (${charge},${second})`;
 await sql`delete from public.companies where id=${company}`;
 await sql`delete from auth.users where id=${owner}`;
 await sql.end();
 fs.writeFileSync(new URL('reports/homologation-payment-concurrency.json',root),JSON.stringify({status:process.exitCode?'FAIL':'PASS',tests:results,syntheticDataRemoved:true},null,2));
}
