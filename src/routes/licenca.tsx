import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/lib/app-data";
import { mensagemErro } from "@/lib/auth-messages";
import { formatBRL, formatDate } from "@/lib/format";
import {
  conferirPagamentoLicenca,
  criarPagamentoLicenca,
  obterPlanoLicenca,
} from "@/lib/licenca.functions";
import { statusLicenca } from "@/lib/licenca";

export const Route = createFileRoute("/licenca")({
  head: () => ({
    meta: [
      { title: "Licença anual — Precifica" },
      {
        name: "description",
        content:
          "Contrate a licença anual do Precifica e continue precificando com lucro real depois do período de teste.",
      },
      { property: "og:title", content: "Licença anual — Precifica" },
      {
        property: "og:description",
        content: "Acesso completo ao Precifica por 12 meses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { pagamento?: string } =>
    typeof search["pagamento"] === "string" ? { pagamento: search["pagamento"] } : {},
  component: LicencaPage,
});

const BENEFICIOS = [
  "Precificação ilimitada de produtos e serviços",
  "Custos fixos, folha e despesas sempre atualizados",
  "Simulador de cenários e histórico completo",
  "Relatórios e indicadores do seu negócio",
];

function LicencaPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { data: company, isLoading, refetch } = useCompany();
  const { pagamento } = useSearch({ from: "/licenca" });

  const fnPlano = useServerFn(obterPlanoLicenca);
  const fnPagar = useServerFn(criarPagamentoLicenca);
  const fnConferir = useServerFn(conferirPagamentoLicenca);

  const plano = useQuery({
    queryKey: ["plano-licenca"],
    enabled: !!user,
    queryFn: () => fnPlano(),
  });

  const [conferindo, setConferindo] = useState(false);

  const pagar = useMutation({
    mutationFn: () => fnPagar({ data: { companyId: company!.id } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  // Ao voltar do Mercado Pago, confirma o pagamento e libera o acesso.
  useEffect(() => {
    if (!company || pagamento !== "sucesso") return;
    setConferindo(true);
    void fnConferir({ data: { companyId: company.id } })
      .then(async ({ liberado }) => {
        if (liberado) {
          toast.success("Pagamento confirmado. Acesso liberado!");
          await refetch();
          void navigate({ to: "/painel" });
        } else {
          toast.info("Ainda não recebemos a confirmação. Tente novamente em alguns instantes.");
        }
      })
      .catch((e) => toast.error(mensagemErro(e)))
      .finally(() => setConferindo(false));
  }, [company, pagamento, fnConferir, navigate, refetch]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-app-gradient p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    void navigate({ to: "/entrar" });
    return null;
  }

  if (!company) {
    void navigate({ to: "/primeiros-passos" });
    return null;
  }

  const status = statusLicenca(company);
  const preco = plano.data?.preco ?? 129.9;
  const meses = plano.data?.meses ?? 12;

  return (
    <div className="min-h-screen bg-app-gradient px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/entrar" });
            }}
          >
            <LogOut className="size-4" aria-hidden /> Sair
          </Button>
        </div>

        <Card className="shadow-soft">
          <CardContent className="space-y-5 p-6 md:p-8">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="size-4" aria-hidden />
              {status.bloqueado
                ? "Seu período de teste terminou"
                : status.tipo === "licenca"
                  ? `Licença ativa até ${formatDate(status.expiraEm!)}`
                  : `Teste gratuito válido até ${status.expiraEm ? formatDate(status.expiraEm) : "—"}`}
            </div>

            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
                Continue com o Precifica
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Libere o acesso completo da empresa {company.nome} por {meses} meses.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-muted/40 p-5">
              <p className="text-sm text-muted-foreground">Licença anual</p>
              <p className="font-display text-4xl font-extrabold tracking-tight">
                {formatBRL(preco)}
              </p>
              <p className="text-sm text-muted-foreground">
                Pagamento único, válido por {meses} meses.
              </p>
            </div>

            <ul className="space-y-2">
              {BENEFICIOS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                className="gap-2"
                disabled={pagar.isPending || conferindo}
                onClick={() => pagar.mutate()}
              >
                <ShieldCheck className="size-4" aria-hidden />
                {pagar.isPending ? "Abrindo pagamento..." : "Contratar licença"}
              </Button>
              {!status.bloqueado && (
                <Button variant="outline" size="lg" onClick={() => navigate({ to: "/painel" })}>
                  Voltar ao painel
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Pagamento processado pelo Mercado Pago. Após a confirmação, o acesso é liberado
              automaticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
