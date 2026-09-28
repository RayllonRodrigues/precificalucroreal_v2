-- Run only against a local/test database after migration 0011. Every write is rolled back.
BEGIN;

DO $$
DECLARE
  test_company uuid := gen_random_uuid();
  test_owner uuid := gen_random_uuid();
  approved_charge uuid := gen_random_uuid();
  pending_charge uuid := gen_random_uuid();
  cancelled_charge uuid := gen_random_uuid();
  chargeback_company uuid := gen_random_uuid();
  chargeback_owner uuid := gen_random_uuid();
  chargeback_charge uuid := gen_random_uuid();
  first_expiration timestamptz;
  repeated_expiration timestamptz;
BEGIN
  INSERT INTO public.companies (id, owner_id, nome)
  VALUES
    (test_company, test_owner, 'Payment security test'),
    (chargeback_company, chargeback_owner, 'Chargeback security test');

  INSERT INTO public.license_payments (id, company_id, valor, meses)
  VALUES
    (approved_charge, test_company, 129.90, 12),
    (pending_charge, test_company, 129.90, 12),
    (cancelled_charge, test_company, 129.90, 12),
    (chargeback_charge, chargeback_company, 129.90, 12);

  IF public.process_mercado_pago_payment(
    approved_charge, '900000001', 'approved', 'accredited', true
  ) <> 'activated' THEN
    RAISE EXCEPTION 'approved payment did not activate';
  END IF;

  SELECT licenca_expira_em INTO first_expiration
  FROM public.companies WHERE id = test_company;

  IF public.process_mercado_pago_payment(
    approved_charge, '900000001', 'approved', 'accredited', true
  ) <> 'duplicate' THEN
    RAISE EXCEPTION 'duplicate payment was not detected';
  END IF;

  SELECT licenca_expira_em INTO repeated_expiration
  FROM public.companies WHERE id = test_company;
  IF repeated_expiration IS DISTINCT FROM first_expiration THEN
    RAISE EXCEPTION 'duplicate payment extended the license twice';
  END IF;

  PERFORM public.process_mercado_pago_payment(
    pending_charge, '900000002', 'pending', 'pending_waiting_payment', true
  );
  IF (SELECT status FROM public.license_payments WHERE id = pending_charge) <> 'pendente' THEN
    RAISE EXCEPTION 'pending payment changed the internal paid state';
  END IF;

  PERFORM public.process_mercado_pago_payment(
    pending_charge, '900000002', 'rejected', 'cc_rejected_other_reason', true
  );
  IF (SELECT status FROM public.license_payments WHERE id = pending_charge) <> 'rejected' THEN
    RAISE EXCEPTION 'rejected payment state was not recorded';
  END IF;

  PERFORM public.process_mercado_pago_payment(
    cancelled_charge, '900000003', 'cancelled', 'by_payer', true
  );
  IF (SELECT status FROM public.license_payments WHERE id = cancelled_charge) <> 'cancelled' THEN
    RAISE EXCEPTION 'cancelled unpaid payment state was not recorded';
  END IF;

  IF public.process_mercado_pago_payment(
    approved_charge, '900000001', 'refunded', 'refunded', true
  ) <> 'reversed' THEN
    RAISE EXCEPTION 'refund did not reverse the paid license';
  END IF;

  IF public.process_mercado_pago_payment(
    approved_charge, '900000001', 'charged_back', 'settled', true
  ) <> 'duplicate' THEN
    RAISE EXCEPTION 'repeated reversal was not idempotent';
  END IF;

  PERFORM public.process_mercado_pago_payment(
    chargeback_charge, '900000004', 'approved', 'accredited', true
  );
  IF public.process_mercado_pago_payment(
    chargeback_charge, '900000004', 'charged_back', 'in_process', true
  ) <> 'reversed' THEN
    RAISE EXCEPTION 'chargeback did not reverse the paid license';
  END IF;
END;
$$;

ROLLBACK;
