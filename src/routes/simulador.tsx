import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GitCompareArrows, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "@/components/app-layout";
import { ClassificacaoBadge, EmptyState, KeyValue, NumberField } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatPercent } from "@/lib/format";
import {
  calcularCustoDiretoProduto,
  calcularCustoDiretoServico,
  calcularPrecificacao,
} from "@/lib/pricing";
import {
  calcularIndicadores,
  useCalculations,
  useCompany,
  useEmployees,
  useExpenses,
  useItems,
  usePaymentMethods,
} from "@/lib/app-data";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de cenários — Precifica" },
      {
        name: "description",
        content:
          "Compare até três cenários de preço, forma de pagamento e margem lado a lado e veja qual dá mais lucro.",
      },
      { property: "og:title", content: "Simulador de cenários — Precifica" },
      { property: "og:description", content: "Compare preços e formas de pagamento lado a lado." },
    ],
  }),
  component: SimuladorPage,
});

interface Cenario {
  nome: string;
  lucro: number;
  desconto: number;
  metodoId: string;
}

function SimuladorPage() {
  const { data: company } = useCompany();
  const { data: items } = useItems(company?.id);
  const { data: expenses } = useExpenses(company?.id);
  const { data: employees } = useEmployees(company?.id);
  const { data: methods } = usePaymentMethods(company?.id);
  const { data: calcs } = useCalculations(company?.id);
  const ind = calcularIndicadores(company, expenses, employees, calcs);

  const ativos = (items ?? []).filter((i) => i.ativo);
  const [itemId, setItemId] = useState<string>("");
  const [cenarios, setCenarios] = useState<Cenario[]>([]);

  useEffect(() => {
    const primeiro = ativos[0];
    if (primeiro && !itemId) setItemId(primeiro.id);
  }, [ativos, itemId]);

  useEffect(() => {
    if (methods?.length && cenarios.length === 0) {
      const ativas = methods.filter((m) => m.ativo);
      const pick = (i: number) => (ativas[i] ?? ativas[0])?.id ?? "";
      setCenarios([
        { nome: "Cenário A", lucro: Number(company?.margem_padrao ?? 30), desconto: 0, metodoId: pick(0) },
        { nome: "Cenário B", lucro: 20, desconto: 0, metodoId: pick(2) },
        { nome: "Cenário C", lucro: 15, desconto: 10, metodoId: pick(4) },
      ]);
    }
  }, [methods, cenarios.length, company]);

  const item = ativos.find((i) => i.id === itemId) ?? null;

  const custoDireto = item
    ? item.tipo === "produto"
      ? calcularCustoDiretoProduto({
          custo_aquisicao: Number(item.custo_aquisicao),
          embalagem: Number(item.embalagem),
          frete: Number(item.frete),
          outros_custos: Number(item.outros_custos),
        })
      : calcularCustoDiretoServico({
          horas: Number(item.horas),
          valor_hora: Number(item.valor_hora),
          materiais: Number(item.materiais),
          deslocamento: Number(item.deslocamento),
          terceirizados: Number(item.terceirizados),
          outros_custos: Number(item.outros_custos),
        })
    : 0;

  const resultados = useMemo(
    () =>
      cenarios.map((c) => {
        const metodo = (methods ?? []).find((m) => m.id === c.metodoId) ?? null;
        return {
          cenario: c,
          metodo,
          resultado: calcularPrecificacao({
            custoDireto,
            custoFixoVenda: ind.custoFixoPorVenda,
            impostosPercentual: Number(company?.imposto_percentual ?? 0),
            comissaoPercentual: Number(company?.comissao_padrao ?? 0),
            taxaPercentual: Number(metodo?.taxa_percentual ?? 0),
            tarifaFixa: Number(metodo?.tarifa_fixa ?? 0),
            lucroPercentual: c.lucro,
            descontoPercentual: c.desconto,
            modo: c.desconto > 0 ? "promocional" : "ideal",
            precoAtual: Number(item?.preco_atual ?? 0),
            parcelas: metodo?.parcelas ?? 1,
          }),
        };
      }),
    [cenarios, methods, custoDireto, ind.custoFixoPorVenda, company, item],
  );

  const melhorIndex = resultados.reduce(
    (best, r, i) =>
      r.resultado.erro === null && r.resultado.lucroLiquido > (resultados[best]?.resultado.lucroLiquido ?? -Infinity)
        ? i
        : best,
    0,
  );

  function atualizar(index: number, patch: Partial<Cenario>) {
    setCenarios((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  if (!ativos.length) {
    return (
      <AppLayout title="Simulador" description="Compare cenários de preço lado a lado.">
        <EmptyState
          icon={GitCompareArrows}
          title="Cadastre um item para simular"
          description="O simulador compara cenários a partir de um produto ou serviço já cadastrado."
          action={
            <Button asChild className="font-semibold">
              <Link to="/itens">Cadastrar item</Link>
            </Button>
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Simulador de cenários"
      description="Mude a margem, o desconto e a forma de pagamento e veja o impacto no lucro."
    >
      <div className="space-y-4">
        <Card className="card-soft border-0 shadow-soft">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sim-item">Item base</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger id="sim-item">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ativos.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl bg-accent/70 p-3 text-sm text-accent-foreground">
              Custo direto {formatBRL(custoDireto)} · custo fixo por venda{" "}
              {formatBRL(ind.custoFixoPorVenda)} · impostos{" "}
              {formatPercent(Number(company?.imposto_percentual ?? 0))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {resultados.map(({ cenario, metodo, resultado }, index) => (
            <Card
              key={index}
              className={`card-soft border-0 shadow-soft ${index === melhorIndex ? "ring-2 ring-primary" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">{cenario.nome}</CardTitle>
                  {index === melhorIndex && resultado.erro === null && (
                    <Badge className="gap-1 bg-success text-success-foreground">
                      <Trophy className="size-3" aria-hidden /> Melhor lucro
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`met-${index}`}>Forma de pagamento</Label>
                  <Select
                    value={cenario.metodoId}
                    onValueChange={(v) => atualizar(index, { metodoId: v })}
                  >
                    <SelectTrigger id={`met-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(methods ?? [])
                        .filter((m) => m.ativo)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <NumberField
                  id={`lucro-${index}`}
                  label="Lucro desejado"
                  suffix="%"
                  value={cenario.lucro}
                  onChange={(v) => atualizar(index, { lucro: v })}
                />
                <NumberField
                  id={`desc-${index}`}
                  label="Desconto"
                  suffix="%"
                  value={cenario.desconto}
                  onChange={(v) => atualizar(index, { desconto: v })}
                />

                {resultado.erro ? (
                  <p className="text-sm font-medium text-destructive">{resultado.erro}</p>
                ) : (
                  <>
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Preço sugerido</p>
                      <p className="font-display text-2xl font-extrabold">
                        {formatBRL(resultado.precoSugerido)}
                      </p>
                      {(metodo?.parcelas ?? 1) > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {metodo?.parcelas}x de {formatBRL(resultado.precoParcela)}
                        </p>
                      )}
                    </div>
                    <KeyValue label="Preço mínimo" value={resultado.precoMinimo} />
                    <KeyValue label="Recebido líquido" value={resultado.valorLiquido} />
                    <KeyValue
                      label="Lucro líquido"
                      value={resultado.lucroLiquido}
                      tone={resultado.lucroLiquido >= 0 ? "success" : "destructive"}
                      strong
                    />
                    <KeyValue label="Margem" value={formatPercent(resultado.margemLiquida)} />
                    <div className="pt-1">
                      <ClassificacaoBadge value={resultado.classificacao} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card-soft border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Comparativo de lucro por cenário</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={resultados.map((r) => ({
                  nome: r.cenario.nome,
                  lucro: r.resultado.lucroLiquido,
                  preco: r.resultado.precoSugerido,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="nome" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v: number) => formatBRL(v)} width={90} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="lucro" radius={[8, 8, 0, 0]}>
                  {resultados.map((r, i) => (
                    <Cell
                      key={i}
                      fill={r.resultado.lucroLiquido >= 0 ? "var(--color-primary)" : "var(--color-destructive)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
