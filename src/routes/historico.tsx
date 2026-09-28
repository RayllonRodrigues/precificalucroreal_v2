import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { History, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { ClassificacaoBadge, EmptyState, KeyValue, ListSkeleton } from "@/components/bits";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { useCalculations, useCompany, useDeleteRow, type Calculation } from "@/lib/app-data";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de cálculos — Precifica" },
      {
        name: "description",
        content: "Todos os preços calculados, com filtros por tipo, modo e saúde da margem.",
      },
      { property: "og:title", content: "Histórico de cálculos — Precifica" },
      { property: "og:description", content: "Consulte e revise seus cálculos de preço." },
    ],
  }),
  component: HistoricoPage,
});

const MODO_LABEL: Record<string, string> = {
  ideal: "Ideal",
  minimo: "Mínimo",
  promocional: "Promocional",
};

function HistoricoPage() {
  const { data: company } = useCompany();
  const { data: calcs, isLoading } = useCalculations(company?.id);
  const remove = useDeleteRow("pricing_calculations");

  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [modo, setModo] = useState("todos");
  const [classificacao, setClassificacao] = useState("todas");
  const [detalhe, setDetalhe] = useState<Calculation | null>(null);
  const [excluir, setExcluir] = useState<Calculation | null>(null);

  const lista = useMemo(() => {
    return (calcs ?? [])
      .filter((c) => c.item_nome.toLowerCase().includes(busca.trim().toLowerCase()))
      .filter((c) => tipo === "todos" || c.tipo === tipo)
      .filter((c) => modo === "todos" || c.modo === modo)
      .filter((c) => classificacao === "todas" || c.classificacao === classificacao);
  }, [calcs, busca, tipo, modo, classificacao]);

  return (
    <AppLayout
      title="Histórico"
      description="Cada cálculo salvo fica registrado aqui para consulta e comparação."
      actions={
        <Button asChild className="font-semibold">
          <Link to="/precificacao">Novo cálculo</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por item"
              aria-label="Buscar no histórico"
              className="pl-9"
            />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="produto">Produtos</SelectItem>
              <SelectItem value="servico">Serviços</SelectItem>
            </SelectContent>
          </Select>
          <Select value={modo} onValueChange={setModo}>
            <SelectTrigger aria-label="Filtrar por modo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os modos</SelectItem>
              <SelectItem value="ideal">Preço ideal</SelectItem>
              <SelectItem value="minimo">Preço mínimo</SelectItem>
              <SelectItem value="promocional">Promocional</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classificacao} onValueChange={setClassificacao}>
            <SelectTrigger aria-label="Filtrar por saúde">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as margens</SelectItem>
              <SelectItem value="saudavel">Saudável</SelectItem>
              <SelectItem value="atencao">Atenção</SelectItem>
              <SelectItem value="prejuizo">Prejuízo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : lista.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhum cálculo encontrado"
            description="Salve um cálculo na tela de precificação para acompanhar a evolução dos seus preços."
            action={
              <Button asChild className="font-semibold">
                <Link to="/precificacao">Calcular um preço</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {lista.map((c) => (
              <li key={c.id}>
                <article className="card-soft flex flex-wrap items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setDetalhe(c)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display truncate font-bold">{c.item_nome}</h3>
                      <Badge variant="outline">{c.tipo === "produto" ? "Produto" : "Serviço"}</Badge>
                      <Badge variant="outline">{MODO_LABEL[c.modo] ?? c.modo}</Badge>
                      <ClassificacaoBadge value={c.classificacao} />
                      {c.is_demo && <Badge className="bg-warning text-warning-foreground">Demo</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(c.created_at)} · {c.forma_pagamento} · lucro{" "}
                      {formatBRL(Number(c.lucro_liquido))} ({formatPercent(Number(c.margem_liquida))})
                    </p>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Preço sugerido</p>
                      <p className="font-display text-lg font-bold">
                        {formatBRL(Number(c.preco_sugerido))}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir cálculo de ${c.item_nome}`}
                      onClick={() => setExcluir(c)}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{detalhe?.item_nome}</DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div>
              <KeyValue label="Data" value={formatDate(detalhe.created_at)} />
              <KeyValue label="Modo" value={MODO_LABEL[detalhe.modo] ?? detalhe.modo} />
              <KeyValue label="Forma de pagamento" value={detalhe.forma_pagamento} />
              <KeyValue label="Preço sugerido" value={Number(detalhe.preco_sugerido)} strong />
              <KeyValue label="Preço mínimo" value={Number(detalhe.preco_minimo)} />
              <KeyValue label="Preço atual" value={Number(detalhe.preco_atual)} />
              <KeyValue label="Custo direto" value={Number(detalhe.custo_direto)} />
              <KeyValue label="Custo fixo por venda" value={Number(detalhe.custo_fixo_venda)} />
              <KeyValue label="Impostos" value={formatPercent(Number(detalhe.impostos_percentual))} />
              <KeyValue label="Comissão" value={formatPercent(Number(detalhe.comissao_percentual))} />
              <KeyValue
                label="Taxa de pagamento"
                value={`${formatPercent(Number(detalhe.taxa_percentual))} + ${formatBRL(Number(detalhe.tarifa_fixa))}`}
              />
              <KeyValue label="Valor líquido" value={Number(detalhe.valor_liquido)} />
              <KeyValue
                label="Lucro líquido"
                value={Number(detalhe.lucro_liquido)}
                tone={Number(detalhe.lucro_liquido) >= 0 ? "success" : "destructive"}
                strong
              />
              <KeyValue label="Margem líquida" value={formatPercent(Number(detalhe.margem_liquida))} />
              {detalhe.observacoes && <KeyValue label="Observações" value={detalhe.observacoes} />}
              <div className="mt-4 flex gap-2">
                <Button asChild className="flex-1 font-semibold">
                  <Link
                    to="/precificacao"
                    search={detalhe.item_id ? { item: detalhe.item_id } : {}}
                  >
                    Recalcular
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este cálculo?</AlertDialogTitle>
            <AlertDialogDescription>
              O cálculo de {excluir?.item_nome} sairá do histórico. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!excluir) return;
                await remove.mutateAsync(excluir.id);
                setExcluir(null);
                toast.success("Cálculo excluído.");
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
