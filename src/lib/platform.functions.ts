import { createServerFn } from "@tanstack/react-start";
import { cadastroPermitido } from "./signup-policy";

export interface PublicPlatformConfig {
  permitirCadastros: boolean;
  permitirDemo: boolean;
  mensagemAviso: string;
}

export const obterConfigPublica = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicPlatformConfig> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("permitir_cadastros, permitir_demo, mensagem_aviso")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a configuração da plataforma.");
    return {
      permitirCadastros: cadastroPermitido(data),
      permitirDemo: data?.permitir_demo ?? true,
      mensagemAviso: data?.mensagem_aviso ?? "",
    };
  },
);
