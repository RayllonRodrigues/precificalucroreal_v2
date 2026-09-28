-- Read-only homologation audit. Review every returned row before validation.
SELECT conrelid::regclass AS table_name, conname, convalidated
FROM pg_constraint
WHERE conname IN (
  'pricing_calculations_item_same_company_fk',
  'pricing_scenarios_calculation_same_company_fk',
  'companies_owner_id_auth_fkey',
  'company_members_user_id_auth_fkey'
)
ORDER BY conname;

SELECT pc.id, pc.company_id, pc.item_id, ps.company_id AS item_company_id
FROM public.pricing_calculations pc
JOIN public.products_services ps ON ps.id = pc.item_id
WHERE pc.item_id IS NOT NULL AND pc.company_id <> ps.company_id;

SELECT s.id, s.company_id, s.calculation_id, pc.company_id AS calculation_company_id
FROM public.pricing_scenarios s
JOIN public.pricing_calculations pc ON pc.id = s.calculation_id
WHERE s.calculation_id IS NOT NULL AND s.company_id <> pc.company_id;

SELECT c.id AS company_id, c.owner_id
FROM public.companies c
LEFT JOIN auth.users u ON u.id = c.owner_id
WHERE u.id IS NULL;

SELECT m.id AS membership_id, m.company_id, m.user_id, m.role
FROM public.company_members m
LEFT JOIN auth.users u ON u.id = m.user_id
WHERE u.id IS NULL;

SELECT c.id AS company_id, c.owner_id, m.role
FROM public.companies c
LEFT JOIN public.company_members m
  ON m.company_id = c.id AND m.user_id = c.owner_id
WHERE m.id IS NULL OR m.role <> 'proprietario';
