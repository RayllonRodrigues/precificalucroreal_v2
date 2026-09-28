import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { mensagemErro } from "@/lib/auth-messages";
import { AppLayout } from "@/components/app-layout";
import { EmptyState, ListSkeleton, NumberField, StatCard } from "@/components/bits";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { formatBRL, formatPercent } from "@/lib/format";
import { custoMensalFuncionario } from "@/lib/pricing";
import {
  totalDespesasMensais,
  totalFolhaMensal,
  useCompany,
  useDeleteRow,
  useEmployees,
  useExpenses,
  useSaveRow,
  type Employee,
} from "@/lib/app-data";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Funcionários e folha — Precifica" },
      {
        name: "description",
        content:
          "Calcule a folha mensal com encargos e benefícios e veja o impacto dela no custo fixo do negócio.",
      },
      { property: "og:title", content: "Funcionários e folha — Precifica" },
      { property: "og:description", content: "Folha mensal com encargos e benefícios." },
    ],
  }),
  component: EquipePage,
});

interface Form {
  nome: string;
  salario: number;
  quantidade: number;
  encargos_percentual: number;
  beneficios: number;
  outros_custos: number;
  ativo: boolean;
}

const VAZIO: Form = {
  nome: "",
  salario: 0,
  quantidade: 1,
  encargos_percentual: 38,
  beneficios: 0,
  outros_custos: 0,
  ativo: true,
};

