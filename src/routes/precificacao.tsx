import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Copy, FileDown, Printer, RefreshCcw, Save, Share2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { mensagemErro } from "@/lib/auth-messages";
import { tipoDoItem } from "@/lib/item-stock";
import { z } from "zod";
import { AppLayout } from "@/components/app-layout";
import { ClassificacaoBadge, KeyValue, NumberField } from "@/components/bits";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { applyRounding, formatBRL, formatPercent } from "@/lib/format";
import {
  calcularCustoDiretoProduto,
  calcularCustoDiretoServico,
  calcularPrecificacao,
  type PricingModo,
} from "@/lib/pricing";
import {
  calcularIndicadores,
  useCalculations,
  useCompany,
  useEmployees,
  useExpenses,
  useItems,
  usePaymentMethods,
  useSaveRow,
} from "@/lib/app-data";

export const Route = createFileRoute("/precificacao")({
  validateSearch: z.object({ item: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Precificação — Precifica" },
      {
        name: "description",
        content:
          "Calcule preço mínimo, ideal e promocional com custos diretos, custo fixo rateado, impostos, comissão e taxa de pagamento.",
      },
      { property: "og:title", content: "Precificação — Precifica" },
      { property: "og:description", content: "Preço mínimo, ideal e promocional em segundos." },
    ],
  }),
  component: PrecificacaoPage,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-success)",
];

