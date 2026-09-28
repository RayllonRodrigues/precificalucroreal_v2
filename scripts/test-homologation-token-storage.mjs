import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {connect,env,root} from './homologation-db.mjs';
const db=connect({readOnly:false});
const api=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const fake1='synthetic-'+randomUUID(),fake2='synthetic-'+randomUUID();let original,changed=false;
const report={status:'PENDENTE',restored:false};
const check=r=>{if(r.error)throw Error('STORAGE_API_FAILED');return r.data;};
try{
 original=check(await api.from('platform_secrets').select('*').eq('id',true).single());
 if(original.mercadopago_ativo||original.mercadopago_access_token)throw Error('EXISTING_CONFIGURATION_NOT_TOUCHED');
 changed=true;
 check(await api.from('platform_secrets').upsert({id:true,mercadopago_ativo:false,mercadopago_access_token:fake1}));
 check(await api.from('platform_secrets').upsert({id:true,mercadopago_ativo:false,updated_at:new Date().toISOString()}));
 if(check(await api.from('platform_secrets').select('mercadopago_access_token').eq('id',true).single()).mercadopago_access_token!==fake1)throw Error('EMPTY_INPUT_OVERWROTE_TOKEN');
 check(await api.from('platform_secrets').upsert({id:true,mercadopago_ativo:false,mercadopago_access_token:fake2}));
 if(check(await api.from('platform_secrets').select('mercadopago_access_token').eq('id',true).single()).mercadopago_access_token!==fake2)throw Error('REPLACEMENT_FAILED');
 report.status='APROVADA';
}catch(e){report.reason=e.message;}
finally{
 if(changed){
  const restored=await db`update public.platform_secrets set mercadopago_access_token=${original.mercadopago_access_token},updated_at=${original.updated_at}
   where id=true and mercadopago_ativo=false and (mercadopago_access_token=${fake1} or mercadopago_access_token=${fake2}) returning id`;
  report.restored=restored.length===1;
  if(!report.restored){report.status='PENDENTE';report.reason='CONCURRENT_CHANGE_REQUIRES_REVIEW';}
 }
 await db.end();fs.writeFileSync(new URL('reports/homologation-token-storage.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
