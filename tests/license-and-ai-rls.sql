-- Run only against a local/test database after migration 0012. Every write is rolled back.
BEGIN;

SET CONSTRAINTS ALL DEFERRED;

INSERT INTO public.companies (id, owner_id, nome, trial_expira_em)
VALUES
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Active tenant', now() + interval '1 day'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Expired tenant', now() - interval '1 day');

INSERT INTO public.products_services (id, company_id, tipo, nome)
VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'produto', 'Active item'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'produto', 'Expired item');

INSERT INTO public.license_payments (company_id, user_id, status, valor)
VALUES ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'pendente', 129.90);

INSERT INTO public.platform_admins (user_id)
VALUES ('20000000-0000-4000-8000-000000000003');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);

DO $$
DECLARE
  attempt integer;
  visible_items integer;
BEGIN
  SELECT count(*) INTO visible_items
  FROM public.products_services
  WHERE company_id = '10000000-0000-4000-8000-000000000001';
  IF visible_items <> 1 THEN
    RAISE EXCEPTION 'active tenant could not read operational data';
  END IF;

  INSERT INTO public.products_services (company_id, tipo, nome)
  VALUES ('10000000-0000-4000-8000-000000000001', 'produto', 'Active insert');

  IF NOT public.consume_ai_rate_limit('10000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'active licensed member was rejected';
  END IF;

  FOR attempt IN 2..5 LOOP
    IF NOT public.consume_ai_rate_limit('10000000-0000-4000-8000-000000000001') THEN
      RAISE EXCEPTION 'AI rate limit rejected request % too early', attempt;
    END IF;
  END LOOP;
  IF public.consume_ai_rate_limit('10000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'AI rate limit accepted a sixth request';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);

DO $$
DECLARE
  affected integer;
  visible_items integer;
  visible_company integer;
  direct_company integer;
  visible_payments integer;
BEGIN
  SELECT count(*) INTO visible_items
  FROM public.products_services
  WHERE company_id = '10000000-0000-4000-8000-000000000002';
  IF visible_items <> 0 THEN
    RAISE EXCEPTION 'expired tenant read operational data';
  END IF;

  BEGIN
    INSERT INTO public.products_services (company_id, tipo, nome)
    VALUES ('10000000-0000-4000-8000-000000000002', 'produto', 'Must be blocked');
    RAISE EXCEPTION 'expired tenant write was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  UPDATE public.products_services
  SET nome = 'Must not update'
  WHERE id = '30000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'expired tenant updated operational data';
  END IF;

  DELETE FROM public.products_services
  WHERE id = '30000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'expired tenant deleted operational data';
  END IF;

  SELECT count(*) INTO direct_company
  FROM public.companies
  WHERE id = '10000000-0000-4000-8000-000000000002';
  SELECT count(*) INTO visible_company
  FROM public.get_my_company_context()
  WHERE id = '10000000-0000-4000-8000-000000000002'
    AND faturamento_mensal = 0
    AND pro_labore = 0;
  SELECT count(*) INTO visible_payments
  FROM public.license_payments
  WHERE company_id = '10000000-0000-4000-8000-000000000002';
  IF direct_company <> 0 OR visible_company <> 1 OR visible_payments <> 1 THEN
    RAISE EXCEPTION 'expired tenant cannot read renewal information';
  END IF;

  IF public.consume_ai_rate_limit('10000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'expired tenant consumed paid AI';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000099', true);
DO $$
BEGIN
  IF public.consume_ai_rate_limit('10000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'non-member consumed paid AI';
  END IF;
END;
$$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
DO $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform admin check stopped working';
  END IF;
END;
$$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.consume_ai_rate_limit('10000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'anonymous role executed AI rate limit RPC';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

RESET ROLE;
ROLLBACK;
