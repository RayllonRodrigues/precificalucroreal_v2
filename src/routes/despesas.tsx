import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/format";
import { CATEGORIAS_DESPESA, RECORRENCIAS } from "@/lib/constants";
import {
  despesaMensalizada,
  totalDespesasMensais,
  useCompany,
  useDeleteRow,
  useExpenses,
  useSaveRow,
  type Expense,
} from "@/lib/app-data";

export const Route = createFileRoute("/despesas")({
  head: () => ({
    meta: [
      { title: "Despesas mensais — Precifica" },
      {
        name: "description",
        content:
          "Cadastre aluguel, energia, sistemas e outras despesas fixas para ratear no custo de cada venda.",
      },
      { property: "og:title", content: "Despesas mensais — Precifica" },
      { property: "og:description", content: "Controle das despesas fixas do negócio." },
    ],
  }),
  component: DespesasPage,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

interface Form {
  descricao: string;
  categoria: string;
  valor: number;
  recorrencia: string;
  dia_vencimento: number;
  observacoes: string;
  ativo: boolean;
}

const VAZIO: Form = {
  descricao: "",
  categoria: "aluguel",
  valor: 0,
  recorrencia: "mensal",
  dia_vencimento: 0,
  observacoes: "",
  ativo: true,
};

function DespesasPage() {
  const { data: company } = useCompany();
  const { data: expenses, isLoading } = useExpenses(company?.id);
  const save = useSaveRow("expenses");
  const remove = useDeleteRow("expenses");

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(VAZIO);
  const [excluir, setExcluir] = useState<Expense | null>(null);

  const lista = useMemo(() => {
    let out = [...(expenses ?? [])];
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      out = out.filter((e) => e.descricao.toLowerCase().includes(termo));
    }
    if (filtro !== "todas") out = out.filter((e) => e.categoria === filtro);
    return out.sort((a, b) => despesaMensalizada(b) - despesaMensalizada(a));
  }, [expenses, busca, filtro]);

  const total = totalDespesasMensais(expenses);

  const grafico = useMemo(
    () =>
      Object.entries(
        (expenses ?? [])
          .filter((e) => e.ativo)
          .reduce<Record<string, number>>((acc, e) => {
            acc[e.categoria] = (acc[e.categoria] ?? 0) + despesaMensalizada(e);
            return acc;
          }, {}),
      ).map(([name, value]) => ({ name, value })),
    [expenses],
  );

  async function salvar() {
    if (form.descricao.trim().length < 2) {
      toast.error("Informe a descrição da despesa.");
      return;
    }
    if (form.valor <= 0) {
      toast.error("O valor da despesa precisa ser maior que zero.");
      return;
    }
    try {
      await save.mutateAsync({
        id: editandoId,
        values: {
          company_id: company!.id,
          descricao: form.descricao.trim(),
          categoria: form.categoria,
          valor: form.valor,
          recorrencia: form.recorrencia,
          dia_vencimento: form.dia_vencimento > 0 ? Math.round(form.dia_vencimento) : null,
          observacoes: form.observacoes.trim() || null,
          ativo: form.ativo,
        },
      });
      toast.success(editandoId ? "Despesa atualizada." : "Despesa cadastrada.");
      setAberto(false);
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível salvar."));
    }
  }

  return (
    <AppLayout
      title="Despesas mensais"
      description="Tudo que sai da empresa todo mês, mesmo sem vender."
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
          <span className="hidden sm:inline">Nova despesa</span>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total mensal" value={formatBRL(total)} icon={Receipt} tone="warning" />
          <StatCard
            label="Despesas ativas"
            value={`${(expenses ?? []).filter((e) => e.ativo).length}`}
            icon={Receipt}
          />
          <StatCard
            label="Maior despesa"
            value={formatBRL(
              Math.max(0, ...(expenses ?? []).filter((e) => e.ativo).map(despesaMensalizada)),
            )}
            icon={Receipt}
            tone="destructive"
          />
        </div>

        {grafico.length > 0 && (
          <Card className="card-soft border-0 shadow-soft">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">Composição das despesas</CardTitle>
            </CardHeader>
            <CardContent className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={grafico} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {grafico.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="card-soft flex flex-col gap-3 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar despesa"
              className="pl-9"
              aria-label="Pesquisar despesa"
            />
          </div>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="md:w-52" aria-label="Filtrar por categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {CATEGORIAS_DESPESA.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : lista.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={
              (expenses ?? []).length === 0
                ? "Nenhuma despesa cadastrada"
                : "Nenhuma despesa encontrada"
            }
            description={
              (expenses ?? []).length === 0
                ? "Cadastre aluguel, energia, internet, contabilidade e outras contas fixas. Elas entram no custo fixo por venda."
                : "Ajuste a pesquisa ou o filtro de categoria."
            }
          />
        ) : (
          <div className="space-y-2">
            {lista.map((e) => (
              <article key={e.id} className="card-soft flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold">{e.descricao}</h2>
                    <Badge variant="outline" className="capitalize">
                      {e.categoria}
                    </Badge>
                    {!e.ativo && <Badge variant="outline">Inativa</Badge>}
                    {e.is_demo && <Badge className="bg-warning text-warning-foreground">Demo</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.recorrencia}
                    {e.dia_vencimento ? ` · vence dia ${e.dia_vencimento}` : ""}
                    {e.recorrencia !== "mensal"
                      ? ` · equivale a ${formatBRL(despesaMensalizada(e))}/mês`
                      : ""}
                  </p>
                </div>
                <p className="font-display text-lg font-bold tabular-nums">
                  {formatBRL(Number(e.valor))}
                </p>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={e.ativo}
                    onCheckedChange={() => void save.mutateAsync({ id: e.id, values: { ativo: !e.ativo } })}
                    aria-label={e.ativo ? "Desativar despesa" : "Ativar despesa"}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar despesa"
                    onClick={() => {
                      setEditandoId(e.id);
                      setForm({
                        descricao: e.descricao,
                        categoria: e.categoria,
                        valor: Number(e.valor),
                        recorrencia: e.recorrencia,
                        dia_vencimento: e.dia_vencimento ?? 0,
                        observacoes: e.observacoes ?? "",
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
                    aria-label="Excluir despesa"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setExcluir(e)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar despesa" : "Nova despesa"}</DialogTitle>
            <DialogDescription>
              Despesas fixas são rateadas pela média de vendas mensais.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="desc">Descrição</Label>
              <Input
                id="desc"
                value={form.descricao}
                onChange={(ev) => setForm((f) => ({ ...f, descricao: ev.target.value }))}
                placeholder="Aluguel do ponto comercial"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat">Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
              >
                <SelectTrigger id="cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumberField
              id="valor"
              label="Valor"
              prefix="R$"
              value={form.valor}
              onChange={(v) => setForm((f) => ({ ...f, valor: v }))}
            />
            <div className="space-y-1.5">
              <Label htmlFor="rec">Recorrência</Label>
              <Select
                value={form.recorrencia}
                onValueChange={(v) => setForm((f) => ({ ...f, recorrencia: v }))}
              >
                <SelectTrigger id="rec">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORRENCIAS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumberField
              id="venc"
              label="Dia de vencimento (opcional)"
              value={form.dia_vencimento}
              onChange={(v) => setForm((f) => ({ ...f, dia_vencimento: v }))}
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                rows={2}
                value={form.observacoes}
                onChange={(ev) => setForm((f) => ({ ...f, observacoes: ev.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Despesa ativa</p>
                <p className="text-xs text-muted-foreground">
                  Despesas inativas não entram no custo fixo.
                </p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                aria-label="Despesa ativa"
              />
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
            <AlertDialogTitle>Excluir “{excluir?.descricao}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A despesa deixará de compor o custo fixo. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!excluir) return;
                await remove.mutateAsync(excluir.id);
                toast.success("Despesa excluída.");
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
