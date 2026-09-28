import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Indica se o usuário logado é administrador da plataforma. */
export function usePlatformAdmin() {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ["platform-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  return {
    isAdmin: query.data === true,
    loading: authLoading || (!!user && query.data === undefined),
  };
}
