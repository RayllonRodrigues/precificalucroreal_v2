import { createMiddleware } from "@tanstack/react-start";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { supabase } = await import("./client");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error("Não foi possível recuperar a sessão.");
    const requestHeaders = new Headers();
    if (data.session) requestHeaders.set("Authorization", `Bearer ${data.session.access_token}`);
    return next({ headers: requestHeaders });
  },
);
