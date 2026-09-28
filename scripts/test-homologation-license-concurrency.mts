import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {connect,env,root} from './homologation-db.mjs';
import {companyExpirationStore,extendExpiration} from '../src/lib/license-extension.ts';
import type {Database} from '../src/integrations/supabase/types.ts';
const db=connect({readOnly:false});
const admin=createClient<Database>(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const owner=randomUUID(), companies:string[]=[], charges:string[]=[];
const report:string[]=[];
try{
 await db`insert into auth.users(id,email) values(${owner},${'hml-license-'+owner+'@example.invalid'})`;
 for(const mode of ['payment-between-read-and-write','manual-first','concurrent-three']){
  const company=randomUUID(),charge=randomUUID();companies.push(company);charges.push(charge);
  await db`insert into public.companies(id,owner_id,nome,licenca_expira_em) values(${company},${owner},'Synthetic CAS test','2030-01-15T12:00:00Z')`;
  await db`insert into public.license_payments(id,company_id,valor,meses,provider) values(${charge},${company},129.9,12,'mercadopago')`;
  const paymentId=String(BigInt('0x'+charge.replaceAll('-','').slice(0,12)));
  const pay=async()=>{const r=await admin.rpc('process_mercado_pago_payment',{_charge_id:charge,_payment_id:paymentId,_provider_status:'approved',_status_detail:'test',_live_mode:false});if(r.error)throw r.error;assert.equal(r.data,'activated');};
  const store=companyExpirationStore(admin,company,'licenca_expira_em');
  if(mode==='payment-between-read-and-write'){
   let injected=false,conflicts=0;
   await extendExpiration({read:async()=>{const old=await store.read();if(!injected){injected=true;await pay();}return old;},compareAndSet:async(old,next)=>{const ok=await store.compareAndSet(old,next);if(!ok)conflicts++;return ok;}},2,'months');
   assert.equal(conflicts,1);
  }else if(mode==='manual-first'){
   await extendExpiration(store,2,'months');await pay();
  }else{
   await Promise.all([extendExpiration(store,2,'months'),extendExpiration(store,3,'months'),pay()]);
  }
  const actual=await store.read();
  assert.equal(new Date(actual!).toISOString(),mode==='concurrent-three'?'2031-06-15T12:00:00.000Z':'2031-03-15T12:00:00.000Z');
  report.push(mode);
 }
 console.log(JSON.stringify({status:'PASS',tests:report}));
}catch(e:any){console.error(JSON.stringify({status:'FAIL',code:e.code,message:e.message}));process.exitCode=1;}
finally{
 for(const charge of charges)await db`delete from precifica_private.payment_effects where charge_id=${charge}`;
 for(const company of companies)await db`delete from public.companies where id=${company}`;
 await db`delete from auth.users where id=${owner}`;
 await db.end();
 fs.writeFileSync(new URL('reports/homologation-license-concurrency.json',root),JSON.stringify({status:process.exitCode?'FAIL':'PASS',tests:report,syntheticDataRemoved:true},null,2));
}
