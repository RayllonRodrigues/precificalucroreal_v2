import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { mensagemErro } from "@/lib/auth-messages";
import { useAuth } from "@/hooks/useAuth";
import { useCompany, useCreateCompany, seedDemoData } from "@/lib/app-data";
import { BrandMark } from "@/components/app-layout";
import { NumberField } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RAMOS, REGIMES } from "@/lib/constants";
import { obterConfigPublica } from "@/lib/platform.functions";

export const Route = createFileRoute("/primeiros-passos")({
  head: () => ({
    meta: [
      { title: "Configuração inicial — Precifica" },
      {
        name: "description",
        content: "Configure sua empresa no Precifica em poucos passos e comece a precificar.",
      },
      { property: "og:title", content: "Configuração inicial — Precifica" },
      { property: "og:description", content: "Configure sua empresa e comece a precificar." },
    ],
  }),
  component: Onboarding,
});

const PASSOS = [
  "Sua empresa",
  "Faturamento",
  "Pró-labore e impostos",
  "Taxas de pagamento",
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: company, isLoading } = useCompany();
  const createCompany = useCreateCompany();
  const fnConfig = useServerFn(obterConfigPublica);
  const { data: config } = useQuery({
    queryKey: ["platform", "public"],
    queryFn: () => fnConfig(),
    retry: false,
  });

  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState("");
  const [ramo, setRamo] = useState<string>("");
  const [faturamento, setFaturamento] = useState(0);
  const [vendas, setVendas] = useState(0);
  const [proLabore, setProLabore] = useState(0);
  const [regime, setRegime] = useState("simples");
  const [imposto, setImposto] = useState(6);
  const [comissao, setComissao] = useState(0);
  const [margem, setMargem] = useState(30);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/entrar" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (company) void navigate({ to: "/painel" });
  }, [company, navigate]);

  async function finalizar(demo: boolean, nomeOverride?: string) {
    if (demo && config?.permitirDemo === false) {
      toast.error("O modo demonstração está temporariamente desativado.");
      return;
    }
    const nomeFinal = (nomeOverride ?? nome).trim();
    if (nomeFinal.length < 2) {
      setPasso(0);
      toast.error("Informe o nome da empresa para continuar.");
      return;
    }
    setSalvando(true);
    try {
      const created = await createCompany.mutateAsync({
        nome: nomeFinal,
        ramo: ramo || null,
        faturamento_mensal: faturamento,
        vendas_mensais: Math.round(vendas),
        pro_labore: proLabore,
        regime_tributario: regime,
        imposto_percentual: imposto,
        comissao_padrao: comissao,
        margem_padrao: margem,
        onboarding_completo: true,
        is_demo: demo,
      });
      if (demo) {
        await seedDemoData(created.id);
        toast.success("Dados de demonstração criados. Explore à vontade!");
      } else {
        toast.success("Empresa configurada. Vamos precificar!");
      }
      void navigate({ to: "/painel" });
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível salvar."));
    } finally {
      setSalvando(false);
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-gradient">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-gradient px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>

        <div className="card-soft p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold text-primary">
              Passo {passo + 1} de {PASSOS.length}
            </p>
            <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">{PASSOS[passo]}</h1>
            <Progress value={((passo + 1) / PASSOS.length) * 100} className="mt-3 h-2" />
          </div>

          {passo === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="empresa">Nome da empresa</Label>
                <Input
                  id="empresa"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Doces da Ana"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ramo">Ramo de atividade</Label>
                <Select value={ramo} onValueChange={setRamo}>
                  <SelectTrigger id="ramo">
                    <SelectValue placeholder="Selecione o ramo" />
                  </SelectTrigger>
                  <SelectContent>
                    {RAMOS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {passo === 1 && (
            <div className="space-y-4">
              <NumberField
                id="faturamento"
                label="Faturamento mensal estimado"
                prefix="R$"
                value={faturamento}
                onChange={setFaturamento}
                hint="Use vírgula para os centavos. Você pode ajustar depois."
              />
              <NumberField
                id="vendas"
                label="Quantidade média de vendas por mês"
                value={vendas}
                onChange={setVendas}
                hint="Esse número distribui o custo fixo em cada venda."
              />
            </div>
          )}

          {passo === 2 && (
            <div className="space-y-4">
              <NumberField
                id="prolabore"
                label="Pró-labore mensal"
                prefix="R$"
                value={proLabore}
                onChange={setProLabore}
                hint="Quanto você retira por mês para si."
              />
              <div className="space-y-1.5">
                <Label htmlFor="regime">Regime tributário</Label>
                <Select
                  value={regime}
                  onValueChange={(value) => {
                    setRegime(value);
                    const found = REGIMES.find((r) => r.value === value);
                    if (found && found.imposto > 0) setImposto(found.imposto);
                  }}
                >
                  <SelectTrigger id="regime">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <NumberField
                id="imposto"
                label="Percentual médio de impostos"
                suffix="%"
                value={imposto}
                onChange={setImposto}
              />
            </div>
          )}

          {passo === 3 && (
            <div className="space-y-4">
              <p className="rounded-xl bg-accent/70 p-3 text-sm text-accent-foreground">
                Já criamos as taxas padrão de Pix, débito e crédito de 1x a 12x. Você pode ajustar
                cada uma na tela de formas de pagamento.
              </p>
              <NumberField
                id="comissao"
                label="Comissão padrão sobre vendas"
                suffix="%"
                value={comissao}
                onChange={setComissao}
              />
              <NumberField
                id="margem"
                label="Margem de lucro desejada"
                suffix="%"
                value={margem}
                onChange={setMargem}
              />
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPasso((p) => Math.max(0, p - 1))}
              disabled={passo === 0 || salvando}
              className="gap-2"
            >
              <ArrowLeft className="size-4" aria-hidden /> Voltar
            </Button>

            {passo < PASSOS.length - 1 ? (
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setPasso(PASSOS.length - 1)}>
                  Pular
                </Button>
                <Button
                  type="button"
                  className="gap-2 font-semibold"
                  onClick={() => setPasso((p) => p + 1)}
                >
                  Continuar <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className="gap-2 font-semibold"
                onClick={() => finalizar(false)}
                disabled={salvando}
              >
                {salvando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" aria-hidden />
                )}
                Concluir
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/70 p-4 text-center">
          <p className="text-sm font-medium">Quer apenas experimentar primeiro?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Criamos produtos, serviços, despesas, funcionários e cálculos fictícios identificados
            como demonstração.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 gap-2 font-semibold"
            disabled={salvando || config?.permitirDemo === false}
            onClick={() => void finalizar(true, nome.trim() || "Empresa Demonstração")}
          >
            <Sparkles className="size-4" aria-hidden /> Entrar no modo demonstração
          </Button>
        </div>
      </div>
    </div>
  );
}
