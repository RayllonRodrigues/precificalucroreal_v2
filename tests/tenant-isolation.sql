-- Run only against a local/test database after migration 0011. Every write is rolled back.
BEGIN;

DO $$
DECLARE
  company_a uuid := gen_random_uuid();
  company_b uuid := gen_random_uuid();
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  item_a uuid := gen_random_uuid();
  item_b uuid := gen_random_uuid();
  calculation_a uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.companies (id, owner_id, nome)
  VALUES (company_a, owner_a, 'Security test A'), (company_b, owner_b, 'Security test B');

  INSERT INTO public.products_services (id, company_id, tipo, nome)
  VALUES
    (item_a, company_a, 'produto', 'Item A'),
    (item_b, company_b, 'produto', 'Item B');

  INSERT INTO public.pricing_calculations (id, company_id, item_id, item_nome, tipo)
  VALUES (calculation_a, company_a, item_a, 'Valid calculation', 'produto');

  INSERT INTO public.pricing_scenarios (company_id, calculation_id, nome)
  VALUES (company_a, calculation_a, 'Valid scenario');

  BEGIN
    INSERT INTO public.pricing_calculations (company_id, item_id, item_nome, tipo)
    VALUES (company_a, item_b, 'Invalid cross-company calculation', 'produto');
    RAISE EXCEPTION 'cross-company item reference was accepted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.pricing_scenarios (company_id, calculation_id, nome)
    VALUES (company_b, calculation_a, 'Invalid cross-company scenario');
    RAISE EXCEPTION 'cross-company calculation reference was accepted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END;
$$;

ROLLBACK;
