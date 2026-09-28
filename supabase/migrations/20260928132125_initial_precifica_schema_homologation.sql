-- NEW HOMOLOGATION BASELINE. Not recovered production history.
-- Target: adkfebcanubebtmqyram. Never apply to bjtyeikuomxudmtdxtrp.
-- Column contract: current application/types; defaults below are NEW explicit decisions.
-- Reviewed security adapters from recovery files; those files remain untouched.
-- AI remains fail-closed pending an approved quota/reset contract.
DO $$ BEGIN
 IF current_setting('precifica.homologation_project',true) IS DISTINCT FROM 'adkfebcanubebtmqyram' THEN
  RAISE EXCEPTION 'Explicit homologation target required';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public') THEN
  RAISE EXCEPTION 'Baseline requires empty public schema; inspect existing structures first';
 END IF;
END $$;

CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefone text,
  cpf text,
  cnpj text,
  cidade text,
  uf text
);

CREATE TABLE public.companies (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  ramo text,
  regime_tributario text,
  faturamento_mensal numeric NOT NULL DEFAULT 0,
  vendas_mensais numeric NOT NULL DEFAULT 0,
  pro_labore numeric NOT NULL DEFAULT 0,
  imposto_percentual numeric NOT NULL DEFAULT 0,
  comissao_padrao numeric NOT NULL DEFAULT 0,
  margem_padrao numeric NOT NULL DEFAULT 30,
  arredondamento text NOT NULL DEFAULT 'nenhum',
  onboarding_completo boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  logo_url text,
  trial_expira_em timestamptz,
  licenca_expira_em timestamptz
);

CREATE TABLE public.company_members (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role = 'proprietario')
);

CREATE TABLE public.products_services (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_demo boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL CHECK (tipo IN ('produto','servico')),
  nome text NOT NULL,
  categoria text,
  descricao text,
  sku text,
  observacoes text,
  custo_aquisicao numeric NOT NULL DEFAULT 0,
  embalagem numeric NOT NULL DEFAULT 0,
  frete numeric NOT NULL DEFAULT 0,
  outros_custos numeric NOT NULL DEFAULT 0,
  estoque numeric DEFAULT 0,
  horas numeric NOT NULL DEFAULT 0,
  valor_hora numeric NOT NULL DEFAULT 0,
  materiais numeric NOT NULL DEFAULT 0,
  deslocamento numeric NOT NULL DEFAULT 0,
  terceirizados numeric NOT NULL DEFAULT 0,
  preco_atual numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  CHECK (tipo <> 'produto' OR estoque IS NOT NULL)
);

