-- NEW baseline contract tests. Synthetic Auth rows, one transaction, always rollback.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('20000000-0000-4000-8000-000000000001','hml-a@example.invalid','{"nome":"Synthetic A","telefone":"000","cpf":"000","cnpj":"000","cidade":"Test","uf":"SP"}'),
 ('20000000-0000-4000-8000-000000000002','hml-b@example.invalid','{}'),
 ('20000000-0000-4000-8000-000000000003','hml-admin@example.invalid','{}'),
 ('20000000-0000-4000-8000-000000000099','hml-none@example.invalid','{}');
SELECT pg_temp.assert_true((SELECT nome='Synthetic A' AND telefone='000' AND email='hml-a@example.invalid' AND uf='SP' FROM public.profiles WHERE id='20000000-0000-4000-8000-000000000001'),'profile metadata/auth email');
SELECT pg_temp.assert_true(public.hook_enforce_signup_enabled('{}')->'error' IS NOT NULL,'signup disabled');
UPDATE public.platform_settings SET dias_teste=7,permitir_demo=true,permitir_cadastros=true;
SELECT pg_temp.assert_true(public.hook_enforce_signup_enabled('{}')='{}','signup explicitly enabled');
INSERT INTO public.companies(id,owner_id,nome) VALUES
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','HML A'),
 ('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','HML B');
SELECT pg_temp.assert_true((SELECT trial_expira_em=created_at+interval '7 days' FROM public.companies WHERE id='10000000-0000-4000-8000-000000000001'),'configured trial');
UPDATE public.platform_settings SET dias_teste=0;
SELECT pg_temp.assert_true((SELECT trial_expira_em=created_at+interval '7 days' FROM public.companies WHERE id='10000000-0000-4000-8000-000000000001'),'trial not recalculated');
INSERT INTO public.companies(id,owner_id,nome) VALUES('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','Zero trial');
SELECT pg_temp.assert_true((SELECT trial_expira_em=created_at FROM public.companies WHERE id='10000000-0000-4000-8000-000000000003'),'zero trial is not replaced by 30');
DELETE FROM public.platform_settings;
SELECT pg_temp.assert_true(public.hook_enforce_signup_enabled('{}')->'error' IS NOT NULL,'signup absent config closed');
INSERT INTO public.companies(id,owner_id,nome) VALUES('10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000003','Fallback trial');
SELECT pg_temp.assert_true((SELECT trial_expira_em=created_at+interval '30 days' FROM public.companies WHERE id='10000000-0000-4000-8000-000000000004'),'absent config fallback 30');
INSERT INTO public.platform_settings(id,permitir_demo,permitir_cadastros) VALUES(true,true,true);
INSERT INTO public.platform_admins(user_id) VALUES('20000000-0000-4000-8000-000000000003');
INSERT INTO public.products_services(id,company_id,tipo,nome,estoque) VALUES
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','produto','A',5),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','servico','B',null);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.company_members),'membership automatic/isolated');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.profiles),'profiles isolated');
UPDATE public.profiles SET cidade='Edited' WHERE id=auth.uid();
SELECT pg_temp.assert_true((SELECT cidade='Edited' FROM public.profiles),'own profile editable');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.products_services),'operational SELECT isolated');
SELECT pg_temp.assert_true(public.is_owner('10000000-0000-4000-8000-000000000001'),'owner helper');
SELECT pg_temp.assert_true(NOT public.is_member('10000000-0000-4000-8000-000000000002'),'nonmember helper');
SELECT pg_temp.assert_true(public.can_access_logo('10000000-0000-4000-8000-000000000001/logo-test.png',true),'own logo write');
SELECT pg_temp.assert_true(NOT public.can_access_logo('10000000-0000-4000-8000-000000000002/logo-test.png',false),'cross logo denied');
DO $$ BEGIN
 BEGIN
  INSERT INTO public.products_services(company_id,tipo,nome) VALUES('10000000-0000-4000-8000-000000000002','produto','Forbidden');
  RAISE EXCEPTION 'cross insert accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.products_services SET company_id='10000000-0000-4000-8000-000000000002' WHERE id='30000000-0000-4000-8000-000000000001';
  RAISE EXCEPTION 'tenant reassignment accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.companies SET licenca_expira_em=now()+interval '10 years' WHERE id='10000000-0000-4000-8000-000000000001';
  RAISE EXCEPTION 'license tampering accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM * FROM public.platform_secrets;
  RAISE EXCEPTION 'secrets readable';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.company_members(company_id,user_id,role) VALUES('10000000-0000-4000-8000-000000000002',auth.uid(),'proprietario');
  RAISE EXCEPTION 'self enrollment accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.products_services SET nome='Must not change' WHERE company_id='10000000-0000-4000-8000-000000000002';
DELETE FROM public.products_services WHERE company_id='10000000-0000-4000-8000-000000000002';
INSERT INTO public.products_services(company_id,tipo,nome,estoque) VALUES('10000000-0000-4000-8000-000000000001','servico','Own CRUD',null);
UPDATE public.products_services SET nome='Own updated' WHERE nome='Own CRUD';
DELETE FROM public.products_services WHERE nome='Own updated';
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.products_services),'own CRUD completed');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.get_my_company_context()),'context isolated');
SELECT public.queue_logo_cleanup('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001/logo-old.png');
RESET ROLE;
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.storage_cleanup_jobs),'cleanup persisted');
SELECT pg_temp.assert_true((SELECT nome='B' FROM public.products_services WHERE id='30000000-0000-4000-8000-000000000002'),'cross UPDATE/DELETE denied');
UPDATE public.companies SET trial_expira_em=now()-interval '1 day',licenca_expira_em=null WHERE id='10000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.products_services),'expired reads blocked');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.companies),'expired full company blocked');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.get_my_company_context() WHERE faturamento_mensal=0),'expired renewal context');
SELECT pg_temp.assert_true(NOT public.can_access_logo('10000000-0000-4000-8000-000000000001/logo.png',false),'expired storage blocked');
DO $$ BEGIN
 BEGIN
  INSERT INTO public.products_services(company_id,tipo,nome) VALUES('10000000-0000-4000-8000-000000000001','produto','Expired');
  RAISE EXCEPTION 'expired write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.companies SET licenca_expira_em=now()+interval '1 day' WHERE id='10000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true(public.tenant_license_active('10000000-0000-4000-8000-000000000001'),'paid license overrides expired trial');
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000099',true);
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.get_my_company_context()),'no membership context empty');
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
SELECT pg_temp.assert_true(public.is_platform_admin(),'platform admin');
SELECT pg_temp.assert_true(NOT public.is_platform_admin('20000000-0000-4000-8000-000000000001'),'admin identity cannot spoof');
RESET ROLE;
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname IN ('public','precifica_private') AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE'),'no PUBLIC definer execute');
ROLLBACK;
