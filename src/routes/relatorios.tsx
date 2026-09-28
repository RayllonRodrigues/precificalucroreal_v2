import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, Download, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { ClassificacaoBadge, EmptyState, StatCard } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import {
  calcularIndicadores,
  despesaMensalizada,
  useCalculations,
  useCompany,
  useEmployees,
  useExpenses,
  useItems,
} from "@/lib/app-data";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Precifica" },
      {
        name: "description",
        content:
          "Margens por item, itens no prejuízo, composição do custo fixo e evolução dos preços do seu negócio.",
      },
      { property: "og:title", content: "Relatórios — Precifica" },
      { property: "og:description", content: "Enxergue onde está o lucro do seu negócio." },
    ],
  }),
  component: RelatoriosPage,
});

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function RelatoriosPage() {
  const { data: company } = useCompany();
  const { data: calcs } = useCalculations(company?.id);
  const { data: expenses } = useExpenses(company?.id);
  const { data: employees } = useEmployees(company?.id);
  const { data: items } = useItems(company?.id);
  const ind = calcularIndicadores(company, expenses, employees, calcs);

  const lista = calcs ?? [];

  const porItem = useMemo(() => {
    const map = new Map<string, { nome: string; margem: number; lucro: number; preco: number }>();
    for (const c of lista) {
      map.set(c.item_nome, {
        nome: c.item_nome,
        margem: Number(c.margem_liquida),
        lucro: Number(c.lucro_liquido),
        preco: Number(c.preco_sugerido),
      });
    }
    return [...map.values()].sort((a, b) => b.margem - a.margem);
  }, [lista]);

  const evolucao = useMemo(
    () =>
      [...lista]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(-12)
        .map((c) => ({
          data: formatDate(c.created_at),
          preco: Number(c.preco_sugerido),
          margem: Number(c.margem_liquida),
        })),
    [lista],
  );

  const classificacoes = useMemo(() => {
    const counts: Record<string, number> = { saudavel: 0, atencao: 0, prejuizo: 0 };
    for (const c of lista) counts[c.classificacao] = (counts[c.classificacao] ?? 0) + 1;
    return [
      { nome: "Saudável", valor: counts["saudavel"] ?? 0 },
      { nome: "Atenção", valor: counts["atencao"] ?? 0 },
      { nome: "Prejuízo", valor: counts["prejuizo"] ?? 0 },
    ].filter((d) => d.valor > 0);
  }, [lista]);

  const custoFixo = [
    { nome: "Despesas fixas", valor: ind.despesas },
    { nome: "Folha de pagamento", valor: ind.folha },
    { nome: "Pró-labore", valor: ind.proLabore },
  ].filter((d) => d.valor > 0);

  const despesasPorCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of (expenses ?? []).filter((x) => x.ativo)) {
      map.set(e.categoria, (map.get(e.categoria) ?? 0) + despesaMensalizada(e));
    }
    return [...map.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  }, [expenses]);

  const alertas = lista.filter((c) => c.classificacao !== "saudavel");

  function exportarCSV() {
    const header = [
      "Item",
      "Tipo",
      "Modo",
      "Forma de pagamento",
      "Preço sugerido",
      "Preço mínimo",
      "Preço atual",
      "Lucro líquido",
      "Margem líquida (%)",
      "Classificação",
      "Data",
    ];
    const linhas = lista.map((c) =>
      [
        c.item_nome,
        c.tipo,
        c.modo,
        c.forma_pagamento,
        Number(c.preco_sugerido).toFixed(2).replace(".", ","),
        Number(c.preco_minimo).toFixed(2).replace(".", ","),
        Number(c.preco_atual).toFixed(2).replace(".", ","),
        Number(c.lucro_liquido).toFixed(2).replace(".", ","),
        Number(c.margem_liquida).toFixed(2).replace(".", ","),
        c.classificacao,
        formatDate(c.created_at),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const csv = `\uFEFF${header.join(";")}\n${linhas.join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "precifica-relatorio.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado em CSV.");
  }

  if (!lista.length) {
    return (
      <AppLayout title="Relatórios" description="Seus números em gráficos claros.">
        <EmptyState
          icon={BarChart3}
          title="Ainda não há dados para o relatório"
          description="Salve alguns cálculos de preço para ver margens, alertas e evolução por aqui."
          action={
            <Button asChild className="font-semibold">
              <Link to="/precificacao">Calcular um preço</Link>
            </Button>
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Relatórios"
      description="Onde está o lucro, onde está o risco e como seus preços evoluíram."
      actions={
        <Button variant="outline" className="gap-2 font-semibold" onClick={exportarCSV}>
          <Download className="size-4" aria-hidden />
          <span className="hidden sm:inline">Exportar CSV</span>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Margem média"
            value={formatPercent(ind.margemMedia)}
            icon={TrendingUp}
            tone={ind.margemMedia >= 15 ? "success" : "warning"}
          />
          <StatCard label="Lucro médio por venda" value={formatBRL(ind.lucroMedio)} tone="info" />
          <StatCard label="Ticket médio calculado" value={formatBRL(ind.ticketMedio)} />
          <StatCard
            label="Itens com alerta"
            value={String(alertas.length)}
            icon={AlertTriangle}
            tone={alertas.length ? "warning" : "success"}
            hint={`${items?.length ?? 0} itens cadastrados`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="card-soft border-0 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Margem líquida por item</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porItem.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis dataKey="nome" type="category" width={120} fontSize={11} />
                  <Tooltip formatter={(v: number) => formatPercent(v)} />
                  <Bar dataKey="margem" radius={[0, 8, 8, 0]}>
                    {porItem.slice(0, 8).map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.margem >= 15 ? "var(--color-success)" : d.margem >= 0 ? "var(--color-warning)" : "var(--color-destructive)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-soft border-0 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Evolução dos preços calculados</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="data" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v: number) => formatBRL(v)} width={90} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Line
                    type="monotone"
                    dataKey="preco"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={false}
                    name="Preço sugerido"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-soft border-0 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Composição do custo fixo mensal</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={custoFixo} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={95}>
                    {custoFixo.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-soft border-0 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Saúde das margens</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={classificacoes} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={95}>
                    {classificacoes.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.nome === "Saudável"
                            ? "var(--color-success)"
                            : d.nome === "Atenção"
                              ? "var(--color-warning)"
                              : "var(--color-destructive)"
                        }
                      />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {despesasPorCategoria.length > 0 && (
          <Card className="card-soft border-0 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Despesas por categoria</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={despesasPorCategoria}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="nome" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v: number) => formatBRL(v)} width={90} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="valor" fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {alertas.length > 0 && (
          <Card className="card-soft border-0 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Itens que pedem atenção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alertas.slice(0, 8).map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.item_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Margem {formatPercent(Number(c.margem_liquida))} · lucro{" "}
                      {formatBRL(Number(c.lucro_liquido))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClassificacaoBadge value={c.classificacao} />
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to="/precificacao"
                        search={c.item_id ? { item: c.item_id } : {}}
                      >
                        Revisar
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
