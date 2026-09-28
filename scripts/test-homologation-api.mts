import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { connect, env, root } from './homologation-db.mjs';
import { buildDemoPayload } from '../src/lib/demo-data.ts';
import { buildPaymentRows } from '../src/lib/payment-seed.ts';

const guard=connect(); await guard.end();
const auth={persistSession:false,autoRefreshToken:false,detectSessionInUrl:false};
const admin=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth});
const client=()=>createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth});
const run=randomUUID();
const users:string[]=[]; const companies:string[]=[]; const objects:string[]=[];
const results:{test:string;status:string;detail?:string}[]=[];
let originalDemo=false;
const checked=(result:any)=>{if(result.error)throw Object.assign(new Error(result.error.message),{code:result.error.code});return result.data;};
const pass=(test:string)=>{results.push({test,status:'PASS'});console.log('PASS '+test);};
try {
  const settings=checked(await admin.from('platform_settings').select('permitir_demo').eq('id',true).single());
  originalDemo=settings.permitir_demo;
  const clients=[];
  for(let i=0;i<3;i++){
    const email=`precifica-hml-${run}-${i}@example.invalid`;
    const password=randomUUID()+'Aa1!';
    const data=checked(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nome:`Synthetic ${i}`,telefone:'000',cpf:'000',cnpj:'000',cidade:'Homologation',uf:'SP'}}));
    users.push(data.user.id);
    const c=client();checked(await c.auth.signInWithPassword({email,password}));clients.push(c);
    const profile=checked(await c.from('profiles').select('*').eq('id',data.user.id).single());
    assert.equal(profile.email,email);assert.equal(profile.nome,`Synthetic ${i}`);assert.equal(profile.cidade,'Homologation');
  }
  pass('Auth admin creation -> profile metadata -> password login');
  const [a,b,outsider]=clients;
  assert.equal(checked(await a.from('profiles').select('id')).length,1);pass('profile isolation');
  for(const c of [a,b]){
    const company=checked(await c.rpc('create_company_with_payment_methods',{_company:{nome:'Synthetic '+run},_payment_methods:buildPaymentRows(randomUUID(),false)}));
    companies.push(company.id);assert.equal(company.owner_id,users[companies.length-1]);
    assert.equal(Math.round((Date.parse(company.trial_expira_em)-Date.parse(company.created_at))/86400000),30);
    assert.equal(checked(await c.from('company_members').select('*').eq('company_id',company.id))[0].role,'proprietario');
  }
  pass('company RPC + owner membership + persisted trial + payment methods');
  const countsBefore=checked(await a.rpc('get_my_company_context')).length;
  assert.ok((await a.rpc('create_company_with_payment_methods',{_company:{nome:'Invalid atomic'},_payment_methods:[{}]})).error);
  assert.equal(checked(await a.rpc('get_my_company_context')).length,countsBefore);
  assert.ok((await a.rpc('create_company_with_payment_methods',{_company:{nome:'Spoof owner',owner_id:users[1]},_payment_methods:[]})).error);
  pass('creation atomicity and arbitrary owner rejected');
  assert.equal(checked(await a.from('companies').select('id').eq('id',companies[1])).length,0);
  assert.equal(checked(await outsider.rpc('get_my_company_context')).length,0);
  assert.ok((await a.from('products_services').insert({company_id:companies[1],tipo:'produto',nome:'Cross'})).error);
  pass('cross-tenant isolation via REST and RPC');
  const product=checked(await a.from('products_services').insert({company_id:companies[0],tipo:'produto',nome:'Own product',estoque:12}).select().single());
  const service=checked(await a.from('products_services').insert({company_id:companies[0],tipo:'servico',nome:'Own service',estoque:null}).select().single());
  assert.equal(product.estoque,12);assert.equal(service.estoque,null);
  checked(await a.from('products_services').update({nome:'Edited'}).eq('id',product.id));
  checked(await a.from('products_services').delete().eq('id',service.id));
  pass('product numeric stock / service null / operational CRUD');
  const method=checked(await a.from('payment_methods').select('*').eq('company_id',companies[0]).limit(1).single());
  checked(await a.from('payment_methods').update({taxa_percentual:7.77}).eq('id',method.id));
  checked(await admin.from('platform_settings').update({permitir_demo:true}).eq('id',true));
  checked(await a.rpc('seed_company_demo',{_company_id:companies[0],_payload:buildDemoPayload(companies[0])}));
  assert.equal(checked(await a.from('payment_methods').select('taxa_percentual').eq('id',method.id).single()).taxa_percentual,7.77);
  assert.ok((await a.rpc('seed_company_demo',{_company_id:companies[1],_payload:buildDemoPayload(companies[1])})).error);
  checked(await a.rpc('remove_company_demo',{_company_id:companies[0]}));
  assert.equal(checked(await a.from('products_services').select('*').eq('company_id',companies[0])).length,1);
  pass('demo seed/remove atomic RPCs preserve real payment rates and products');
  const path=`${companies[0]}/logo-${run}.png`;objects.push(path);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  checked(await a.storage.from('logos').upload(path,png,{contentType:'image/png'}));
  const signed=checked(await a.storage.from('logos').createSignedUrl(path,30));
  assert.ok((await fetch(signed.signedUrl)).ok);
  assert.ok((await b.storage.from('logos').createSignedUrl(path,30)).error);
  assert.ok((await a.storage.from('logos').upload(`${companies[0]}/logo-bad.txt`,Buffer.from('test'),{contentType:'text/plain'})).error);
  assert.ok((await a.storage.from('logos').upload(`${companies[0]}/logo-large.png`,Buffer.alloc(2097153),{contentType:'image/png'})).error);
  pass('Storage upload, signed URL, cross-tenant denial, MIME and size');
  checked(await a.from('companies').update({logo_url:path}).eq('id',companies[0]));
  assert.ok((await a.rpc('queue_logo_cleanup',{_company_id:companies[0],_object_path:path})).error);
  checked(await a.from('companies').update({logo_url:null}).eq('id',companies[0]));
  checked(await a.rpc('queue_logo_cleanup',{_company_id:companies[0],_object_path:path}));
  checked(await a.rpc('queue_logo_cleanup',{_company_id:companies[0],_object_path:path}));
  assert.equal(checked(await admin.from('storage_cleanup_jobs').select('*').eq('object_path',path)).length,1);
  checked(await a.storage.from('logos').remove([path]));
  pass('active logo protected / cleanup queue idempotent / object removal');
  checked(await admin.from('companies').update({trial_expira_em:'2000-01-01T00:00:00Z',licenca_expira_em:null}).eq('id',companies[0]));
  assert.equal(checked(await a.from('products_services').select('*')).length,0);
  assert.equal(checked(await a.rpc('get_my_company_context')).length,1);
  assert.ok((await a.storage.from('logos').upload(path,png,{contentType:'image/png'})).error);
  pass('expired license blocks operational REST and Storage; renewal context remains');
  checked(await admin.from('platform_admins').insert({user_id:users[2]}));
  assert.equal(checked(await outsider.rpc('is_platform_admin')),true);
  assert.ok((await outsider.rpc('delete_company_admin',{_company_id:companies[0],_actor_id:users[2]})).error);
  for(const id of companies) checked(await admin.rpc('delete_company_admin',{_company_id:id,_actor_id:users[2]}));
  companies.length=0;pass('platform admin identity and server-only atomic deletion');
  results.push({test:'Public signup and hosted Auth Hook',status:'BLOCKED',detail:'Management API/config permission denied; admin creation is not public signup.'});
} catch(e:any){results.push({test:'API integration',status:'FAIL',detail:String(e.message)});console.error('API test failed:',e.code??'ASSERTION',e.message);process.exitCode=1;}
finally{
  try {
    checked(await admin.from('platform_settings').update({permitir_demo:originalDemo}).eq('id',true));
    if(objects.length)checked(await admin.storage.from('logos').remove(objects));
    for(const p of objects)checked(await admin.from('storage_cleanup_jobs').delete().eq('object_path',p));
    for(const id of companies)checked(await admin.from('companies').delete().eq('id',id));
    for(const id of users)checked(await admin.auth.admin.deleteUser(id));
    pass('synthetic users, companies and objects cleaned');
  }catch(e:any){results.push({test:'cleanup',status:'FAIL',detail:e.message});process.exitCode=1;}
  fs.writeFileSync(new URL('reports/homologation-api-tests.json',root),JSON.stringify(results,null,2));
}
