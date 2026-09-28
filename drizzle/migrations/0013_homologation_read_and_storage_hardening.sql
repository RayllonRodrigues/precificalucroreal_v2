-- RECONSTRUCTION. Transactional adapters preserve existing application operations.
-- TODO DE RECUPERAÇÃO/VALIDAÇÃO: compare with original schema, policies and grants.
DO $$ BEGIN
  IF current_setting('precifica.recovery_validated', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'TODO DE RECUPERAÇÃO/VALIDAÇÃO: review schema, Storage and transaction adapters first';
  END IF;
END $$;

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
CREATE POLICY recovery_logo_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'logos' AND public.can_access_logo(name, false));
CREATE POLICY recovery_logo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos' AND public.can_access_logo(name, true));
CREATE POLICY recovery_logo_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos' AND public.can_access_logo(name, true)) WITH CHECK (bucket_id = 'logos' AND public.can_access_logo(name, true));
CREATE POLICY recovery_logo_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos' AND public.can_access_logo(name, true));
CREATE POLICY recovery_logo_read_fence ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (bucket_id <> 'logos' OR public.can_access_logo(name, false));
CREATE POLICY recovery_logo_insert_fence ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id <> 'logos' OR public.can_access_logo(name, true));
CREATE POLICY recovery_logo_update_fence ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (bucket_id <> 'logos' OR public.can_access_logo(name, true)) WITH CHECK (bucket_id <> 'logos' OR public.can_access_logo(name, true));
CREATE POLICY recovery_logo_delete_fence ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING (bucket_id <> 'logos' OR public.can_access_logo(name, true));
CREATE POLICY recovery_logo_anon_fence ON storage.objects AS RESTRICTIVE FOR ALL TO anon USING (bucket_id <> 'logos') WITH CHECK (bucket_id <> 'logos');

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
  IF NOT public.can_write(c.id) OR c.licenca_expira_em IS NOT NULL THEN
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
