-- RECONSTRUCTION, NOT THE HISTORICAL FILE. Do not replay on an existing database.
-- TODO DE RECUPERAÇÃO/VALIDAÇÃO: recover baseline migrations 0000-0009,
-- original checksums, column defaults and all non-owner membership roles.
-- Deliberately blocked until reviewed against a disposable homologation schema.
DO $$
DECLARE t text;
BEGIN
  IF current_setting('precifica.recovery_validated', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'TODO DE RECUPERAÇÃO/VALIDAÇÃO: historical schema and migrations must be reviewed first';
  END IF;
  FOREACH t IN ARRAY ARRAY['companies','company_members','profiles','products_services',
    'employees','expenses','payment_methods','pricing_calculations','pricing_scenarios',
    'platform_admins','platform_settings','platform_secrets','license_payments'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'Missing baseline table public.%: recover its original definition', t;
    END IF;
  END LOOP;
END $$;

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

CREATE UNIQUE INDEX IF NOT EXISTS recovery_members_company_user ON public.company_members(company_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS recovery_payment_method_key ON public.payment_methods(company_id, tipo, parcelas);

CREATE OR REPLACE FUNCTION precifica_private.initialize_company_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  INSERT INTO public.company_members(company_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'proprietario') ON CONFLICT (company_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION precifica_private.initialize_company_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER recovery_initialize_company_owner AFTER INSERT ON public.companies
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
CREATE TRIGGER recovery_protect_company_fields BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION precifica_private.protect_company_fields();

CREATE OR REPLACE FUNCTION precifica_private.protect_tenant_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NEW.company_id IS DISTINCT FROM OLD.company_id THEN
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
    EXECUTE format('CREATE POLICY recovery_read ON public.%I FOR SELECT TO authenticated USING (public.tenant_license_active(company_id))', t);
    EXECUTE format('CREATE POLICY recovery_write ON public.%I FOR ALL TO authenticated USING (public.can_write(company_id)) WITH CHECK (public.can_write(company_id))', t);
    EXECUTE format('CREATE POLICY recovery_read_fence ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.tenant_license_active(company_id))', t);
    EXECUTE format('CREATE POLICY recovery_insert_fence ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_write(company_id))', t);
    EXECUTE format('CREATE POLICY recovery_update_fence ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_write(company_id)) WITH CHECK (public.can_write(company_id))', t);
    EXECUTE format('CREATE POLICY recovery_delete_fence ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.can_write(company_id))', t);
    EXECUTE format('CREATE TRIGGER recovery_protect_tenant BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION precifica_private.protect_tenant_reference()', t);
  END LOOP;
END $$;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.companies FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.companies TO service_role;
GRANT SELECT ON public.companies TO authenticated;
GRANT INSERT (owner_id, nome, ramo, regime_tributario, faturamento_mensal, vendas_mensais,
  pro_labore, imposto_percentual, comissao_padrao, margem_padrao, arredondamento,
  onboarding_completo, is_demo) ON public.companies TO authenticated;
GRANT UPDATE (nome, ramo, regime_tributario, faturamento_mensal, vendas_mensais,
  pro_labore, imposto_percentual, comissao_padrao, margem_padrao, arredondamento,
  onboarding_completo, is_demo, logo_url) ON public.companies TO authenticated;
CREATE POLICY recovery_company_read ON public.companies FOR SELECT TO authenticated USING (public.tenant_license_active(id));
CREATE POLICY recovery_company_read_fence ON public.companies AS RESTRICTIVE FOR SELECT TO authenticated USING (public.tenant_license_active(id));
CREATE POLICY recovery_company_insert ON public.companies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY recovery_company_insert_fence ON public.companies AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY recovery_company_update ON public.companies FOR UPDATE TO authenticated USING (public.can_write(id)) WITH CHECK (public.can_write(id));
CREATE POLICY recovery_company_update_fence ON public.companies AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_write(id)) WITH CHECK (public.can_write(id));

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
CREATE POLICY recovery_member_self ON public.company_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY recovery_member_self_fence ON public.company_members AS RESTRICTIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY recovery_admin_self ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY recovery_admin_self_fence ON public.platform_admins AS RESTRICTIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY recovery_payment_read ON public.license_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = license_payments.company_id AND m.user_id = auth.uid()));
CREATE POLICY recovery_payment_read_fence ON public.license_payments AS RESTRICTIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = license_payments.company_id AND m.user_id = auth.uid()));
GRANT SELECT (id, preco_licenca, meses_licenca, dias_teste, permitir_cadastros, permitir_demo,
  mensagem_aviso, margem_padrao, imposto_padrao, comissao_padrao, arredondamento) ON public.platform_settings TO authenticated;
CREATE POLICY recovery_settings_read ON public.platform_settings FOR SELECT TO authenticated USING (id = true);
CREATE POLICY recovery_settings_read_fence ON public.platform_settings AS RESTRICTIVE FOR SELECT TO authenticated USING (id = true);
GRANT SELECT ON public.profiles TO authenticated;
CREATE POLICY recovery_profile_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY recovery_profile_read_fence ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING (id = auth.uid());
