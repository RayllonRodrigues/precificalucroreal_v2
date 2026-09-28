import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mensagemErro } from "@/lib/auth-messages";
import { AppLayout } from "@/components/app-layout";
import { NumberField } from "@/components/bits";
import { LogoUploader } from "@/components/company-logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { ARREDONDAMENTOS, RAMOS, REGIMES } from "@/lib/constants";
import { removeDemoData, seedDemoData, useCompany, useUpdateCompany } from "@/lib/app-data";
import { obterConfigPublica } from "@/lib/platform.functions";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Precifica" },
      {
        name: "description",
        content:
          "Ajuste dados da empresa, impostos, comissão padrão, margem desejada, arredondamento e modo demonstração.",
      },
      { property: "og:title", content: "Configurações — Precifica" },
      { property: "og:description", content: "Personalize a Precifica para o seu negócio." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const update = useUpdateCompany();
  const fnConfig = useServerFn(obterConfigPublica);
  const { data: platformConfig } = useQuery({
    queryKey: ["platform", "public"],
    queryFn: () => fnConfig(),
    retry: false,
  });

  const [nome, setNome] = useState("");
  const [ramo, setRamo] = useState("");
  const [regime, setRegime] = useState("");
  const [arredondamento, setArredondamento] = useState("nenhum");
  const [faturamento, setFaturamento] = useState(0);
  const [vendas, setVendas] = useState(0);
  const [proLabore, setProLabore] = useState(0);
  const [imposto, setImposto] = useState(0);
  const [comissao, setComissao] = useState(0);
  const [margem, setMargem] = useState(30);
  const [demoBusy, setDemoBusy] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);

  useEffect(() => {
    if (!company) return;
    setNome(company.nome);
    setRamo(company.ramo ?? "");
    setRegime(company.regime_tributario ?? "");
    setArredondamento(company.arredondamento);
    setFaturamento(Number(company.faturamento_mensal));
    setVendas(company.vendas_mensais);
    setProLabore(Number(company.pro_labore));
    setImposto(Number(company.imposto_percentual));
    setComissao(Number(company.comissao_padrao));
    setMargem(Number(company.margem_padrao));
  }, [company]);

  async function salvar() {
    if (!company) return;
    if (!nome.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }
    try {
      await update.mutateAsync({
        id: company.id,
        values: {
          nome: nome.trim(),
          ramo: ramo || null,
          regime_tributario: regime || null,
          arredondamento,
          faturamento_mensal: faturamento,
          vendas_mensais: Math.round(vendas),
          pro_labore: proLabore,
          imposto_percentual: imposto,
          comissao_padrao: comissao,
          margem_padrao: margem,
        },
      });
      toast.success("Configurações salvas.");
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível salvar."));
    }
  }

  return (
    <AppLayout
      title="Configurações"
      description="Esses valores são usados como padrão em todos os cálculos."
      actions={
        <Button
          className="gap-2 font-semibold"
          onClick={() => void salvar()}
          disabled={update.isPending}
        >
          <Save className="size-4" aria-hidden /> Salvar
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-soft border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Dados da empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company && (
              <div className="border-border/70 border-b pb-4">
                <LogoUploader company={company} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cfg-nome">Nome da empresa</Label>
              <Input id="cfg-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-ramo">Ramo de atividade</Label>
              <Select value={ramo} onValueChange={setRamo}>
                <SelectTrigger id="cfg-ramo">
                  <SelectValue placeholder="Selecione" />
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
            <div className="space-y-1.5">
              <Label htmlFor="cfg-regime">Regime tributário</Label>
              <Select value={regime} onValueChange={setRegime}>
                <SelectTrigger id="cfg-regime">
                  <SelectValue placeholder="Selecione" />
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
            <div className="space-y-1.5">
              <Label htmlFor="cfg-arred">Arredondamento de preços</Label>
              <Select value={arredondamento} onValueChange={setArredondamento}>
                <SelectTrigger id="cfg-arred">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARREDONDAMENTOS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="card-soft border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Números do negócio</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="cfg-fat"
              label="Faturamento mensal"
              prefix="R$"
              value={faturamento}
              onChange={setFaturamento}
            />
            <NumberField
              id="cfg-vendas"
              label="Vendas por mês"
              value={vendas}
              onChange={setVendas}
              hint="Usado para distribuir o custo fixo."
            />
            <NumberField
              id="cfg-pro"
              label="Pró-labore"
              prefix="R$"
              value={proLabore}
              onChange={setProLabore}
            />
            <NumberField
              id="cfg-imposto"
              label="Impostos"
              suffix="%"
              value={imposto}
              onChange={setImposto}
            />
            <NumberField
              id="cfg-comissao"
              label="Comissão padrão"
              suffix="%"
              value={comissao}
              onChange={setComissao}
            />
            <NumberField
              id="cfg-margem"
              label="Margem desejada"
              suffix="%"
              value={margem}
              onChange={setMargem}
            />
          </CardContent>
        </Card>

        <Card className="card-soft border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Modo demonstração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Preenche a conta com produtos, serviços, despesas e cálculos de exemplo para você
              explorar o app. Os dados de exemplo ficam marcados e podem ser removidos a qualquer
              momento.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-2 font-semibold"
                disabled={demoBusy || !company || platformConfig?.permitirDemo === false}
                onClick={async () => {
                  setDemoBusy(true);
                  try {
                    await seedDemoData(company!.id);
                    await qc.invalidateQueries();
                    toast.success("Dados de exemplo adicionados.");
                  } catch (error) {
                    toast.error(mensagemErro(error, "Erro ao gerar exemplos."));
                  } finally {
                    setDemoBusy(false);
                  }
                }}
              >
                <Sparkles className="size-4" aria-hidden /> Carregar exemplos
              </Button>
              <Button
                variant="outline"
                className="gap-2 font-semibold text-destructive"
                disabled={demoBusy || !company}
                onClick={() => setConfirmDemo(true)}
              >
                <Trash2 className="size-4" aria-hidden /> Remover dados de exemplo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-soft border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-muted/70 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">E-mail de acesso</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              className="gap-2 font-semibold"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/entrar" });
              }}
            >
              <LogOut className="size-4" aria-hidden /> Sair da conta
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDemo} onOpenChange={setConfirmDemo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover os dados de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tudo que foi criado pelo modo demonstração será apagado. Seus dados reais continuam
              intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setDemoBusy(true);
                try {
                  await removeDemoData(company!.id);
                  await qc.invalidateQueries();
                  toast.success("Dados de exemplo removidos.");
                } catch (error) {
                  toast.error(mensagemErro(error, "Não foi possível remover os dados de exemplo."));
                } finally {
                  setDemoBusy(false);
                  setConfirmDemo(false);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
