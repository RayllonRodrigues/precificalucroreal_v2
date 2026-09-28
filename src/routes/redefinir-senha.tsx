import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mensagemAuth } from "@/lib/auth-messages";
import { BrandMark } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Precifica" },
      { name: "description", content: "Crie uma nova senha para acessar sua conta Precifica." },
      { property: "og:title", content: "Redefinir senha — Precifica" },
      { property: "og:description", content: "Crie uma nova senha de acesso." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      toast.error("As senhas não são iguais.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setBusy(false);
    if (error) {
      toast.error(mensagemAuth(error, "Não foi possível atualizar a senha."));
      return;
    }
    toast.success("Senha atualizada com sucesso.");
    void navigate({ to: "/painel" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-gradient px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <form onSubmit={handleSubmit} className="card-soft space-y-4 p-6">
          <div>
            <h1 className="font-display text-xl font-bold">Criar nova senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha uma senha com ao menos 6 caracteres.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nova">Nova senha</Label>
            <Input
              id="nova"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirma">Confirmar senha</Label>
            <Input
              id="confirma"
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  );
}
