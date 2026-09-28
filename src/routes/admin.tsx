import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mensagemAuth } from "@/lib/auth-messages";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { BrandMark } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Acesso administrativo — Precifica" },
      {
        name: "description",
        content: "Entrada restrita aos administradores da plataforma Precifica.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acesso administrativo — Precifica" },
      { property: "og:description", content: "Entrada restrita aos administradores." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isAdmin, loading: carregandoAdmin } = usePlatformAdmin();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && !carregandoAdmin && isAdmin) {
      void navigate({ to: "/administracao" });
    }
  }, [user, loading, isAdmin, carregandoAdmin, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setBusy(false);
    if (error) {
      toast.error(mensagemAuth(error, "Não foi possível entrar. Verifique email e senha."));
      return;
    }
    void navigate({ to: "/administracao" });
  }

  async function enviarSenha() {
    if (!email.trim()) {
      toast.error("Informe o email para receber o link.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    if (error) {
      toast.error(mensagemAuth(error, "Não foi possível enviar o link."));
      return;
    }
    toast.success("Enviamos um link por email para você criar a senha.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-gradient px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <form onSubmit={handleLogin} className="card-soft space-y-4 p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden />
            <span className="text-xs font-semibold tracking-wide uppercase">Área restrita</span>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Acesso administrativo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com seu email e senha para ver as contas e empresas cadastradas.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-senha">Senha</Label>
            <Input
              id="admin-senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Entrar
          </Button>
          <button
            type="button"
            onClick={enviarSenha}
            className="w-full text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Criar ou recuperar minha senha por email
          </button>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/entrar" className="underline underline-offset-4">
              Voltar para o acesso normal
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
