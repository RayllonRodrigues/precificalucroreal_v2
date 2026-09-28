import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {connect,env,root} from './homologation-db.mjs';
import {runStorageCleanup,logoCleanupTenant} from './storage-cleanup-worker.mjs';
const db=connect({readOnly:false});
const api=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(15000)})}});
const owner=randomUUID(),company=randomUUID();
const paths=[`${company}/logo-retry.png`,`${company}/logo-missing.png`,`${company}/logo-active.png`,`${company}/logo-parallel.png`];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const report=[];
const checked=r=>{if(r.error)throw Error('STORAGE_API_FAILED');return r.data;};
const queue=async p=>db.begin(async tx=>{
 await tx.unsafe('SET LOCAL ROLE authenticated');await tx`select set_config('request.jwt.claim.sub',${owner},true)`;
 await tx`select public.queue_logo_cleanup(${company},${p})`;
});
const run=storage=>runStorageCleanup(db,storage,50,paths);
try{
 await db`insert into auth.users(id,email) values(${owner},${'hml-cleanup-'+owner+'@example.invalid'})`;
 await db`insert into public.companies(id,owner_id,nome) values(${company},${owner},'Synthetic cleanup test')`;
 checked(await api.storage.from('logos').upload(paths[0],png,{contentType:'image/png'}));
 // Failure injected only at the external Storage boundary, with real jobs/RPC/locks.
 const failing={from:()=>({remove:async()=>({error:{statusCode:503}})})};
 assert.ok((await failing.from('logos').remove([paths[0]])).error);await queue(paths[0]);
 assert.equal((await run(failing)).failed,1);
 const job=(await db`select attempts,last_error from public.storage_cleanup_jobs where object_path=${paths[0]}`)[0];
 assert.equal(job.attempts,1);assert.equal(job.last_error,'STORAGE_REMOVE_FAILED');
 report.push('removal failure -> actual queue RPC -> failed retry retained');
 assert.equal((await run(api.storage)).removed,1);assert.ok((await api.storage.from('logos').download(paths[0])).error);
 assert.equal((await run(api.storage)).removed,0);report.push('successful retry removes object/job; repeated run is harmless');
 checked(await api.storage.from('logos').upload(paths[1],png,{contentType:'image/png'}));await queue(paths[1]);
 checked(await api.storage.from('logos').remove([paths[1]]));assert.equal((await run(api.storage)).removed,1);
 report.push('object already removed before commit is safely retried');
 checked(await api.storage.from('logos').upload(paths[2],png,{contentType:'image/png'}));await queue(paths[2]);
 await db`update public.companies set logo_url=${paths[2]} where id=${company}`;
 assert.equal((await run(api.storage)).active,1);assert.ok(checked(await api.storage.from('logos').download(paths[2])));
 await db`update public.companies set logo_url=null where id=${company}`;assert.equal((await run(api.storage)).removed,1);
 report.push('active logo never removed; later replacement allows cleanup');
 checked(await api.storage.from('logos').upload(paths[3],png,{contentType:'image/png'}));await queue(paths[3]);
 const other=connect({readOnly:false});
 try{const outcomes=await Promise.all([run(api.storage),runStorageCleanup(other,api.storage,50,paths)]);assert.equal(outcomes.reduce((n,x)=>n+x.removed,0),1);}finally{await other.end();}
 report.push('two workers process one job safely');
 assert.equal(logoCleanupTenant('other',paths[0]),null);assert.equal(logoCleanupTenant('logos',`${company}/../bad.png`),null);
 report.push('invalid bucket/path rejected');
 console.log(JSON.stringify({status:'PASS',tests:report}));
}catch(e){console.error(JSON.stringify({status:'FAIL',code:e.code,message:e.message}));process.exitCode=1;}
finally{
 checked(await api.storage.from('logos').remove(paths));
 for(const p of paths)await db`delete from public.storage_cleanup_jobs where object_path=${p}`;
 await db`delete from public.companies where id=${company}`;
 await db`delete from auth.users where id=${owner}`;
 await db.end();
 fs.writeFileSync(new URL('reports/homologation-cleanup-tests.json',root),JSON.stringify({status:process.exitCode?'FAIL':'PASS',tests:report,syntheticDataRemoved:true,scheduler:'PENDING'},null,2));
}