CREATE TABLE public.employees (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_demo boolean NOT NULL DEFAULT false,
  nome text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  salario numeric NOT NULL DEFAULT 0,
  beneficios numeric NOT NULL DEFAULT 0,
  outros_custos numeric NOT NULL DEFAULT 0,
  encargos_percentual numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE public.expenses (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_demo boolean NOT NULL DEFAULT false,
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  valor numeric NOT NULL DEFAULT 0,
  recorrencia text NOT NULL DEFAULT 'mensal',
  dia_vencimento integer,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE public.payment_methods (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_demo boolean NOT NULL DEFAULT false,
  tipo text NOT NULL,
  nome text NOT NULL,
  parcelas integer NOT NULL DEFAULT 1 CHECK (parcelas > 0),
  taxa_percentual numeric NOT NULL DEFAULT 0,
  tarifa_fixa numeric NOT NULL DEFAULT 0,
  prazo_recebimento integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE public.pricing_calculations (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_demo boolean NOT NULL DEFAULT false,
  item_id uuid,
  item_nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('produto','servico')),
  modo text NOT NULL DEFAULT 'ideal' CHECK (modo IN ('ideal','minimo','promocional')),
  forma_pagamento text NOT NULL DEFAULT 'pix',
  parcelas integer NOT NULL DEFAULT 1 CHECK (parcelas > 0),
  custo_direto numeric NOT NULL DEFAULT 0,
  custo_fixo_venda numeric NOT NULL DEFAULT 0,
  impostos_percentual numeric NOT NULL DEFAULT 0,
  comissao_percentual numeric NOT NULL DEFAULT 0,
  taxa_percentual numeric NOT NULL DEFAULT 0,
  tarifa_fixa numeric NOT NULL DEFAULT 0,
  lucro_percentual numeric NOT NULL DEFAULT 0,
  desconto_percentual numeric NOT NULL DEFAULT 0,
  preco_sugerido numeric NOT NULL DEFAULT 0,
  preco_minimo numeric NOT NULL DEFAULT 0,
  preco_atual numeric NOT NULL DEFAULT 0,
  valor_liquido numeric NOT NULL DEFAULT 0,
  lucro_liquido numeric NOT NULL DEFAULT 0,
  margem_liquida numeric NOT NULL DEFAULT 0,
  margem_contribuicao numeric NOT NULL DEFAULT 0,
  markup numeric NOT NULL DEFAULT 0,
  classificacao text NOT NULL DEFAULT '',
  observacoes text
);

CREATE TABLE public.pricing_scenarios (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  calculation_id uuid NOT NULL,
  nome text NOT NULL
);

CREATE TABLE public.platform_admins (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_settings (
  id boolean NOT NULL PRIMARY KEY DEFAULT true CHECK (id),
  margem_padrao numeric NOT NULL DEFAULT 30,
  imposto_padrao numeric NOT NULL DEFAULT 0,
  comissao_padrao numeric NOT NULL DEFAULT 0,
  arredondamento text NOT NULL DEFAULT 'nenhum',
  permitir_cadastros boolean NOT NULL DEFAULT false,
  permitir_demo boolean NOT NULL DEFAULT false,
  mensagem_aviso text,
  preco_licenca numeric NOT NULL DEFAULT 129.9,
  meses_licenca integer NOT NULL DEFAULT 12 CHECK (meses_licenca > 0),
  dias_teste integer NOT NULL DEFAULT 30 CHECK (dias_teste >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_secrets (
  id boolean NOT NULL PRIMARY KEY DEFAULT true CHECK (id),
  mercadopago_ativo boolean NOT NULL DEFAULT false,
  mercadopago_access_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.license_payments (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  valor numeric NOT NULL DEFAULT 0,
  meses integer NOT NULL DEFAULT 12 CHECK (meses > 0),
  status text NOT NULL DEFAULT 'pendente',
  provider text NOT NULL DEFAULT 'mercadopago' CHECK (provider = 'mercadopago'),
  preference_id text,
  init_point text
);

CREATE TABLE public.storage_cleanup_jobs (
  bucket_id text NOT NULL,
  object_path text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  PRIMARY KEY (bucket_id,object_path),
  CHECK (bucket_id='logos')
);
CREATE SCHEMA IF NOT EXISTS precifica_private;
REVOKE ALL ON SCHEMA precifica_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT auth.uid() IS NOT NULL AND _user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_license_active(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id AND auth.uid() IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.company_members m
        WHERE m.company_id = c.id AND m.user_id = auth.uid())
      AND (c.licenca_expira_em > now() OR
        coalesce(c.trial_expira_em, c.created_at + interval '30 days') > now())
  );
$$;
REVOKE ALL ON FUNCTION public.tenant_license_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_license_active(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_write(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  -- Only 'proprietario' is evidenced by the available SQL. Unknown roles cannot write.
  -- TODO DE RECUPERAÇÃO/VALIDAÇÃO: restore the original permission matrix for employees.
  SELECT public.tenant_license_active(_company_id) AND EXISTS (
    SELECT 1 FROM public.company_members m JOIN public.companies c ON c.id = m.company_id
    WHERE c.id = _company_id AND c.owner_id = auth.uid()
      AND m.user_id = auth.uid() AND m.role = 'proprietario'
  );
$$;
REVOKE ALL ON FUNCTION public.can_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write(uuid) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS baseline_members_company_user ON public.company_members(company_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS baseline_payment_method_key ON public.payment_methods(company_id, tipo, parcelas);

CREATE OR REPLACE FUNCTION precifica_private.initialize_company_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  INSERT INTO public.company_members(company_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'proprietario') ON CONFLICT (company_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION precifica_private.initialize_company_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER baseline_initialize_company_owner AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION precifica_private.initialize_company_owner();

CREATE OR REPLACE FUNCTION precifica_private.protect_company_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.owner_id IS DISTINCT FROM auth.uid() OR NEW.licenca_expira_em IS NOT NULL THEN
        RAISE EXCEPTION 'Company ownership/license cannot be supplied by this caller' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.id IS DISTINCT FROM OLD.id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.trial_expira_em IS DISTINCT FROM OLD.trial_expira_em
      OR NEW.licenca_expira_em IS DISTINCT FROM OLD.licenca_expira_em THEN
      RAISE EXCEPTION 'Protected company fields' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION precifica_private.protect_company_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER baseline_protect_company_fields BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION precifica_private.protect_company_fields();

CREATE OR REPLACE FUNCTION precifica_private.protect_tenant_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND (NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'Tenant reassignment is forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION precifica_private.protect_tenant_reference() FROM PUBLIC, anon, authenticated;

-- Restrictive fences also constrain any older permissive policies. Existing
-- restrictive policies are retained; conflicts must be audited, not bypassed.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products_services','employees','expenses','payment_methods',
    'pricing_calculations','pricing_scenarios'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('CREATE POLICY baseline_read ON public.%I FOR SELECT TO authenticated USING (public.tenant_license_active(company_id))', t);
    EXECUTE format('CREATE POLICY baseline_write ON public.%I FOR ALL TO authenticated USING (public.can_write(company_id)) WITH CHECK (public.can_write(company_id))', t);
    EXECUTE format('CREATE POLICY baseline_read_fence ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.tenant_license_active(company_id))', t);
    EXECUTE format('CREATE POLICY baseline_insert_fence ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_write(company_id))', t);
    EXECUTE format('CREATE POLICY baseline_update_fence ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_write(company_id)) WITH CHECK (public.can_write(company_id))', t);
    EXECUTE format('CREATE POLICY baseline_delete_fence ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.can_write(company_id))', t);
    EXECUTE format('CREATE TRIGGER baseline_protect_tenant BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION precifica_private.protect_tenant_reference()', t);
  END LOOP;
END $$;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.companies FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.companies TO service_role;
GRANT SELECT ON public.companies TO authenticated;

GRANT UPDATE (nome, ramo, regime_tributario, faturamento_mensal, vendas_mensais,
  pro_labore, imposto_percentual, comissao_padrao, margem_padrao, arredondamento,
  onboarding_completo, is_demo, logo_url) ON public.companies TO authenticated;
CREATE POLICY baseline_company_read ON public.companies FOR SELECT TO authenticated USING (public.tenant_license_active(id));
CREATE POLICY baseline_company_read_fence ON public.companies AS RESTRICTIVE FOR SELECT TO authenticated USING (public.tenant_license_active(id));
CREATE POLICY baseline_company_insert ON public.companies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY baseline_company_insert_fence ON public.companies AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY baseline_company_update ON public.companies FOR UPDATE TO authenticated USING (public.can_write(id)) WITH CHECK (public.can_write(id));
CREATE POLICY baseline_company_update_fence ON public.companies AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_write(id)) WITH CHECK (public.can_write(id));

-- No self-enrolment, self-promotion, payment mutation or client secret access.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['company_members','platform_admins','license_payments','platform_secrets','platform_settings','profiles'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
GRANT SELECT ON public.company_members, public.platform_admins, public.license_payments TO authenticated;
CREATE POLICY baseline_member_self ON public.company_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY baseline_member_self_fence ON public.company_members AS RESTRICTIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY baseline_admin_self ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY baseline_admin_self_fence ON public.platform_admins AS RESTRICTIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY baseline_payment_read ON public.license_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = license_payments.company_id AND m.user_id = auth.uid()));
CREATE POLICY baseline_payment_read_fence ON public.license_payments AS RESTRICTIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = license_payments.company_id AND m.user_id = auth.uid()));
GRANT SELECT (id, preco_licenca, meses_licenca, dias_teste, permitir_cadastros, permitir_demo,
  mensagem_aviso, margem_padrao, imposto_padrao, comissao_padrao, arredondamento) ON public.platform_settings TO authenticated;
CREATE POLICY baseline_settings_read ON public.platform_settings FOR SELECT TO authenticated USING (id = true);
CREATE POLICY baseline_settings_read_fence ON public.platform_settings AS RESTRICTIVE FOR SELECT TO authenticated USING (id = true);
GRANT SELECT ON public.profiles TO authenticated;
CREATE POLICY baseline_profile_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY baseline_profile_read_fence ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING (id = auth.uid());

CREATE FUNCTION public.is_member(_company_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.company_members WHERE company_id=_company_id AND user_id=auth.uid());
$$;
CREATE FUNCTION public.is_owner(_company_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.companies c JOIN public.company_members m ON m.company_id=c.id
 WHERE c.id=_company_id AND c.owner_id=auth.uid() AND m.user_id=auth.uid() AND m.role='proprietario');
$$;
REVOKE ALL ON FUNCTION public.is_member(uuid),public.is_owner(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_member(uuid),public.is_owner(uuid) TO authenticated;

CREATE FUNCTION precifica_private.create_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO public.profiles(id,email,nome,telefone,cpf,cnpj,cidade,uf)
 VALUES(NEW.id,coalesce(NEW.email,''),coalesce(NEW.raw_user_meta_data->>'nome',''),
 nullif(NEW.raw_user_meta_data->>'telefone',''),nullif(NEW.raw_user_meta_data->>'cpf',''),
 nullif(NEW.raw_user_meta_data->>'cnpj',''),nullif(NEW.raw_user_meta_data->>'cidade',''),nullif(NEW.raw_user_meta_data->>'uf',''));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION precifica_private.create_profile() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER baseline_auth_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION precifica_private.create_profile();
GRANT UPDATE(nome,telefone,cpf,cnpj,cidade,uf) ON public.profiles TO authenticated;
CREATE POLICY baseline_profile_update ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());

CREATE FUNCTION precifica_private.initialize_trial() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE days integer;
BEGIN
 SELECT dias_teste INTO days FROM public.platform_settings WHERE id=true;
 NEW.trial_expira_em := coalesce(NEW.trial_expira_em,NEW.created_at+make_interval(days=>coalesce(days,30)));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION precifica_private.initialize_trial() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER baseline_trial BEFORE INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION precifica_private.initialize_trial();

INSERT INTO public.platform_settings(id,permitir_cadastros,permitir_demo) VALUES(true,false,false);
INSERT INTO public.platform_secrets(id,mercadopago_ativo) VALUES(true,false);
CREATE UNIQUE INDEX IF NOT EXISTS baseline_item_id_company ON public.products_services(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS baseline_calculation_id_company ON public.pricing_calculations(id, company_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.pricing_calculations'::regclass AND conname = 'pricing_calculations_item_same_company_fk') THEN
    ALTER TABLE public.pricing_calculations ADD CONSTRAINT pricing_calculations_item_same_company_fk
      FOREIGN KEY (item_id, company_id) REFERENCES public.products_services(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.pricing_scenarios'::regclass AND conname = 'pricing_scenarios_calculation_same_company_fk') THEN
    ALTER TABLE public.pricing_scenarios ADD CONSTRAINT pricing_scenarios_calculation_same_company_fk
      FOREIGN KEY (calculation_id, company_id) REFERENCES public.pricing_calculations(id, company_id);
  END IF;
END $$;

-- Technical recovery ledger: NOT claimed to be the original payment schema.
-- It stores precisely the before/after effect needed by the idempotency tests.
CREATE TABLE precifica_private.payment_effects (
  charge_id uuid PRIMARY KEY REFERENCES public.license_payments(id) ON DELETE RESTRICT,
  payment_id text NOT NULL UNIQUE,
  live_mode boolean NOT NULL,
  applied_at timestamptz,
  reversed_at timestamptz,
  previous_expiration timestamptz,
  applied_expiration timestamptz
);
REVOKE ALL ON precifica_private.payment_effects FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.process_mercado_pago_payment(
  _charge_id uuid, _payment_id text, _provider_status text, _status_detail text, _live_mode boolean
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  charge public.license_payments%ROWTYPE;
  effect precifica_private.payment_effects%ROWTYPE;
  current_expiration timestamptz;
  new_expiration timestamptz;
  reverse_event boolean;
BEGIN
  IF _live_mode IS DISTINCT FROM false THEN RAISE EXCEPTION 'Homologation accepts sandbox only'; END IF;
  IF _payment_id IS NULL OR _payment_id !~ '^[0-9]+$' OR _live_mode IS NULL THEN
    RAISE EXCEPTION 'Invalid provider identity';
  END IF;
  SELECT * INTO STRICT charge FROM public.license_payments WHERE id = _charge_id FOR UPDATE;
  IF charge.provider IS DISTINCT FROM 'mercadopago' OR charge.meses IS NULL OR charge.meses <= 0 THEN
    RAISE EXCEPTION 'Invalid charge contract';
  END IF;
  SELECT licenca_expira_em INTO STRICT current_expiration FROM public.companies
    WHERE id = charge.company_id FOR UPDATE;
  SELECT * INTO effect FROM precifica_private.payment_effects WHERE charge_id = _charge_id;
  IF NOT FOUND THEN
    -- Do not grant a previously handled historical charge again with an empty recovery ledger.
    IF charge.status IS DISTINCT FROM 'pendente' THEN
      RAISE EXCEPTION 'TODO DE RECUPERAÇÃO/VALIDAÇÃO: reconcile historical charge %', _charge_id;
    END IF;
    INSERT INTO precifica_private.payment_effects(charge_id, payment_id, live_mode)
      VALUES (_charge_id, _payment_id, _live_mode) RETURNING * INTO effect;
  ELSIF effect.payment_id <> _payment_id OR effect.live_mode <> _live_mode THEN
    RAISE EXCEPTION 'Conflicting payment identity or environment';
  END IF;

  IF effect.reversed_at IS NOT NULL THEN RETURN 'duplicate'; END IF;
  reverse_event := _provider_status IN ('refunded','cancelled','charged_back') OR _status_detail = 'partially_refunded';
  IF reverse_event THEN
    IF effect.applied_at IS NOT NULL THEN
      -- Never silently subtract a different/manual/overlapping grant.
      IF current_expiration IS DISTINCT FROM effect.applied_expiration THEN
        RAISE EXCEPTION 'TODO DE RECUPERAÇÃO/VALIDAÇÃO: overlapping license grants require historical reconciliation';
      END IF;
      UPDATE public.companies SET licenca_expira_em = effect.previous_expiration WHERE id = charge.company_id;
    END IF;
    UPDATE precifica_private.payment_effects SET reversed_at = now() WHERE charge_id = _charge_id;
    UPDATE public.license_payments SET status = _provider_status WHERE id = _charge_id;
    RETURN CASE WHEN effect.applied_at IS NOT NULL THEN 'reversed' ELSE 'recorded' END;
  ELSIF _provider_status = 'approved' THEN
    IF effect.applied_at IS NOT NULL THEN RETURN 'duplicate'; END IF;
    new_expiration := greatest(now(), current_expiration) + make_interval(months => charge.meses);
    UPDATE public.companies SET licenca_expira_em = new_expiration WHERE id = charge.company_id;
    UPDATE precifica_private.payment_effects SET applied_at = now(),
      previous_expiration = current_expiration, applied_expiration = new_expiration WHERE charge_id = _charge_id;
    UPDATE public.license_payments SET status = 'approved' WHERE id = _charge_id;
    RETURN 'activated';
  ELSE
    IF effect.applied_at IS NOT NULL THEN RETURN 'duplicate'; END IF;
    UPDATE public.license_payments SET status = CASE WHEN _provider_status = 'pending' THEN 'pendente' ELSE _provider_status END WHERE id = _charge_id;
    RETURN 'recorded';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.process_mercado_pago_payment(uuid,text,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_mercado_pago_payment(uuid,text,text,text,boolean) TO service_role;

-- ledger/backfill, overlapping refunds and concurrent provider fetch ordering.
-- The HTTP verifier must check amount, currency, external reference and environment
-- before this service-role-only transaction; the RPC is never callable by clients.
CREATE OR REPLACE FUNCTION public.hook_enforce_signup_enabled(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  -- Fail closed if configuration is missing; never trust signup user_metadata.
  IF NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE id = true AND permitir_cadastros) THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 403,
      'message', 'Novos cadastros estão temporariamente desativados.'));
  END IF;
  RETURN '{}'::jsonb;
END $$;
REVOKE ALL ON FUNCTION public.hook_enforce_signup_enabled(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hook_enforce_signup_enabled(jsonb) TO supabase_auth_admin;

CREATE OR REPLACE FUNCTION public.get_my_company_context()
RETURNS SETOF public.companies LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE c public.companies%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  FOR c IN SELECT company.* FROM public.companies company
    JOIN public.company_members m ON m.company_id = company.id
    WHERE m.user_id = auth.uid() ORDER BY company.created_at, company.id LOOP
    IF public.tenant_license_active(c.id) THEN RETURN NEXT c;
    ELSE
      -- Renewal metadata only. Unknown columns become NULL instead of leaking data.
      RETURN NEXT jsonb_populate_record(NULL::public.companies, jsonb_build_object(
        'id', c.id, 'owner_id', c.owner_id, 'nome', c.nome, 'created_at', c.created_at,
        'trial_expira_em', c.trial_expira_em, 'licenca_expira_em', c.licenca_expira_em,
        'faturamento_mensal', 0, 'pro_labore', 0, 'vendas_mensais', 0,
        'imposto_percentual', 0, 'comissao_padrao', 0, 'margem_padrao', 0,
        'arredondamento', 'nenhum', 'onboarding_completo', true, 'is_demo', false));
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.get_my_company_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_company_context() TO authenticated;

CREATE TABLE IF NOT EXISTS public.storage_cleanup_jobs (
  bucket_id text NOT NULL CHECK (bucket_id = 'logos'),
  object_path text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  PRIMARY KEY (bucket_id, object_path)
);
ALTER TABLE public.storage_cleanup_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_cleanup_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.storage_cleanup_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.queue_logo_cleanup(_company_id uuid, _object_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE current_logo text;
BEGIN
  IF NOT public.can_write(_company_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  SELECT logo_url INTO STRICT current_logo FROM public.companies WHERE id = _company_id FOR UPDATE;
  IF _object_path IS NULL OR split_part(_object_path, '/', 1) <> _company_id::text
    OR _object_path ~ '(^|/)\.\.(/|$)' OR position(E'\\' in _object_path) > 0
    OR _object_path = current_logo THEN RAISE EXCEPTION 'Invalid or active logo path'; END IF;
  INSERT INTO public.storage_cleanup_jobs(bucket_id, object_path) VALUES ('logos', _object_path)
    ON CONFLICT (bucket_id, object_path) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.queue_logo_cleanup(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_logo_cleanup(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_company_admin(_company_id uuid, _actor_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE logo text;
BEGIN
  -- Only service_role can call; actor comes from the server's verified user context.
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _actor_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT logo_url INTO STRICT logo FROM public.companies WHERE id = _company_id FOR UPDATE;
  IF logo IS NOT NULL THEN
    IF split_part(logo, '/', 1) <> _company_id::text OR logo ~ '(^|/)\.\.(/|$)' THEN
      RAISE EXCEPTION 'Invalid tenant logo path';
    END IF;
    INSERT INTO public.storage_cleanup_jobs(bucket_id, object_path) VALUES ('logos', logo)
      ON CONFLICT (bucket_id, object_path) DO NOTHING;
  END IF;
  -- Existing FK behavior must be recovered. Never invent cascade deletion of real data.
  DELETE FROM public.companies WHERE id = _company_id;
  RETURN logo;
END $$;
REVOKE ALL ON FUNCTION public.delete_company_admin(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_company_admin(uuid,uuid) TO service_role;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logos', 'logos', false, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.can_access_logo(_path text, _write boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE tenant uuid;
BEGIN
  IF auth.uid() IS NULL OR _path IS NULL OR _path ~ '(^|/)\.\.(/|$)' THEN RETURN false; END IF;
  BEGIN tenant := split_part(_path, '/', 1)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN RETURN false; END;
  RETURN CASE WHEN _write THEN public.can_write(tenant) ELSE public.tenant_license_active(tenant) END;
END $$;
REVOKE ALL ON FUNCTION public.can_access_logo(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_logo(text,boolean) TO authenticated;
CREATE POLICY baseline_logo_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'logos' AND public.can_access_logo(name, false));
CREATE POLICY baseline_logo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos' AND public.can_access_logo(name, true));
CREATE POLICY baseline_logo_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos' AND public.can_access_logo(name, true)) WITH CHECK (bucket_id = 'logos' AND public.can_access_logo(name, true));
CREATE POLICY baseline_logo_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos' AND public.can_access_logo(name, true));
CREATE POLICY baseline_logo_read_fence ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (bucket_id <> 'logos' OR public.can_access_logo(name, false));
CREATE POLICY baseline_logo_insert_fence ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id <> 'logos' OR public.can_access_logo(name, true));
CREATE POLICY baseline_logo_update_fence ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (bucket_id <> 'logos' OR public.can_access_logo(name, true)) WITH CHECK (bucket_id <> 'logos' OR public.can_access_logo(name, true));
CREATE POLICY baseline_logo_delete_fence ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING (bucket_id <> 'logos' OR public.can_access_logo(name, true));
CREATE POLICY baseline_logo_anon_fence ON storage.objects AS RESTRICTIVE FOR ALL TO anon USING (bucket_id <> 'logos') WITH CHECK (bucket_id <> 'logos');

-- Preserve database defaults by inserting only explicitly supplied, permitted keys.
CREATE OR REPLACE FUNCTION public.create_company_with_payment_methods(_company jsonb, _payment_methods jsonb)
-- Definer is required for INSERT RETURNING before the AFTER INSERT membership
-- trigger becomes visible to RLS. Caller identity and writable fields are fixed below.
RETURNS public.companies LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  allowed text[] := ARRAY['nome','ramo','regime_tributario','faturamento_mensal','vendas_mensais',
    'pro_labore','imposto_percentual','comissao_padrao','margem_padrao','arredondamento','onboarding_completo','is_demo'];
  keys text; values_sql text; payload jsonb; c public.companies%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(_company) IS DISTINCT FROM 'object' OR jsonb_typeof(_payment_methods) IS DISTINCT FROM 'array'
    OR coalesce(length(trim(_company->>'nome')),0) < 2 THEN RAISE EXCEPTION 'Invalid company payload'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(_company) k WHERE NOT k = ANY(allowed)) THEN
    RAISE EXCEPTION 'Protected/unknown company fields';
  END IF;
  IF coalesce((_company->>'is_demo')::boolean, false) AND NOT EXISTS (
    SELECT 1 FROM public.platform_settings WHERE id = true AND permitir_demo) THEN
    RAISE EXCEPTION 'Demo disabled' USING ERRCODE = '42501';
  END IF;
  payload := _company || jsonb_build_object('owner_id', auth.uid());
  SELECT string_agg(format('%I', k), ', ' ORDER BY k), string_agg(format('r.%I', k), ', ' ORDER BY k)
    INTO keys, values_sql FROM jsonb_object_keys(payload) k;
  EXECUTE format('INSERT INTO public.companies (%s) SELECT %s FROM jsonb_populate_record(NULL::public.companies, $1) r RETURNING *', keys, values_sql)
    INTO c USING payload;
  IF NOT public.is_owner(c.id) OR c.licenca_expira_em IS NOT NULL THEN
    RAISE EXCEPTION 'TODO DE RECUPERAÇÃO/VALIDAÇÃO: owner membership and trial defaults must be restored';
  END IF;
  INSERT INTO public.payment_methods(company_id,tipo,nome,parcelas,taxa_percentual,tarifa_fixa,prazo_recebimento,ordem,is_demo)
    SELECT c.id,r.tipo,r.nome,r.parcelas,r.taxa_percentual,r.tarifa_fixa,r.prazo_recebimento,r.ordem,false
    FROM jsonb_populate_recordset(NULL::public.payment_methods, _payment_methods) r
    ON CONFLICT (company_id,tipo,parcelas) DO NOTHING;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.create_company_with_payment_methods(jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company_with_payment_methods(jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.seed_company_demo(_company_id uuid, _payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
DECLARE section text;
BEGIN
  IF NOT public.can_write(_company_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE id = true AND permitir_demo) THEN
    RAISE EXCEPTION 'Demo disabled' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.companies WHERE id = _company_id FOR UPDATE;
  FOREACH section IN ARRAY ARRAY['products','expenses','employees','payments','calculations'] LOOP
    IF jsonb_typeof(_payload->section) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid demo section %', section; END IF;
  END LOOP;
  INSERT INTO public.products_services(id,company_id,tipo,nome,categoria,descricao,sku,custo_aquisicao,
    embalagem,frete,outros_custos,estoque,horas,valor_hora,materiais,deslocamento,terceirizados,preco_atual,ativo,is_demo)
    SELECT r.id,_company_id,r.tipo,r.nome,r.categoria,r.descricao,r.sku,r.custo_aquisicao,
      r.embalagem,r.frete,r.outros_custos,r.estoque,r.horas,r.valor_hora,r.materiais,r.deslocamento,r.terceirizados,r.preco_atual,true,true
    FROM jsonb_populate_recordset(NULL::public.products_services, _payload->'products') r;
  INSERT INTO public.expenses(company_id,descricao,categoria,valor,recorrencia,dia_vencimento,is_demo)
    SELECT _company_id,r.descricao,r.categoria,r.valor,r.recorrencia,r.dia_vencimento,true
    FROM jsonb_populate_recordset(NULL::public.expenses, _payload->'expenses') r;
  INSERT INTO public.employees(company_id,nome,salario,quantidade,encargos_percentual,beneficios,outros_custos,is_demo)
    SELECT _company_id,r.nome,r.salario,r.quantidade,r.encargos_percentual,r.beneficios,r.outros_custos,true
    FROM jsonb_populate_recordset(NULL::public.employees, _payload->'employees') r;
  INSERT INTO public.payment_methods(company_id,tipo,nome,parcelas,taxa_percentual,tarifa_fixa,prazo_recebimento,ordem,is_demo)
    SELECT _company_id,r.tipo,r.nome,r.parcelas,r.taxa_percentual,r.tarifa_fixa,r.prazo_recebimento,r.ordem,true
    FROM jsonb_populate_recordset(NULL::public.payment_methods, _payload->'payments') r
    ON CONFLICT (company_id,tipo,parcelas) DO NOTHING;
  INSERT INTO public.pricing_calculations(company_id,item_id,item_nome,tipo,modo,forma_pagamento,parcelas,
    custo_direto,custo_fixo_venda,impostos_percentual,comissao_percentual,taxa_percentual,tarifa_fixa,
    lucro_percentual,desconto_percentual,preco_sugerido,preco_minimo,preco_atual,valor_liquido,
    lucro_liquido,margem_liquida,margem_contribuicao,markup,classificacao,is_demo)
    SELECT _company_id,r.item_id,r.item_nome,r.tipo,r.modo,r.forma_pagamento,r.parcelas,
      r.custo_direto,r.custo_fixo_venda,r.impostos_percentual,r.comissao_percentual,r.taxa_percentual,r.tarifa_fixa,
      r.lucro_percentual,coalesce(r.desconto_percentual,0),r.preco_sugerido,r.preco_minimo,r.preco_atual,r.valor_liquido,
      r.lucro_liquido,r.margem_liquida,r.margem_contribuicao,r.markup,r.classificacao,true
    FROM jsonb_populate_recordset(NULL::public.pricing_calculations, _payload->'calculations') r;
END $$;
REVOKE ALL ON FUNCTION public.seed_company_demo(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_company_demo(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_company_demo(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT public.can_write(_company_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.companies WHERE id = _company_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.pricing_calculations c JOIN public.products_services p ON p.id = c.item_id
    WHERE p.company_id = _company_id AND p.is_demo AND NOT c.is_demo)
    OR EXISTS (SELECT 1 FROM public.pricing_scenarios s JOIN public.pricing_calculations c ON c.id = s.calculation_id
    WHERE c.company_id = _company_id AND c.is_demo) THEN
    RAISE EXCEPTION 'Remove or detach references to demo records first; no real data was deleted';
  END IF;
  DELETE FROM public.pricing_calculations WHERE company_id = _company_id AND is_demo;
  DELETE FROM public.products_services WHERE company_id = _company_id AND is_demo;
  DELETE FROM public.expenses WHERE company_id = _company_id AND is_demo;
  DELETE FROM public.employees WHERE company_id = _company_id AND is_demo;
  DELETE FROM public.payment_methods WHERE company_id = _company_id AND is_demo;
  UPDATE public.companies SET is_demo = false WHERE id = _company_id AND is_demo;
END $$;
REVOKE ALL ON FUNCTION public.remove_company_demo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_company_demo(uuid) TO authenticated;

-- Unknown historical AI policy: fail closed, never fabricate a billing quota.
CREATE FUNCTION public.consume_ai_rate_limit(_company_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT false $$;
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(uuid) TO authenticated;
COMMENT ON FUNCTION public.consume_ai_rate_limit(uuid) IS 'Disabled: quota window/reset policy requires approval. Not a recovered implementation.';
-- Payments with effects cannot be deleted by company cascade: preserve financial history.
-- Explicit indexes support tenant policies/FKs.
CREATE INDEX company_members_company_idx ON public.company_members(company_id);
CREATE INDEX products_services_company_idx ON public.products_services(company_id);
CREATE INDEX employees_company_idx ON public.employees(company_id);
CREATE INDEX expenses_company_idx ON public.expenses(company_id);
CREATE INDEX payment_methods_company_idx ON public.payment_methods(company_id);
CREATE INDEX pricing_calculations_company_idx ON public.pricing_calculations(company_id);
CREATE INDEX pricing_scenarios_company_idx ON public.pricing_scenarios(company_id);
CREATE INDEX license_payments_company_idx ON public.license_payments(company_id);
CREATE INDEX companies_owner_idx ON public.companies(owner_id);
CREATE INDEX company_members_user_idx ON public.company_members(user_id);
CREATE INDEX license_payments_user_idx ON public.license_payments(user_id);
CREATE INDEX pricing_calculations_item_company_idx ON public.pricing_calculations(item_id,company_id);
CREATE INDEX pricing_scenarios_calculation_company_idx ON public.pricing_scenarios(calculation_id,company_id);
CREATE UNIQUE INDEX license_payments_preference_idx ON public.license_payments(preference_id) WHERE preference_id IS NOT NULL;
NOTIFY pgrst, 'reload schema';
