import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { connect, env } from './homologation-db.mjs';

export function logoCleanupTenant(bucket, objectPath) {
  if (bucket !== 'logos' || typeof objectPath !== 'string' || objectPath.includes('..')) return null;
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/logo-[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$/.exec(objectPath);
  return match?.[1] ?? null;
}

/** One bounded pass, no scheduler. Locks company before job, matching queue/delete
 * RPC lock order. A crash after object removal leaves the job safely retryable.
 */
export async function runStorageCleanup(db, storage, batchSize = 50, onlyPaths = null) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 200) throw Error('INVALID_BATCH_SIZE');
  const jobs = await db`select bucket_id,object_path from public.storage_cleanup_jobs
    where (${onlyPaths === null} or object_path in
      (select jsonb_array_elements_text(${db.json(onlyPaths ?? [])}::jsonb)))
    order by attempts,bucket_id,object_path limit ${batchSize}`;
  const summary = { removed:0, failed:0, active:0, invalid:0, skipped:0 };
  for (const candidate of jobs) {
    await db.begin(async tx => {
      const tenant = logoCleanupTenant(candidate.bucket_id,candidate.object_path);
      // Never remove a currently referenced logo; the lock spans the Storage call.
      const company = tenant ? await tx`select logo_url from public.companies where id=${tenant} for update` : [];
      const locked = await tx`select bucket_id,object_path from public.storage_cleanup_jobs
        where bucket_id=${candidate.bucket_id} and object_path=${candidate.object_path} for update skip locked`;
      if (!locked.length) {summary.skipped++;return;}
      if (!tenant || company[0]?.logo_url === candidate.object_path) {
        await tx`update public.storage_cleanup_jobs set last_error=${tenant?'ACTIVE_LOGO':'INVALID_LOGO_PATH'}
          where bucket_id=${candidate.bucket_id} and object_path=${candidate.object_path}`;
        summary[tenant?'active':'invalid']++;return;
      }
      let failed = false;
      try {
        const result = await storage.from('logos').remove([candidate.object_path]);
        failed = Boolean(result.error);
      } catch { failed = true; }
      if (failed) {
        await tx`update public.storage_cleanup_jobs set attempts=attempts+1,last_error='STORAGE_REMOVE_FAILED'
          where bucket_id=${candidate.bucket_id} and object_path=${candidate.object_path}`;
        summary.failed++;
      } else {
        await tx`delete from public.storage_cleanup_jobs
          where bucket_id=${candidate.bucket_id} and object_path=${candidate.object_path}`;
        summary.removed++;
      }
    });
  }
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db=connect({readOnly:false});
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) throw Error('SERVICE_KEY_MISSING');
    const client=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{
      auth:{persistSession:false,autoRefreshToken:false},
      global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(15000)})},
    });
    console.log(JSON.stringify(await runStorageCleanup(db,client.storage)));
  } catch(error) {console.error(JSON.stringify({failed:true,code:error.code??'WORKER_FAILED'}));process.exitCode=1;}
  finally {await db.end();}
}
