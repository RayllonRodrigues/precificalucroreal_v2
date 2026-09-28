import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { LocalFields } from "@/components/local-fields";
import { mensagemAuth } from "@/lib/auth-messages";
import { obterConfigPublica } from "@/lib/platform.functions";
import { useAuth } from "@/hooks/useAuth";
import { BrandMark } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({
  modo: z.enum(["login", "cadastro"]).optional(),
});

export const Route = createFileRoute("/entrar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar no Precifica" },
      {
        name: "description",
        content: "Acesse sua conta Precifica para calcular preços e acompanhar o lucro do negócio.",
      },
      { property: "og:title", content: "Entrar no Precifica" },
      { property: "og:description", content: "Acesse sua conta e precifique com segurança." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fnConfig = useServerFn(obterConfigPublica);
  const { data: config } = useQuery({
    queryKey: ["platform", "public"],
    queryFn: () => fnConfig(),
    retry: false,
  });
  const { modo } = Route.useSearch();
  const [tab, setTab] = useState(modo === "cadastro" ? "cadastro" : "login");
  const [busy, setBusy] = useState(false);
  const [recuperar, setRecuperar] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [bloqueio, setBloqueio] = useState<string | null>(null);

  function mascaraTelefone(valor: string) {
    const d = valor.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, d.length > 10 ? 7 : 6)}-${d.slice(d.length > 10 ? 7 : 6)}`;
  }

  function mascaraCpf(valor: string) {
    const d = valor.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  function mascaraCnpj(valor: string) {
    const d = valor.replace(/\D/g, "").slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }

  async function destinoPosLogin(): Promise<"/administracao" | "/painel"> {
    try {
      const { data } = await supabase.rpc("is_platform_admin");
      return data ? "/administracao" : "/painel";
    } catch {
      return "/painel";
    }
  }

  async function irParaDestino() {
    const destino = await destinoPosLogin();
    void navigate({ to: destino });
  }

  useEffect(() => {
    if (!loading && user) void irParaDestino();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error) {
      setBusy(false);
      toast.error(mensagemAuth(error, "Não foi possível entrar. Tente novamente."));
      return;
    }
    toast.success("Bem-vindo de volta!");
    await irParaDestino();
    setBusy(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (config?.permitirCadastros !== true) {
      toast.error("Novos cadastros estão temporariamente desativados.");
      return;
    }
    if (nome.trim().length < 2) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (senha.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.");
      return;
    }
    if (cnpj && cnpj.replace(/\D/g, "").length !== 14) {
      toast.error("O CNPJ precisa ter 14 dígitos (ou deixe em branco).");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          nome: nome.trim(),
          telefone: telefone.replace(/\D/g, ""),
          cpf: cpf.replace(/\D/g, ""),
          cnpj: cnpj.replace(/\D/g, ""),
          cidade: cidade.trim(),
          uf,
        },
        emailRedirectTo: `${window.location.origin}/painel`,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(mensagemAuth(error, "Não foi possível criar a conta. Tente novamente."));
      setBloqueio(error.message || "Erro desconhecido ao criar a conta.");
      return;
    }
    if (data.session) {
      void navigate({ to: "/primeiros-passos" });
      return;
    }
    toast.success("Cadastro criado. Confirme o e-mail que enviamos para ativar sua conta.");
    setTab("login");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    if (error) {
      toast.error(mensagemAuth(error, "Não foi possível enviar o link de recuperação."));
      return;
    }
    toast.success("Enviamos um link de recuperação para o seu e-mail.");
    setRecuperar(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-gradient px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/">
            <BrandMark />
          </Link>
        </div>
        {config?.mensagemAviso && (
          <div className="mb-4 rounded-lg border border-border bg-card p-3 text-sm">
            {config.mensagemAviso}
          </div>
        )}

        <div className="card-soft p-6">
          {recuperar ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Recuperar senha</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Informe seu e-mail e enviaremos um link para criar uma nova senha.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-reset">E-mail</Label>
                <Input
                  id="email-reset"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com.br"
                />
              </div>
              <Button type="submit" className="w-full gap-2 font-semibold" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Enviar link
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setRecuperar(false)}
              >
                Voltar
              </Button>
            </form>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="cadastro">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email-login">E-mail</Label>
                    <Input
                      id="email-login"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com.br"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senha-login">Senha</Label>
                    <Input
                      id="senha-login"
                      type="password"
                      required
                      autoComplete="current-password"
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
                    className="w-full text-sm font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => setRecuperar(true)}
                  >
                    Esqueci minha senha
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="cadastro" className="mt-5">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input
                      id="nome"
                      required
                      autoComplete="name"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Maria Silva"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-signup">E-mail</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com.br"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                    <Input
                      id="telefone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={telefone}
                      onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        inputMode="numeric"
                        required
                        value={cpf}
                        onChange={(e) => setCpf(mascaraCpf(e.target.value))}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                      <Input
                        id="cnpj"
                        inputMode="numeric"
                        value={cnpj}
                        onChange={(e) => setCnpj(mascaraCnpj(e.target.value))}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senha-signup">Senha</Label>
                    <Input
                      id="senha-signup"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                    />
                  </div>
                  <LocalFields
                    uf={uf}
                    cidade={cidade}
                    onUfChange={setUf}
                    onCidadeChange={setCidade}
                  />
                  {bloqueio && (
                    <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-950/40">
                      <p className="font-medium text-amber-900 dark:text-amber-200">
                        Seu cadastro foi bloqueado pela segurança da senha.
                      </p>
                      <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
                        Revise os requisitos da senha e tente novamente.
                      </p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full font-semibold"
                    disabled={busy || config?.permitirCadastros !== true}
                  >
                    {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
