-- Read-only report 1: memberships that require human validation.
-- created_at exists, but there is no inviter/invitation/audit metadata. Therefore this
-- report cannot prove whether a non-owner membership is legitimate.
SELECT
  m.company_id,
  m.user_id,
  m.role,
  m.created_at AS membership_created_at,
  c.nome AS company_name,
  c.owner_id,
  owner_profile.nome AS owner_name,
  owner_profile.email AS owner_email,
  member_profile.nome AS member_name,
  member_profile.email AS member_email,
  (m.user_id = c.owner_id) AS is_company_owner,
  (m.created_at < timestamptz '2026-09-22T19:24:32Z') AS created_before_fix_was_authored,
  CASE
    WHEN m.user_id = c.owner_id AND m.role <> 'proprietario' THEN 'owner_role_mismatch'
    WHEN m.user_id <> c.owner_id AND m.role = 'proprietario' THEN 'non_owner_with_owner_role'
    WHEN m.user_id <> c.owner_id THEN 'non_owner_membership_needs_validation'
    ELSE 'owner_membership'
  END AS audit_reason
FROM public.company_members m
JOIN public.companies c ON c.id = m.company_id
LEFT JOIN public.profiles owner_profile ON owner_profile.id = c.owner_id
LEFT JOIN public.profiles member_profile ON member_profile.id = m.user_id
ORDER BY
  (m.user_id <> c.owner_id) DESC,
  m.created_at,
  c.nome,
  m.user_id;

-- Read-only report 2: cross-company item references.
SELECT
  pc.id AS calculation_id,
  pc.company_id AS calculation_company_id,
  pc.item_id,
  item.company_id AS item_company_id,
  pc.created_at
FROM public.pricing_calculations pc
JOIN public.products_services item ON item.id = pc.item_id
WHERE pc.company_id <> item.company_id
ORDER BY pc.created_at, pc.id;

-- Read-only report 3: cross-company calculation references.
SELECT
  scenario.id AS scenario_id,
  scenario.company_id AS scenario_company_id,
  scenario.calculation_id,
  calculation.company_id AS calculation_company_id,
  scenario.created_at
FROM public.pricing_scenarios scenario
JOIN public.pricing_calculations calculation ON calculation.id = scenario.calculation_id
WHERE scenario.company_id <> calculation.company_id
ORDER BY scenario.created_at, scenario.id;

-- After reviewing and correcting any returned rows, validate without changing data:
-- ALTER TABLE public.pricing_calculations
--   VALIDATE CONSTRAINT pricing_calculations_item_same_company_fk;
-- ALTER TABLE public.pricing_scenarios
--   VALIDATE CONSTRAINT pricing_scenarios_calculation_same_company_fk;
