-- RECONSTRUCTION. No execution against production is authorized.
DO $$ BEGIN
  IF current_setting('precifica.recovery_validated', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'TODO DE RECUPERAÇÃO/VALIDAÇÃO: review baseline and Auth Hook first';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.companies'::regclass AND conname = 'companies_owner_id_auth_fkey') THEN
    ALTER TABLE public.companies ADD CONSTRAINT companies_owner_id_auth_fkey
      FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE NO ACTION
      DEFERRABLE INITIALLY IMMEDIATE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.company_members'::regclass AND conname = 'company_members_user_id_auth_fkey') THEN
    ALTER TABLE public.company_members ADD CONSTRAINT company_members_user_id_auth_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      DEFERRABLE INITIALLY IMMEDIATE NOT VALID;
  END IF;
END $$;

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

-- Tests establish a limit of five, but do not specify a window/reset rule or
-- the original persistent table. Do not invent a quota/billing policy.
-- Preserve an existing implementation; otherwise install a fail-closed recovery stub.
DO $$ BEGIN
  IF to_regprocedure('public.consume_ai_rate_limit(uuid)') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.consume_ai_rate_limit(_company_id uuid)
      RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $body$
      BEGIN
        IF NOT public.tenant_license_active(_company_id) THEN RETURN false; END IF;
        RAISE EXCEPTION 'TODO DE RECUPERAÇÃO/VALIDAÇÃO: recover persistent AI quota and reset interval';
      END $body$;
    $function$;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(uuid) TO authenticated;

-- The existing SQL fixtures must create auth.users for each synthetic owner,
-- or defer these constraints for an entire rolled-back transaction. NOT VALID
-- protects historical rows only; it does not exempt new test inserts.
