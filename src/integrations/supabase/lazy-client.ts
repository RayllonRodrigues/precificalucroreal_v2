import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Imports/builds must neither require credentials nor start auth/network work. */
export function lazyClient(factory: () => SupabaseClient<Database>): SupabaseClient<Database> {
  let instance: SupabaseClient<Database> | undefined;
  return new Proxy({} as SupabaseClient<Database>, {
    get(_target, property) {
      instance ??= factory();
      const value = Reflect.get(instance, property);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}
