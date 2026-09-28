import { createClient } from "@supabase/supabase-js";
import { lazyClient } from "./lazy-client";
import type { Database } from "./types";

export const supabase = lazyClient(() => {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configure a URL e a chave pública do Supabase.");
  // A service-role key must never be used in the browser.
  if (key.startsWith("sb_secret_")) throw new Error("A configuração requer uma chave pública.");
  if (key.split(".").length === 3) {
    try {
      const payload = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role !== "anon") throw new Error("A configuração requer uma chave pública.");
    } catch {
      throw new Error("A configuração requer uma chave pública válida.");
    }
  }
  return createClient<Database>(url, key, {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: typeof window !== "undefined",
      detectSessionInUrl: typeof window !== "undefined",
    },
  });
});
