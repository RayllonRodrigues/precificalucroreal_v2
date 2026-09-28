-- MANUAL ONLY. Run after audit-pending-constraints.sql returns no inconsistencies.
\set ON_ERROR_STOP on

ALTER TABLE public.pricing_calculations
  VALIDATE CONSTRAINT pricing_calculations_item_same_company_fk;
ALTER TABLE public.pricing_scenarios
  VALIDATE CONSTRAINT pricing_scenarios_calculation_same_company_fk;
ALTER TABLE public.companies
  VALIDATE CONSTRAINT companies_owner_id_auth_fkey;
ALTER TABLE public.company_members
  VALIDATE CONSTRAINT company_members_user_id_auth_fkey;

SELECT conrelid::regclass AS table_name, conname, convalidated
FROM pg_constraint
WHERE conname IN (
  'pricing_calculations_item_same_company_fk',
  'pricing_scenarios_calculation_same_company_fk',
  'companies_owner_id_auth_fkey',
  'company_members_user_id_auth_fkey'
)
ORDER BY conname;
