import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {connect,env,root,project} from './homologation-db.mjs';

// No fabricated address. A dedicated mailbox must be provided by the operator.
const email=env.HOMOLOGATION_TEST_EMAIL?.trim();
const report={status:'PENDENTE',hook:'NOT_CHECKED',signup:'PENDENTE',recovery:'PENDENTE'};
const save=()=>{fs.writeFileSync(new URL('reports/homologation-enabled-signup.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify(report));};
if(!email){report.reason='HOMOLOGATION_TEST_EMAIL_AUSENTE';save();process.exit(0);}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('INVALID_TEST_EMAIL');
const password=env.HOMOLOGATION_TEST_PASSWORD || randomUUID()+'aA1!';
if(password.length<12)throw Error('TEST_PASSWORD_TOO_SHORT');
const timeout=Math.min(600,Math.max(10,Number(env.HOMOLOGATION_TEST_WAIT_SECONDS)||120))*1000;
const run=randomUUID();let interrupted=false;
process.on('SIGINT',()=>{interrupted=true;});process.on('SIGTERM',()=>{interrupted=true;});
const wait=()=>new Promise(resolve=>setTimeout(resolve,5000));
const auth={persistSession:false,autoRefreshToken:false,detectSessionInUrl:false};
const api=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth});
const admin=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth});
const db=connect({readOnly:false});
try{
  // Require a successful reviewed config comparison before opening signup.
  const config=fs.readFileSync(new URL('supabase/config.toml',root),'utf8');
  if(!config.includes(`project_id = "${project}"`)||!config.includes('enabled = true')||!config.includes('pg-functions://postgres/public/hook_enforce_signup_enabled'))throw Error('LOCAL_HOOK_CONFIG_MISMATCH');
  const cli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npx-cli.js');
  const result=spawnSync(process.execPath,[cli,'supabase','config','diff','--project-ref',project],{cwd:fileURLToPath(root),encoding:'utf8',timeout:45000});
  const line=String(result.stdout).split(/\r?\n/).find(line=>line.startsWith('{"schema_version":'));
  if(result.status!==0||!line)throw Error('REMOTE_HOOK_NOT_CONFIRMED');
  const diff=JSON.parse(line);
  if(diff.target?.project_ref!==project||diff.changes.some(c=>c.declared))throw Error('REMOTE_CONFIG_DIFF_REQUIRES_REVIEW');
  report.hook='APROVADO';
  if((await db`select id from auth.users where lower(email)=lower(${email})`).length)throw Error('TEST_EMAIL_ALREADY_EXISTS');
  await db`update public.platform_settings set permitir_cadastros=true where id=true`;
  const metadata={nome:'Homologation signup',telefone:'00000000000',cpf:'00000000000',cnpj:'00000000000000',cidade:'Homologation',uf:'SP',homologation_run:run};
  const signup=await api.auth.signUp({email,password,options:{data:metadata}});
  if(signup.error){report.signupError=signup.error.code??'SIGNUP_FAILED';throw Error('SIGNUP_REJECTED');}
  const users=await db`select id from auth.users where lower(email)=lower(${email}) and raw_user_meta_data->>'homologation_run'=${run}`;
  if(users.length!==1||signup.data.user?.id!==users[0].id)throw Error('AUTH_USER_NOT_CREATED');
  const profiles=await db`select nome,email,telefone,cpf,cnpj,cidade,uf from public.profiles where id=${users[0].id}`;
  if(profiles.length!==1||profiles[0].email.toLowerCase()!==email.toLowerCase()||['nome','telefone','cpf','cnpj','cidade','uf'].some(key=>profiles[0][key]!==metadata[key]))throw Error('PROFILE_METADATA_MISMATCH');
  report.profile='APROVADO';
  // Confirmation must happen through the real email; never auto-confirm via admin.
  console.log('Se houver confirmação de email, use o link recebido na caixa de testes. Nenhum token será impresso.');
  let login;const deadline=Date.now()+timeout;
  do{
    if(interrupted)throw Error('INTERRUPTED');
    login=await api.auth.signInWithPassword({email,password});
    if(!login.error)break;
    if(login.error.code!=='email_not_confirmed')throw Error('LOGIN_FAILED');
    await wait();
  }while(Date.now()<deadline);
  if(login.error||!login.data.session)throw Error('EMAIL_CONFIRMATION_PENDING');
  const verified=await api.auth.getUser();if(verified.error||verified.data.user?.id!==users[0].id)throw Error('SESSION_INVALID');
  report.signup='APROVADO';report.login='APROVADO';report.session='APROVADO';
  const recovery=await api.auth.resetPasswordForEmail(email);
  if(recovery.error){report.recoveryError=recovery.error.code??'RECOVERY_FAILED';throw Error('RECOVERY_REQUEST_FAILED');}
  report.recoveryRequest='APROVADO';
  const linkFile=env.HOMOLOGATION_RECOVERY_LINK_FILE;
  if(!linkFile){report.reason='RECOVERY_EMAIL_LINK_REQUIRED';}
  else{
    console.log('Salve o link recebido no email de recuperação no arquivo configurado; não o envie no chat.');
    const until=Date.now()+timeout;let link;
    while(Date.now()<until&&!interrupted){if(fs.existsSync(linkFile)&&fs.readFileSync(linkFile,'utf8').trim()){link=fs.readFileSync(linkFile,'utf8').trim();break;}await wait();}
    if(!link)throw Error('RECOVERY_LINK_PENDING');
    const url=new URL(link);
    if(url.origin!==new URL(env.SUPABASE_URL).origin||url.searchParams.get('type')!=='recovery')throw Error('INVALID_RECOVERY_LINK');
    const hash=url.searchParams.get('token_hash')??url.searchParams.get('token');if(!hash)throw Error('RECOVERY_TOKEN_MISSING');
    const resetClient=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth});
    const confirmation=await resetClient.auth.verifyOtp({token_hash:hash,type:'recovery'});
    if(confirmation.error||confirmation.data.user?.id!==users[0].id)throw Error('RECOVERY_VERIFICATION_FAILED');
    const nextPassword=randomUUID()+'aA1!';
    if((await resetClient.auth.updateUser({password:nextPassword})).error)throw Error('PASSWORD_RESET_FAILED');
    const fresh=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth});
    const nextLogin=await fresh.auth.signInWithPassword({email,password:nextPassword});
    if(nextLogin.error||!nextLogin.data.session)throw Error('NEW_PASSWORD_LOGIN_FAILED');
    await fresh.auth.signOut();await resetClient.auth.signOut();
    report.recovery='APROVADO';report.status='APROVADO';
  }
}catch(error){report.reason=/^[A-Z_]+$/.test(error.message)?error.message:'TEST_FAILED';}
finally{
  // Close registration before cleanup, including all normal errors and handled signals.
  try{
    await db`update public.platform_settings set permitir_cadastros=false where id=true`;
    const rows=await db`select id from auth.users where lower(email)=lower(${email}) and raw_user_meta_data->>'homologation_run'=${run}`;
    await api.auth.signOut();
    for(const row of rows){
      if((await admin.auth.admin.deleteUser(row.id)).error)throw Error('CLEANUP_FAILED');
      if((await db`select id from public.profiles where id=${row.id}`).length)throw Error('PROFILE_CLEANUP_FAILED');
    }
    const left=await db`select count(*)::int as count from auth.users where raw_user_meta_data->>'homologation_run'=${run}`;
    report.cleaned=left[0].count===0;report.profilesCleaned=true;report.signupDisabled=(await db`select permitir_cadastros from public.platform_settings where id=true`)[0]?.permitir_cadastros===false;
    if(!report.cleaned||!report.signupDisabled)throw Error('FINAL_STATE_FAILED');
  }catch{report.cleanup='FAILED_REQUIRES_OPERATOR';process.exitCode=1;}
  await db.end();save();
}
