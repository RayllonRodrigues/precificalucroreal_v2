import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { lazyClient } from "./lazy-client";
import type { Database } from "./types";

const statelessAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

function serverUrl(): string {
  const url = process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"];
  if (!url) throw new Error("SUPABASE_URL não configurada no servidor.");
  return url;
}

/** Privileged client: keep imports confined to server handlers. */
export const supabaseAdmin = lazyClient(() => {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) throw new Error("Credencial de serviço do Supabase não configurada.");
  return createClient<Database>(serverUrl(), key, { auth: statelessAuth });
});

/** A fresh user-scoped client per request; never use service_role for RLS queries. */
export function createUserClient(accessToken: string) {
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!key) throw new Error("Chave pública do Supabase não configurada no servidor.");
  return createClient<Database>(serverUrl(), key, {
    auth: statelessAuth,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
