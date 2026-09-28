import test from "node:test";
import assert from "node:assert/strict";
import { savePaymentAdmin, paymentAdminStatus } from "../src/lib/admin-payment-contract";
import { requireNewPaymentToken } from "../src/lib/payment-configuration";
import { handleMercadoPagoWebhook } from "../src/lib/mercadopago-webhook";
import { obterUrlAplicacao } from "../src/lib/licenca.server";

const input={mercadopagoAtivo:false,precoLicenca:129.9,mesesLicenca:12,diasTeste:30};
test("admin saves explicit token, API response never contains credential",async()=>{
  let stored:any;let authorized=false;
  const response=await savePaymentAdmin({...input,token:" synthetic-secret "},{authorize:async()=>{authorized=true;},hasToken:async()=>false,saveSecret:async v=>{assert.equal(authorized,true);stored=v;},saveSettings:async()=>{}});
  assert.equal(stored.mercadopago_access_token,"synthetic-secret");
  assert.deepEqual(response,{ok:true});
  assert.deepEqual(paymentAdminStatus(stored),{mercadopagoAtivo:false,tokenConfigurado:true});
  assert.doesNotMatch(JSON.stringify([response,paymentAdminStatus(stored)]),/synthetic-secret/);
});
test("normal user is denied before reading or modifying payment secrets",async()=>{
  let touched=false;
  await assert.rejects(savePaymentAdmin({...input,token:"private"},{authorize:async()=>{throw Error("Forbidden");},hasToken:async()=>{touched=true;return true;},saveSecret:async()=>{touched=true;},saveSettings:async()=>{touched=true;}}),/Forbidden/);
  assert.equal(touched,false);
});
test("empty token preserves existing token; only explicit new value replaces it",async()=>{
  let stored={mercadopago_access_token:"existing"};
  const deps={authorize:async()=>{},hasToken:async()=>true,saveSecret:async(v:object)=>{stored={...stored,...v};},saveSettings:async()=>{}};
  await savePaymentAdmin({...input,token:"   "},deps);assert.equal(stored.mercadopago_access_token,"existing");
  await savePaymentAdmin({...input,token:"replacement"},deps);assert.equal(stored.mercadopago_access_token,"replacement");
});
test("missing token prevents activation and persistence; raw errors are sanitized",async()=>{
  let writes=0;
  const deps={authorize:async()=>{},hasToken:async()=>false,saveSecret:async()=>{writes++;},saveSettings:async()=>{writes++;}};
  await assert.rejects(savePaymentAdmin({...input,mercadopagoAtivo:true},deps),/incompleta/);assert.equal(writes,0);
  await assert.rejects(savePaymentAdmin(input,{...deps,saveSecret:async()=>{throw Error("LEAK_ME");}}),e=>e instanceof Error&&!e.message.includes("LEAK_ME"));
});
test("disabled config rejects environment fallback; active without token rejects charge",()=>{
  assert.throws(()=>requireNewPaymentToken({mercadopago_ativo:false,mercadopago_access_token:null},"environment-secret"),/desativados/);
  assert.throws(()=>requireNewPaymentToken({mercadopago_ativo:true,mercadopago_access_token:null},undefined),/incompleta/);
});
test("webhook missing secret never invokes payment processing or exposes details",async()=>{
  let called=false;
  const r=await handleMercadoPagoWebhook(new Request("https://test.invalid/api/public/mercadopago?data.id=123",{method:"POST"}),{secrets:[],toleranceSeconds:300,confirmPayment:async()=>{called=true;}});
  assert.equal(r.status,503);assert.equal(called,false);assert.doesNotMatch(await r.text(),/token|secret/i);
});
test("public callback origin requires HTTPS and explicit allowlist membership",()=>{
  const previousUrl=process.env.APP_URL,previousList=process.env.APP_URL_ALLOWLIST;
  try {
    process.env.APP_URL="https://test-hml.up.railway.app";process.env.APP_URL_ALLOWLIST="https://test-hml.up.railway.app";
    assert.equal(obterUrlAplicacao().origin,"https://test-hml.up.railway.app");
    process.env.APP_URL_ALLOWLIST="";assert.throws(()=>obterUrlAplicacao(),/ALLOWLIST/);
    process.env.APP_URL_ALLOWLIST="https://test-hml.up.railway.app";
    process.env.APP_URL="https://production.example.com";assert.throws(()=>obterUrlAplicacao(),/ALLOWLIST/);
    process.env.APP_URL="http://test-hml.up.railway.app";assert.throws(()=>obterUrlAplicacao(),/HTTPS/);
  }finally{if(previousUrl===undefined)delete process.env.APP_URL;else process.env.APP_URL=previousUrl;if(previousList===undefined)delete process.env.APP_URL_ALLOWLIST;else process.env.APP_URL_ALLOWLIST=previousList;}
});
