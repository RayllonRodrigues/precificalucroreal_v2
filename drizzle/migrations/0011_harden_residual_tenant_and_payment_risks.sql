-- RECONSTRUCTION. Requires reviewed baseline and 0010; not a historical checksum.
DO $$ BEGIN
  IF current_setting('precifica.recovery_validated', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'TODO DE RECUPERAÇÃO/VALIDAÇÃO: review schema and payment history first';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS recovery_item_id_company ON public.products_services(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS recovery_calculation_id_company ON public.pricing_calculations(id, company_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.pricing_calculations'::regclass AND conname = 'pricing_calculations_item_same_company_fk') THEN
    ALTER TABLE public.pricing_calculations ADD CONSTRAINT pricing_calculations_item_same_company_fk
      FOREIGN KEY (item_id, company_id) REFERENCES public.products_services(id, company_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.pricing_scenarios'::regclass AND conname = 'pricing_scenarios_calculation_same_company_fk') THEN
    ALTER TABLE public.pricing_scenarios ADD CONSTRAINT pricing_scenarios_calculation_same_company_fk
      FOREIGN KEY (calculation_id, company_id) REFERENCES public.pricing_calculations(id, company_id) NOT VALID;
  END IF;
END $$;

-- Technical recovery ledger: NOT claimed to be the original payment schema.
-- It stores precisely the before/after effect needed by the idempotency tests.
-- TODO DE RECUPERAÇÃO/VALIDAÇÃO: reconcile historical grants before enabling this RPC.
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

-- TODO DE RECUPERAÇÃO/VALIDAÇÃO: status enum/check constraints, original payment
-- ledger/backfill, overlapping refunds and concurrent provider fetch ordering.
-- The HTTP verifier must check amount, currency, external reference and environment
-- before this service-role-only transaction; the RPC is never callable by clients.
