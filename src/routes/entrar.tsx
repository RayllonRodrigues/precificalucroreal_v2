import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Loader2, Mail, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { LocalFields } from "@/components/local-fields";
import { mensagemAuth } from "@/lib/auth-messages";
import { obterConfigPublica } from "@/lib/platform.functions";
import { useAuth } from "@/hooks/useAuth";
import { AuthPasswordField } from "@/components/auth-password-field";
import { InstallAppButton } from "@/components/install-app";
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
  const {
    data: config,
    isPending: configLoading,
    isError: configError,
    refetch: reloadConfig,
  } = useQuery({
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
    setBloqueio(null);
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
      setBloqueio(
        mensagemAuth(error, "Não foi possível criar sua conta. Tente novamente em instantes."),
      );
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
    <div className="min-h-svh bg-background">
      <div className="mx-auto grid min-h-svh max-w-[1440px] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex xl:p-16">
          <div
            className="pointer-events-none absolute -right-32 -top-32 size-[480px] rounded-full border-[80px] border-white/5"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-40 -left-40 size-[500px] rounded-full bg-secondary/20 blur-3xl"
            aria-hidden
          />
          <Link
            to="/"
            className="relative w-fit rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [&_.text-muted-foreground]:text-white/80"
            aria-label="Precifica · voltar ao início"
          >
            <BrandMark />
          </Link>
          <div className="relative my-16 max-w-md">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Seu negócio, com mais clareza
            </p>
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Preço bem calculado.
              <br />
              <span className="text-white/75">Lucro de verdade.</span>
            </h2>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-white/85">
              Entenda seus custos, encontre o preço certo e cuide do crescimento do seu negócio.
            </p>
            <div className="mt-10 rounded-2xl border border-white/20 bg-white/10 p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Cada venda faz mais sentido</span>
                <TrendingUp className="size-5" aria-hidden />
              </div>
              <ul className="space-y-4 text-sm">
                {[
                  "Custos e despesas no mesmo lugar",
                  "Preços com margem de lucro clara",
                  "Decisões com os números do seu negócio",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="relative text-xs text-white/75">
            Para quem empreende e quer crescer com confiança.
          </p>
        </aside>

        <main className="flex min-w-0 flex-col px-5 py-7 sm:px-10 sm:py-10 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="rounded-xl lg:hidden" aria-label="Precifica · voltar ao início">
              <BrandMark />
            </Link>
            <Link
              to="/"
              className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span>Voltar ao site</span>
            </Link>
          </div>
          <div className="mx-auto my-auto w-full max-w-md py-10 sm:py-12">
            <header className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {recuperar
                  ? "Vamos ajudar você"
                  : tab === "login"
                    ? "Bom ter você por aqui"
                    : "Seu próximo passo começa aqui"}
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {recuperar
                  ? "Recupere seu acesso"
                  : tab === "login"
                    ? "Bem-vindo de volta."
                    : "Comece pelo preço certo."}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {recuperar
                  ? "Informe seu e-mail para receber um link e criar uma nova senha."
                  : tab === "login"
                    ? "Entre para acompanhar seus resultados e continuar de onde parou."
                    : "Crie sua conta. Depois, vamos configurar seu negócio juntos."}
              </p>
            </header>
            {config?.mensagemAviso && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-border bg-accent/50 p-4 text-sm"
              >
                {config.mensagemAviso}
              </div>
            )}
            <div className="[&_input]:h-12 [&_input]:rounded-xl [&_input]:text-base [&_button[role=combobox]]:min-h-12">
              {recuperar ? (
                <form
                  onSubmit={handleReset}
                  className="space-y-5"
                  aria-label="Recuperar senha"
                  aria-busy={busy}
                >
                  <div className="space-y-2">
                    <Label htmlFor="email-reset">E-mail</Label>
                    <Input
                      id="email-reset"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com.br"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl font-semibold"
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Mail className="size-4" aria-hidden />
                    )}{" "}
                    Enviar link de recuperação
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full"
                    onClick={() => setRecuperar(false)}
                  >
                    <ArrowLeft aria-hidden /> Voltar para entrar
                  </Button>
                </form>
              ) : (
                <Tabs
                  value={tab}
                  onValueChange={(value) => {
                    setTab(value);
                    setBloqueio(null);
                  }}
                >
                  <TabsList className="mb-7 grid h-12 w-full grid-cols-2 rounded-xl p-1">
                    <TabsTrigger value="login" className="h-10 rounded-lg">
                      Entrar
                    </TabsTrigger>
                    <TabsTrigger value="cadastro" className="h-10 rounded-lg">
                      Criar conta
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="login">
                    <form
                      onSubmit={handleLogin}
                      className="space-y-5"
                      aria-label="Entrar na conta"
                      aria-busy={busy}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="email-login">E-mail</Label>
                        <Input
                          id="email-login"
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="voce@exemplo.com.br"
                        />
                      </div>
                      <AuthPasswordField id="senha-login" value={senha} onChange={setSenha} />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="min-h-11 rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setRecuperar(true)}
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <Button
                        type="submit"
                        className="h-12 w-full rounded-xl font-semibold"
                        disabled={busy}
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                        {busy ? "Entrando…" : "Entrar na minha conta"}
                        {!busy && <ArrowRight aria-hidden />}
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
                        Ainda não tem conta?{" "}
                        <button
                          type="button"
                          onClick={() => setTab("cadastro")}
                          className="inline-flex min-h-11 items-center rounded font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Comece por aqui
                        </button>
                      </p>
                    </form>
                  </TabsContent>
                  <TabsContent value="cadastro">
                    <form
                      onSubmit={handleSignUp}
                      className="space-y-5"
                      aria-label="Criar conta"
                      aria-busy={busy}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome completo</Label>
                        <Input
                          id="nome"
                          required
                          minLength={2}
                          autoComplete="name"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Como você se chama?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-signup">E-mail</Label>
                        <Input
                          id="email-signup"
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="voce@exemplo.com.br"
                        />
                      </div>
                      <div className="space-y-2">
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
                      <AuthPasswordField
                        id="senha-signup"
                        value={senha}
                        onChange={setSenha}
                        newPassword
                      />
                      <details className="group rounded-xl border border-border p-4">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                          <span>
                            Mais sobre você{" "}
                            <span className="font-normal text-muted-foreground">(opcional)</span>
                          </span>
                          <ChevronDown
                            className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                            aria-hidden
                          />
                        </summary>
                        <div className="mt-4 space-y-5">
                          <div className="space-y-2">
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
                          <div className="space-y-2">
                            <Label htmlFor="cnpj">CNPJ</Label>
                            <Input
                              id="cnpj"
                              inputMode="numeric"
                              value={cnpj}
                              onChange={(e) => setCnpj(mascaraCnpj(e.target.value))}
                              placeholder="00.000.000/0000-00"
                            />
                          </div>
                          <LocalFields
                            uf={uf}
                            cidade={cidade}
                            onUfChange={setUf}
                            onCidadeChange={setCidade}
                          />
                        </div>
                      </details>
                      {bloqueio && (
                        <p
                          role="alert"
                          className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
                        >
                          {bloqueio}
                        </p>
                      )}
                      {config?.permitirCadastros !== true && (
                        <div
                          role="status"
                          className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground"
                        >
                          {configLoading
                            ? "Verificando disponibilidade do cadastro…"
                            : configError
                              ? "Não foi possível verificar a disponibilidade do cadastro."
                              : "Novos cadastros estão temporariamente desativados."}
                          {configError && (
                            <button
                              type="button"
                              onClick={() => void reloadConfig()}
                              className="mt-2 flex min-h-11 items-center rounded font-semibold text-primary underline"
                            >
                              Tentar novamente
                            </button>
                          )}
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="h-12 w-full rounded-xl font-semibold"
                        disabled={busy || config?.permitirCadastros !== true}
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                        {busy ? "Criando sua conta…" : "Criar minha conta"}
                        {!busy && <ArrowRight aria-hidden />}
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
                        Já usa o Precifica?{" "}
                        <button
                          type="button"
                          onClick={() => setTab("login")}
                          className="inline-flex min-h-11 items-center rounded font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Entre na sua conta
                        </button>
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
          <InstallAppButton className="mx-auto mb-3" />
          <p className="text-center text-xs text-muted-foreground">
            Precifica · Mais clareza para o seu negócio.
          </p>
        </main>
      </div>
    </div>
  );
}
