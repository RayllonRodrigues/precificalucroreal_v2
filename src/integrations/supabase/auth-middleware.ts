import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const authorization = getRequestHeader("authorization");
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);
    const token = match?.[1];
    if (!token) throw new Response("Não autorizado.", { status: 401 });
    const { createUserClient } = await import("./client.server");
    const supabase = createUserClient(token);
    // getSession/decoded JWT data are not sufficient for server authorization.
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new Response("Sessão inválida.", { status: 401 });
    return next({ context: { supabase, userId: data.user.id } });
  },
);