function PrecificacaoPage() {
  const search = Route.useSearch();
  const { data: company } = useCompany();
  const { data: items } = useItems(company?.id);
  const { data: expenses } = useExpenses(company?.id);
  const { data: employees } = useEmployees(company?.id);
  const { data: methods } = usePaymentMethods(company?.id);
  const { data: calcs } = useCalculations(company?.id);
  const save = useSaveRow("pricing_calculations");

  const ind = calcularIndicadores(company, expenses, employees, calcs);

  const [tipo, setTipo] = useState<"produto" | "servico">("produto");
  const [itemId, setItemId] = useState<string>("manual");
  const [nomeManual, setNomeManual] = useState("");
  const [modo, setModo] = useState<PricingModo>("ideal");
  const [custoManual, setCustoManual] = useState(0);
  const [impostos, setImpostos] = useState(0);
  const [comissao, setComissao] = useState(0);
  const [lucro, setLucro] = useState(30);
  const [desconto, setDesconto] = useState(10);
  const [metodoId, setMetodoId] = useState<string>("");
  const [precoAtual, setPrecoAtual] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [custoFixoManual, setCustoFixoManual] = useState<number | null>(null);

  useEffect(() => {
    if (company) {
      setImpostos(Number(company.imposto_percentual));
      setComissao(Number(company.comissao_padrao));
      setLucro(Number(company.margem_padrao));
    }
  }, [company]);

  useEffect(() => {
    if (methods?.length && !metodoId) {
      const pix = methods.find((m) => m.tipo === "pix" && m.ativo);
      const escolhido = pix ?? methods.find((m) => m.ativo) ?? methods[0];
      if (escolhido) setMetodoId(escolhido.id);
    }
  }, [methods, metodoId]);

  useEffect(() => {
    if (search.item && items?.length) {
      const found = items.find((i) => i.id === search.item);
      if (found) {
        setItemId(found.id);
        setTipo(tipoDoItem(found.tipo));
      }
    }
  }, [search.item, items]);

  const itemSelecionado = useMemo(
    () => (items ?? []).find((i) => i.id === itemId) ?? null,
    [items, itemId],
  );

  useEffect(() => {
    if (itemSelecionado) setPrecoAtual(Number(itemSelecionado.preco_atual));
  }, [itemSelecionado]);

  const disponiveis = (items ?? []).filter((i) => i.tipo === tipo && i.ativo);
  const metodo = (methods ?? []).find((m) => m.id === metodoId) ?? null;

  const custoDireto = itemSelecionado
    ? itemSelecionado.tipo === "produto"
      ? calcularCustoDiretoProduto({
          custo_aquisicao: Number(itemSelecionado.custo_aquisicao),
          embalagem: Number(itemSelecionado.embalagem),
          frete: Number(itemSelecionado.frete),
          outros_custos: Number(itemSelecionado.outros_custos),
        })
      : calcularCustoDiretoServico({
          horas: Number(itemSelecionado.horas),
          valor_hora: Number(itemSelecionado.valor_hora),
          materiais: Number(itemSelecionado.materiais),
          deslocamento: Number(itemSelecionado.deslocamento),
          terceirizados: Number(itemSelecionado.terceirizados),
          outros_custos: Number(itemSelecionado.outros_custos),
        })
    : custoManual;

  const custoFixo = custoFixoManual ?? ind.custoFixoPorVenda;

  const resultado = calcularPrecificacao({
    custoDireto,
    custoFixoVenda: custoFixo,
    impostosPercentual: impostos,
    comissaoPercentual: comissao,
    taxaPercentual: Number(metodo?.taxa_percentual ?? 0),
    tarifaFixa: Number(metodo?.tarifa_fixa ?? 0),
    lucroPercentual: lucro,
    descontoPercentual: desconto,
    modo,
    precoAtual,
    parcelas: metodo?.parcelas ?? 1,
  });

  const arredondado =
    company && resultado.erro === null
      ? applyRounding(resultado.precoSugerido, company.arredondamento)
      : resultado.precoSugerido;

  const nomeItem = itemSelecionado?.nome ?? nomeManual.trim();

  async function salvarCalculo() {
    if (resultado.erro) {
      toast.error(resultado.erro);
      return;
    }
    if (!nomeItem) {
      toast.error("Selecione um item ou informe um nome para o cálculo manual.");
      return;
    }
    try {
      await save.mutateAsync({
        values: {
          company_id: company!.id,
          item_id: itemSelecionado?.id ?? null,
          item_nome: nomeItem,
          tipo,
          modo,
          forma_pagamento: metodo?.nome ?? "Não informado",
          parcelas: metodo?.parcelas ?? 1,
          custo_direto: custoDireto,
          custo_fixo_venda: custoFixo,
          impostos_percentual: impostos,
          comissao_percentual: comissao,
          taxa_percentual: Number(metodo?.taxa_percentual ?? 0),
          tarifa_fixa: Number(metodo?.tarifa_fixa ?? 0),
          lucro_percentual: modo === "minimo" ? 0 : lucro,
          desconto_percentual: modo === "promocional" ? desconto : 0,
          preco_sugerido: resultado.precoSugerido,
          preco_minimo: resultado.precoMinimo,
          preco_atual: precoAtual,
          valor_liquido: resultado.valorLiquido,
          lucro_liquido: resultado.lucroLiquido,
          margem_liquida: resultado.margemLiquida,
          margem_contribuicao: resultado.margemContribuicao,
          markup: resultado.markup,
          classificacao: resultado.classificacao,
          observacoes: observacoes.trim() || null,
        },
      });
      toast.success("Cálculo salvo no histórico.");
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível salvar."));
    }
  }

  function resumoTexto() {
    return [
      `${nomeItem || "Cálculo manual"} — Precifica`,
      `Preço sugerido: ${formatBRL(resultado.precoSugerido)}`,
      `Preço mínimo: ${formatBRL(resultado.precoMinimo)}`,
      `Forma de pagamento: ${metodo?.nome ?? "—"}`,
      `Lucro líquido: ${formatBRL(resultado.lucroLiquido)} (${formatPercent(resultado.margemLiquida)})`,
      `Valor líquido recebido: ${formatBRL(resultado.valorLiquido)}`,
    ].join("\n");
  }

  return (
    <AppLayout
      title="Precificação"
      description="Preço mínimo, ideal e promocional com todos os custos considerados."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <Card className="card-soft border-0 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">O que você vai precificar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={tipo}
                onValueChange={(v) => {
                  setTipo(v as "produto" | "servico");
                  setItemId("manual");
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="produto">Produto</TabsTrigger>
                  <TabsTrigger value="servico">Serviço</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-1.5">
                <Label htmlFor="item">Item cadastrado</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger id="item">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Cálculo manual</SelectItem>
                    {disponiveis.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {disponiveis.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum {tipo} ativo cadastrado.{" "}
                    <Link to="/itens" className="font-medium text-primary hover:underline">
                      Cadastrar agora
                    </Link>
                  </p>
                )}
              </div>

              {!itemSelecionado && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="nome-manual">Nome do cálculo</Label>
                    <Input
                      id="nome-manual"
                      value={nomeManual}
                      onChange={(e) => setNomeManual(e.target.value)}
                      placeholder="Ex.: Kit festa 30 pessoas"
                    />
                  </div>
                  <NumberField
                    id="custo-manual"
                    label="Custo direto total"
                    prefix="R$"
                    value={custoManual}
                    onChange={setCustoManual}
                    hint="Soma de tudo que você gasta para entregar uma unidade."
                  />
                </>
              )}

              <NumberField
                id="preco-atual"
                label="Preço atual praticado"
                prefix="R$"
                value={precoAtual}
                onChange={setPrecoAtual}
              />
            </CardContent>
          </Card>

          <Card className="card-soft border-0 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Modo de precificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={modo} onValueChange={(v) => setModo(v as PricingModo)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ideal">Preço ideal</TabsTrigger>
                  <TabsTrigger value="minimo">Preço mínimo</TabsTrigger>
                  <TabsTrigger value="promocional">Promocional</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="rounded-xl bg-accent/70 p-3 text-xs text-accent-foreground">
                {modo === "ideal" &&
                  "Cobre todos os custos e ainda entrega a margem de lucro desejada."}
                {modo === "minimo" &&
                  "Cobre custos, custo fixo, impostos, comissão e taxa. Sem lucro: é o piso da negociação."}
                {modo === "promocional" &&
                  "Aplica desconto sobre o preço ideal e avisa se o valor ficar abaixo do mínimo."}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="impostos"
                  label="Impostos"
                  suffix="%"
                  value={impostos}
                  onChange={setImpostos}
                />
                <NumberField
                  id="comissao"
                  label="Comissão"
                  suffix="%"
                  value={comissao}
                  onChange={setComissao}
                />
                {modo !== "minimo" && (
                  <NumberField
                    id="lucro"
                    label="Lucro desejado"
                    suffix="%"
                    value={lucro}
                    onChange={setLucro}
                  />
                )}
                {modo === "promocional" && (
                  <NumberField
                    id="desconto"
                    label="Desconto promocional"
                    suffix="%"
                    value={desconto}
                    onChange={setDesconto}
                  />
                )}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="metodo">Forma de pagamento</Label>
                  <Select value={metodoId} onValueChange={setMetodoId}>
                    <SelectTrigger id="metodo">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(methods ?? [])
                        .filter((m) => m.ativo)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome} — {formatPercent(Number(m.taxa_percentual), 2)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <NumberField
                  id="custo-fixo"
                  label="Custo fixo por venda"
                  prefix="R$"
                  value={custoFixo ?? 0}
                  onChange={(v) => setCustoFixoManual(v)}
                  hint={
                    company?.vendas_mensais
                      ? `Calculado com ${company.vendas_mensais} vendas/mês. Você pode ajustar.`
                      : "Informe a média de vendas nas configurações para o cálculo automático."
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obs-calc">Observações</Label>
                <Textarea
                  id="obs-calc"
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Condições da negociação, cliente, validade da proposta..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="card-soft border-0 shadow-lift">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">Resultado</CardTitle>
                {!resultado.erro && <ClassificacaoBadge value={resultado.classificacao} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {resultado.erro ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Não foi possível calcular</AlertTitle>
                  <AlertDescription>{resultado.erro}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="rounded-2xl bg-brand-gradient p-4 text-primary-foreground">
                    <p className="text-xs opacity-90">Preço sugerido</p>
                    <p className="font-display text-3xl font-extrabold tracking-tight">
                      {formatBRL(resultado.precoSugerido)}
                    </p>
                    {company?.arredondamento !== "nenhum" &&
                      arredondado !== resultado.precoSugerido && (
                        <p className="mt-1 text-xs opacity-90">
                          Arredondado: {formatBRL(arredondado)}
                        </p>
                      )}
                    {(metodo?.parcelas ?? 1) > 1 && (
                      <p className="mt-1 text-sm font-semibold">
                        {metodo?.parcelas}x de {formatBRL(resultado.precoParcela)}
                      </p>
                    )}
                  </div>

                  {resultado.abaixoDoMinimo && (
                    <Alert className="border-warning/40 bg-warning/10">
                      <AlertTriangle className="size-4 text-warning" />
                      <AlertTitle>Preço abaixo do mínimo</AlertTitle>
                      <AlertDescription>
                        O mínimo para não ter prejuízo é {formatBRL(resultado.precoMinimo)}.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <KeyValue label="Preço mínimo" value={resultado.precoMinimo} />
                    <KeyValue label="Preço atual" value={resultado.precoAtual} />
                    <KeyValue
                      label="Diferença atual x sugerido"
                      value={resultado.diferencaAtual}
                      tone={resultado.diferencaAtual >= 0 ? "success" : "destructive"}
                    />
                    <KeyValue label="Custo direto" value={resultado.custoDireto} />
                    <KeyValue label="Custo fixo distribuído" value={resultado.custoFixoVenda} />
                    <KeyValue label="Impostos" value={resultado.impostosValor} />
                    <KeyValue label="Comissão" value={resultado.comissaoValor} />
                    <KeyValue label="Taxa de pagamento" value={resultado.taxaValor} />
                    <KeyValue label="Valor líquido recebido" value={resultado.valorLiquido} />
                    <KeyValue
                      label="Lucro líquido"
                      value={resultado.lucroLiquido}
                      tone={resultado.lucroLiquido >= 0 ? "success" : "destructive"}
                      strong
                    />
                    <KeyValue
                      label="Margem líquida efetiva"
                      value={formatPercent(resultado.margemLiquida)}
                    />
                    <KeyValue
                      label="Markup"
                      value={
                        resultado.markup > 0
                          ? `${resultado.markup.toFixed(2).replace(".", ",")}x`
                          : "—"
                      }
                    />
                  </div>

                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={resultado.composicao}
                          dataKey="valor"
                          nameKey="nome"
                          innerRadius={45}
                          outerRadius={75}
                        >
                          {resultado.composicao.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatBRL(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-center text-xs text-muted-foreground">
                      Composição do preço sugerido
                    </p>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="col-span-2 gap-2 font-semibold"
                  onClick={() => void salvarCalculo()}
                  disabled={save.isPending || !!resultado.erro}
                >
                  <Save className="size-4" aria-hidden /> Salvar cálculo
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setCustoFixoManual(null);
                    toast.success("Valores recalculados com os dados atuais.");
                  }}
                >
                  <RefreshCcw className="size-4" aria-hidden /> Recalcular
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setNomeManual(`${nomeItem || "Simulação"} (cópia)`);
                    setItemId("manual");
                    setCustoManual(custoDireto);
                    toast.success("Simulação duplicada. Ajuste os valores como quiser.");
                  }}
                >
                  <Copy className="size-4" aria-hidden /> Duplicar
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                  <Printer className="size-4" aria-hidden /> Imprimir
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    toast.info("Na janela de impressão, escolha “Salvar como PDF”.");
                    window.print();
                  }}
                >
                  <FileDown className="size-4" aria-hidden /> PDF
                </Button>
                <Button
                  variant="outline"
                  className="col-span-2 gap-2"
                  onClick={async () => {
                    const texto = resumoTexto();
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: "Precifica", text: texto });
                        return;
                      } catch {
                        /* usuário cancelou */
                      }
                    }
                    await navigator.clipboard.writeText(texto);
                    toast.success("Resumo copiado para a área de transferência.");
                  }}
                >
                  <Share2 className="size-4" aria-hidden /> Compartilhar resumo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
