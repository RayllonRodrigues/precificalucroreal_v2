import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Calculator,
  CreditCard,
  History,
  Package,
  PiggyBank,
  Receipt,
  Scale,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/app-layout";
import { ClassificacaoBadge, EmptyState, ListSkeleton, StatCard } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import {
  calcularIndicadores,
  useCalculations,
  useCompany,
  useEmployees,
  useExpenses,
  useItems,
  despesaMensalizada,
} from "@/lib/app-data";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Precifica" },
      {
        name: "description",
        content:
          "Acompanhe faturamento, custo fixo, ticket médio, ponto de equilíbrio e as últimas precificações do seu negócio.",
      },
      { property: "og:title", content: "Painel — Precifica" },
      { property: "og:description", content: "Indicadores e gráficos do seu negócio." },
    ],
  }),
  component: Painel,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const ATALHOS = [
  { to: "/precificacao", label: "Precificar", icon: Calculator },
  { to: "/itens", label: "Produtos e serviços", icon: Package },
  { to: "/despesas", label: "Despesas", icon: Receipt },
  { to: "/equipe", label: "Funcionários", icon: Users },
  { to: "/pagamentos", label: "Taxas", icon: CreditCard },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: { title: string; description: string } | undefined;
}) {
  return (
    <Card className="border-border/70 gap-0 rounded-2xl border bg-card p-0 shadow-none">
      <CardHeader className="border-border/60 border-b px-5 py-4">
        <CardTitle className="text-muted-foreground text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] px-4 py-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-display text-base font-bold tracking-tight">{empty.title}</p>
            <p className="text-muted-foreground mt-1.5 max-w-xs text-xs leading-relaxed">
              {empty.description}
            </p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function Painel() {
  const { data: company } = useCompany();
  const { data: items, isLoading: loadingItems } = useItems(company?.id);
  const { data: expenses } = useExpenses(company?.id);
  const { data: employees } = useEmployees(company?.id);
  const { data: calcs, isLoading: loadingCalcs } = useCalculations(company?.id);

  const ind = calcularIndicadores(company, expenses, employees, calcs);
  const produtos = (items ?? []).filter((i) => i.tipo === "produto").length;
  const servicos = (items ?? []).filter((i) => i.tipo === "servico").length;

  const evolucao = [...(calcs ?? [])]
    .slice(0, 12)
    .reverse()
    .map((c) => ({
      data: formatDate(c.created_at),
      preco: Number(c.preco_sugerido),
      lucro: Number(c.lucro_liquido),
    }));

  const custosFixos = [
    { name: "Despesas", value: ind.despesas },
    { name: "Folha", value: ind.folha },
    { name: "Pró-labore", value: ind.proLabore },
  ].filter((d) => d.value > 0);

  const despesasPorCategoria = Object.entries(
    (expenses ?? [])
      .filter((e) => e.ativo)
      .reduce<Record<string, number>>((acc, e) => {
        acc[e.categoria] = (acc[e.categoria] ?? 0) + despesaMensalizada(e);
        return acc;
      }, {}),
  ).map(([name, value]) => ({ name, value }));

  const maioresMargens = [...(calcs ?? [])]
    .sort((a, b) => Number(b.margem_liquida) - Number(a.margem_liquida))
    .slice(0, 5)
    .map((c) => ({ nome: c.item_nome.slice(0, 14), margem: Number(c.margem_liquida) }));

  const comparativo = [...(calcs ?? [])].slice(0, 6).map((c) => ({
    nome: c.item_nome.slice(0, 12),
    atual: Number(c.preco_atual),
    sugerido: Number(c.preco_sugerido),
  }));

  return (
    <AppLayout
      title="Resumo do seu negócio"
      description="Indicadores, gráficos e as últimas precificações em um só lugar."
      actions={
        <Button asChild className="gap-2 rounded-xl font-semibold">
          <Link to="/precificacao">
            <Calculator className="size-4" aria-hidden />
            <span className="hidden sm:inline">Nova precificação</span>
          </Link>
        </Button>
      }
    >
      <div className="space-y-12">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Faturamento mensal informado"
            value={formatBRL(Number(company?.faturamento_mensal ?? 0))}
            icon={Wallet}
            hint={`${company?.vendas_mensais ?? 0} vendas/mês`}
          />
          <StatCard
            label="Despesas fixas mensais"
            value={formatBRL(ind.despesas)}
            icon={Receipt}
            tone="warning"
          />
          <StatCard
            label="Folha mensal com encargos"
            value={formatBRL(ind.folha)}
            icon={Users}
            tone="info"
          />
          <StatCard
            label="Custo fixo por venda"
            value={formatBRL(ind.custoFixoPorVenda)}
            icon={PiggyBank}
            hint={
              company?.vendas_mensais
                ? `Rateio sobre ${company.vendas_mensais} vendas`
                : "Informe a média de vendas nas configurações"
            }
          />
          <StatCard
            label="Produtos e serviços"
            value={`${produtos + servicos}`}
            icon={Package}
            hint={`${produtos} produtos · ${servicos} serviços`}
          />
          <StatCard
            label="Precificações salvas"
            value={`${calcs?.length ?? 0}`}
            icon={History}
            hint={`Ticket médio ${formatBRL(ind.ticketMedio)}`}
          />
          <StatCard
            label="Lucro médio por venda"
            value={formatBRL(ind.lucroMedio)}
            icon={TrendingUp}
            tone={ind.lucroMedio >= 0 ? "success" : "destructive"}
            hint={`Margem média ${formatPercent(ind.margemMedia)}`}
          />
          <StatCard
            label="Ponto de equilíbrio mensal"
            value={ind.pontoEquilibrio === null ? "Sem dados" : formatBRL(ind.pontoEquilibrio)}
            icon={Scale}
            tone="info"
            hint={
              ind.pontoEquilibrio === null
                ? "Salve precificações para calcular"
                : "Faturamento necessário para empatar"
            }
          />
        </section>

        <section>
          <h2 className="text-muted-foreground border-border/70 mb-5 border-b pb-3 text-[0.65rem] font-semibold tracking-[0.18em] uppercase">
            Atalhos
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ATALHOS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="border-border/70 bg-card hover:border-primary/40 hover:bg-accent/40 flex flex-col gap-3 rounded-2xl border p-4 transition-colors"
              >
                <span className="bg-accent text-primary flex size-9 items-center justify-center rounded-lg">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-xs leading-snug font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Evolução das precificações"
            empty={
              evolucao.length
                ? undefined
                : {
                    title: "Nenhuma precificação salva",
                    description: "Faça um cálculo e salve para acompanhar a evolução.",
                  }
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="data" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Line
                  type="monotone"
                  dataKey="preco"
                  name="Preço sugerido"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="lucro"
                  name="Lucro líquido"
                  stroke="var(--color-chart-5)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Composição dos custos fixos"
            empty={
              custosFixos.length
                ? undefined
                : {
                    title: "Sem custos fixos cadastrados",
                    description: "Cadastre despesas, funcionários ou informe o pró-labore.",
                  }
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={custosFixos} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                  {custosFixos.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Distribuição das despesas"
            empty={
              despesasPorCategoria.length
                ? undefined
                : {
                    title: "Nenhuma despesa cadastrada",
                    description: "Cadastre aluguel, energia, internet e outras despesas fixas.",
                  }
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={despesasPorCategoria}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={85}
                  label={false}
                >
                  {despesasPorCategoria.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Itens com maior margem"
            empty={
              maioresMargens.length
                ? undefined
                : {
                    title: "Sem cálculos para comparar",
                    description: "Salve precificações para ver quais itens rendem mais.",
                  }
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maioresMargens}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="nome" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip formatter={(v: number) => formatPercent(Number(v))} />
                <Bar dataKey="margem" name="Margem líquida" fill="var(--color-chart-1)" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Preço atual x preço sugerido"
            empty={
              comparativo.length
                ? undefined
                : {
                    title: "Sem comparação disponível",
                    description: "Cadastre o preço atual dos itens e salve uma precificação.",
                  }
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativo}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="nome" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="atual" name="Preço atual" fill="var(--color-chart-3)" radius={6} />
                <Bar dataKey="sugerido" name="Sugerido" fill="var(--color-chart-1)" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section>
          <div className="border-border/70 mb-5 flex items-center justify-between border-b pb-3">
            <h2 className="text-muted-foreground text-[0.65rem] font-semibold tracking-[0.18em] uppercase">
              Últimas precificações
            </h2>
            <Button asChild variant="ghost" size="sm" className="font-semibold">
              <Link to="/historico">Ver histórico</Link>
            </Button>
          </div>

          {loadingCalcs || loadingItems ? (
            <ListSkeleton rows={3} />
          ) : (calcs ?? []).length === 0 ? (
            <EmptyState
              icon={Calculator}
              title="Você ainda não salvou nenhuma precificação"
              description="Cadastre seus produtos ou serviços, informe custos e despesas e calcule o preço ideal em poucos segundos."
              action={
                <Button asChild className="font-semibold">
                  <Link to="/precificacao">Fazer primeira precificação</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-border/70 border-border/70 divide-y border-b">
              {(calcs ?? []).slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  to="/historico"
                  className="hover:bg-muted/40 -mx-3 flex flex-wrap items-center justify-between gap-3 px-3 py-4 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.item_nome}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDate(c.created_at)} · {c.forma_pagamento}
                      {c.parcelas > 1 ? ` ${c.parcelas}x` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-display font-bold">{formatBRL(Number(c.preco_sugerido))}</p>
                      <p className="text-xs text-muted-foreground">
                        Lucro {formatBRL(Number(c.lucro_liquido))}
                      </p>
                    </div>
                    <ClassificacaoBadge value={c.classificacao} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