function EquipePage() {
  const { data: company } = useCompany();
  const { data: employees, isLoading } = useEmployees(company?.id);
  const { data: expenses } = useExpenses(company?.id);
  const save = useSaveRow("employees");
  const remove = useDeleteRow("employees");

  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(VAZIO);
  const [excluir, setExcluir] = useState<Employee | null>(null);

  const folha = totalFolhaMensal(employees);
  const faturamento = Number(company?.faturamento_mensal ?? 0);
  const percentualFaturamento = faturamento > 0 ? (folha / faturamento) * 100 : 0;
  const custoFixoTotal = folha + totalDespesasMensais(expenses) + Number(company?.pro_labore ?? 0);
  const impactoFixo = custoFixoTotal > 0 ? (folha / custoFixoTotal) * 100 : 0;

  async function salvar() {
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome ou a função.");
      return;
    }
    if (form.quantidade < 1) {
      toast.error("A quantidade de profissionais precisa ser pelo menos 1.");
      return;
    }
    try {
      await save.mutateAsync({
        id: editandoId,
        values: {
          company_id: company!.id,
          nome: form.nome.trim(),
          salario: form.salario,
          quantidade: Math.round(form.quantidade),
          encargos_percentual: form.encargos_percentual,
          beneficios: form.beneficios,
          outros_custos: form.outros_custos,
          ativo: form.ativo,
        },
      });
      toast.success(editandoId ? "Registro atualizado." : "Função cadastrada.");
      setAberto(false);
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível salvar."));
    }
  }

  return (
    <AppLayout
      title="Funcionários e folha mensal"
      description="Salários, encargos e benefícios que entram no custo fixo."
      actions={
        <Button
          className="gap-2 font-semibold"
          onClick={() => {
            setEditandoId(null);
            setForm(VAZIO);
            setAberto(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          <span className="hidden sm:inline">Nova função</span>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Custo total da folha" value={formatBRL(folha)} icon={Users} tone="info" />
          <StatCard
            label="Folha sobre o faturamento"
            value={faturamento > 0 ? formatPercent(percentualFaturamento) : "Sem faturamento"}
            icon={Users}
            tone={percentualFaturamento > 35 ? "destructive" : "success"}
            hint={
              faturamento > 0
                ? undefined
                : "Informe o faturamento mensal nas configurações"
            }
          />
          <StatCard
            label="Impacto no custo fixo"
            value={custoFixoTotal > 0 ? formatPercent(impactoFixo) : "Sem custo fixo"}
            icon={Users}
            tone="warning"
          />
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : (employees ?? []).length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum funcionário cadastrado"
            description="Cadastre funções, salários e encargos. Se você trabalha sozinho, informe apenas o pró-labore nas configurações."
          />
        ) : (
          <div className="space-y-2">
            {(employees ?? []).map((e) => {
              const custo = custoMensalFuncionario({
                quantidade: e.quantidade,
                salario: Number(e.salario),
                beneficios: Number(e.beneficios),
                outros_custos: Number(e.outros_custos),
                encargos_percentual: Number(e.encargos_percentual),
              });
              return (
                <article key={e.id} className="card-soft p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold">{e.nome}</h2>
                        <Badge variant="outline">
                          {e.quantidade} {e.quantidade > 1 ? "profissionais" : "profissional"}
                        </Badge>
                        {!e.ativo && <Badge variant="outline">Inativo</Badge>}
                        {e.is_demo && (
                          <Badge className="bg-warning text-warning-foreground">Demo</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Salário {formatBRL(Number(e.salario))} · encargos{" "}
                        {formatPercent(Number(e.encargos_percentual))} · benefícios{" "}
                        {formatBRL(Number(e.beneficios))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold tabular-nums">
                        {formatBRL(custo)}
                      </p>
                      <p className="text-xs text-muted-foreground">custo mensal total</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={e.ativo}
                        onCheckedChange={() =>
                          void save.mutateAsync({ id: e.id, values: { ativo: !e.ativo } })
                        }
                        aria-label={e.ativo ? "Desativar" : "Ativar"}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Editar"
                        onClick={() => {
                          setEditandoId(e.id);
                          setForm({
                            nome: e.nome,
                            salario: Number(e.salario),
                            quantidade: e.quantidade,
                            encargos_percentual: Number(e.encargos_percentual),
                            beneficios: Number(e.beneficios),
                            outros_custos: Number(e.outros_custos),
                            ativo: e.ativo,
                          });
                          setAberto(true);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Excluir"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setExcluir(e)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                  {folha > 0 && (
                    <div className="mt-3">
                      <Progress value={(custo / folha) * 100} className="h-1.5" />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatPercent((custo / folha) * 100)} da folha total
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar função" : "Nova função"}</DialogTitle>
            <DialogDescription>
              custo mensal = quantidade × (salário + benefícios + outros custos + salário ×
              encargos)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="func-nome">Nome ou função</Label>
              <Input
                id="func-nome"
                value={form.nome}
                onChange={(ev) => setForm((f) => ({ ...f, nome: ev.target.value }))}
                placeholder="Atendente de loja"
              />
            </div>
            <NumberField
              id="salario"
              label="Salário mensal"
              prefix="R$"
              value={form.salario}
              onChange={(v) => setForm((f) => ({ ...f, salario: v }))}
            />
            <NumberField
              id="qtd"
              label="Quantidade de profissionais"
              min={1}
              value={form.quantidade}
              onChange={(v) => setForm((f) => ({ ...f, quantidade: v }))}
            />
            <NumberField
              id="encargos"
              label="Percentual de encargos"
              suffix="%"
              value={form.encargos_percentual}
              onChange={(v) => setForm((f) => ({ ...f, encargos_percentual: v }))}
              hint="Inclui INSS, FGTS, férias e 13º proporcionais."
            />
            <NumberField
              id="beneficios"
              label="Benefícios (R$)"
              prefix="R$"
              value={form.beneficios}
              onChange={(v) => setForm((f) => ({ ...f, beneficios: v }))}
            />
            <NumberField
              id="outros-func"
              label="Outros custos mensais"
              prefix="R$"
              value={form.outros_custos}
              onChange={(v) => setForm((f) => ({ ...f, outros_custos: v }))}
            />
            <div className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Ativo</p>
                <p className="text-xs text-muted-foreground">Inativos não entram na folha.</p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                aria-label="Ativo"
              />
            </div>
            <div className="rounded-xl bg-accent/70 p-3 text-sm font-medium text-accent-foreground sm:col-span-2">
              Custo mensal calculado:{" "}
              {formatBRL(
                custoMensalFuncionario({
                  quantidade: form.quantidade || 1,
                  salario: form.salario,
                  beneficios: form.beneficios,
                  outros_custos: form.outros_custos,
                  encargos_percentual: form.encargos_percentual,
                }),
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button className="font-semibold" onClick={() => void salvar()} disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={(open) => !open && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{excluir?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O custo desta função sairá da folha mensal. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!excluir) return;
                await remove.mutateAsync(excluir.id);
                toast.success("Registro excluído.");
                setExcluir(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
