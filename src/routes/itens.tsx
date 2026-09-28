import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, Copy, Package, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { mensagemErro } from "@/lib/auth-messages";
import { AppLayout } from "@/components/app-layout";
import { EmptyState, ListSkeleton, NumberField } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/format";
import { calcularCustoDiretoProduto, calcularCustoDiretoServico } from "@/lib/pricing";
import { useCompany, useDeleteRow, useItems, useSaveRow, type Item } from "@/lib/app-data";
import { estoqueDoItem, tipoDoItem } from "@/lib/item-stock";

export const Route = createFileRoute("/itens")({
  head: () => ({
    meta: [
      { title: "Produtos e serviços — Precifica" },
      {
        name: "description",
        content:
          "Cadastre produtos e serviços com custos, embalagem, frete, horas e materiais para precificar com precisão.",
      },
      { property: "og:title", content: "Produtos e serviços — Precifica" },
      { property: "og:description", content: "Cadastro unificado de produtos e serviços." },
    ],
  }),
  component: ItensPage,
});

type Form = {
  tipo: "produto" | "servico";
  nome: string;
  categoria: string;
  descricao: string;
  sku: string;
  custo_aquisicao: number;
  embalagem: number;
  frete: number;
  outros_custos: number;
  estoque: number;
  horas: number;
  valor_hora: number;
  materiais: number;
  deslocamento: number;
  terceirizados: number;
  preco_atual: number;
  ativo: boolean;
  observacoes: string;
};

const FORM_VAZIO: Form = {
  tipo: "produto",
  nome: "",
  categoria: "",
  descricao: "",
  sku: "",
  custo_aquisicao: 0,
  embalagem: 0,
  frete: 0,
  outros_custos: 0,
  estoque: 0,
  horas: 0,
  valor_hora: 0,
  materiais: 0,
  deslocamento: 0,
  terceirizados: 0,
  preco_atual: 0,
  ativo: true,
  observacoes: "",
};

export function custoBase(item: Item): number {
  return item.tipo === "produto"
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
      });
}

function ItensPage() {
  const { data: company } = useCompany();
  const { data: items, isLoading } = useItems(company?.id);
  const save = useSaveRow("products_services");
  const remove = useDeleteRow("products_services");

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "produto" | "servico">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [ordem, setOrdem] = useState("nome");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [excluir, setExcluir] = useState<Item | null>(null);

  const categorias = useMemo(
    () => Array.from(new Set((items ?? []).map((i) => i.categoria).filter(Boolean) as string[])),
    [items],
  );

  const lista = useMemo(() => {
    let out = [...(items ?? [])];
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      out = out.filter(
        (i) => i.nome.toLowerCase().includes(termo) || (i.sku ?? "").toLowerCase().includes(termo),
      );
    }
    if (filtroTipo !== "todos") out = out.filter((i) => i.tipo === filtroTipo);
    if (filtroCategoria !== "todas") out = out.filter((i) => i.categoria === filtroCategoria);
    out.sort((a, b) => {
      if (ordem === "preco") return Number(b.preco_atual) - Number(a.preco_atual);
      if (ordem === "custo") return custoBase(b) - custoBase(a);
      if (ordem === "recente")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    return out;
  }, [items, busca, filtroTipo, filtroCategoria, ordem]);

  function abrirNovo(tipo: "produto" | "servico" = "produto") {
    setEditandoId(null);
    setForm({ ...FORM_VAZIO, tipo });
    setAberto(true);
  }

  function abrirEdicao(item: Item) {
    setEditandoId(item.id);
    setForm({
      tipo: tipoDoItem(item.tipo),
      nome: item.nome,
      categoria: item.categoria ?? "",
      descricao: item.descricao ?? "",
      sku: item.sku ?? "",
      custo_aquisicao: Number(item.custo_aquisicao),
      embalagem: Number(item.embalagem),
      frete: Number(item.frete),
      outros_custos: Number(item.outros_custos),
      estoque: Number(item.estoque ?? 0),
      horas: Number(item.horas),
      valor_hora: Number(item.valor_hora),
      materiais: Number(item.materiais),
      deslocamento: Number(item.deslocamento),
      terceirizados: Number(item.terceirizados),
      preco_atual: Number(item.preco_atual),
      ativo: item.ativo,
      observacoes: item.observacoes ?? "",
    });
    setAberto(true);
  }

  async function salvar() {
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome do item.");
      return;
    }
    try {
      await save.mutateAsync({
        id: editandoId,
        values: {
          company_id: company!.id,
          tipo: form.tipo,
          nome: form.nome.trim(),
          categoria: form.categoria.trim() || null,
          descricao: form.descricao.trim() || null,
          sku: form.sku.trim() || null,
          custo_aquisicao: form.custo_aquisicao,
          embalagem: form.embalagem,
          frete: form.frete,
          outros_custos: form.outros_custos,
          estoque: estoqueDoItem(form.tipo, form.estoque),
          horas: form.horas,
          valor_hora: form.valor_hora,
          materiais: form.materiais,
          deslocamento: form.deslocamento,
          terceirizados: form.terceirizados,
          preco_atual: form.preco_atual,
          ativo: form.ativo,
          observacoes: form.observacoes.trim() || null,
        },
      });
      toast.success(editandoId ? "Item atualizado." : "Item cadastrado.");
      setAberto(false);
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível salvar."));
    }
  }

  async function duplicar(item: Item) {
    const { id, created_at, updated_at, ...rest } = item;
    void id;
    void created_at;
    void updated_at;
    await save.mutateAsync({
      values: {
        ...rest,
        estoque: estoqueDoItem(tipoDoItem(item.tipo), item.estoque),
        nome: `${item.nome} (cópia)`,
      },
    });
    toast.success("Item duplicado.");
  }

  async function alternarAtivo(item: Item) {
    await save.mutateAsync({ id: item.id, values: { ativo: !item.ativo } });
  }

  return (
    <AppLayout
      title="Produtos e serviços"
      description="Cadastro unificado com custo-base calculado automaticamente."
      actions={
        <Button className="gap-2 font-semibold" onClick={() => abrirNovo()}>
          <Plus className="size-4" aria-hidden />
          <span className="hidden sm:inline">Novo item</span>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="card-soft flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por nome ou código"
              className="pl-9"
              aria-label="Pesquisar itens"
            />
          </div>
          <Tabs value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="produto">Produtos</TabsTrigger>
              <TabsTrigger value="servico">Serviços</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="md:w-44" aria-label="Filtrar por categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ordem} onValueChange={setOrdem}>
            <SelectTrigger className="md:w-40" aria-label="Ordenar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome (A-Z)</SelectItem>
              <SelectItem value="preco">Maior preço</SelectItem>
              <SelectItem value="custo">Maior custo</SelectItem>
              <SelectItem value="recente">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : lista.length === 0 ? (
          <EmptyState
            icon={Package}
            title={
              (items ?? []).length === 0
                ? "Nenhum produto ou serviço cadastrado"
                : "Nenhum item encontrado"
            }
            description={
              (items ?? []).length === 0
                ? "Cadastre o que você vende para calcular o preço com custo, embalagem, frete, horas e materiais."
                : "Ajuste a pesquisa ou os filtros para ver outros itens."
            }
            action={
              (items ?? []).length === 0 ? (
                <div className="flex gap-2">
                  <Button className="font-semibold" onClick={() => abrirNovo("produto")}>
                    Cadastrar produto
                  </Button>
                  <Button
                    variant="outline"
                    className="font-semibold"
                    onClick={() => abrirNovo("servico")}
                  >
                    Cadastrar serviço
                  </Button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {lista.map((item) => {
              const custo = custoBase(item);
              const preco = Number(item.preco_atual);
              return (
                <article key={item.id} className="card-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
                          {item.tipo === "produto" ? (
                            <Package className="size-4" aria-hidden />
                          ) : (
                            <Wrench className="size-4" aria-hidden />
                          )}
                        </span>
                        <h2 className="truncate font-display font-bold">{item.nome}</h2>
                        {!item.ativo && <Badge variant="outline">Inativo</Badge>}
                        {item.is_demo && (
                          <Badge className="bg-warning text-warning-foreground">Demo</Badge>
                        )}
                      </div>
                      {item.categoria && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.categoria}</p>
                      )}
                      {item.descricao && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {item.descricao}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={item.ativo}
                      onCheckedChange={() => void alternarAtivo(item)}
                      aria-label={item.ativo ? "Desativar item" : "Ativar item"}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-center">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Custo-base</p>
                      <p className="text-sm font-bold tabular-nums">{formatBRL(custo)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Preço atual</p>
                      <p className="text-sm font-bold tabular-nums">{formatBRL(preco)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Markup</p>
                      <p className="text-sm font-bold tabular-nums">
                        {custo > 0 ? `${(preco / custo).toFixed(2).replace(".", ",")}x` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" className="gap-1.5 font-semibold">
                      <Link to="/precificacao" search={{ item: item.id }}>
                        <Calculator className="size-4" aria-hidden /> Precificar
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => abrirEdicao(item)}>
                      <Pencil className="size-4" aria-hidden /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void duplicar(item)}>
                      <Copy className="size-4" aria-hidden /> Duplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setExcluir(item)}
                    >
                      <Trash2 className="size-4" aria-hidden /> Excluir
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar item" : "Novo item"}</DialogTitle>
            <DialogDescription>
              Informe os custos reais. O custo-base é calculado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={form.tipo}
            onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as "produto" | "servico" }))}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="produto">Produto</TabsTrigger>
              <TabsTrigger value="servico">Serviço</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="item-nome">Nome</Label>
              <Input
                id="item-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder={form.tipo === "produto" ? "Bolo de pote" : "Consultoria de marketing"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-categoria">Categoria</Label>
              <Input
                id="item-categoria"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                placeholder="Confeitaria"
              />
            </div>
            {form.tipo === "produto" && (
              <div className="space-y-1.5">
                <Label htmlFor="item-sku">SKU / código interno</Label>
                <Input
                  id="item-sku"
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="item-descricao">Descrição</Label>
              <Textarea
                id="item-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={2}
              />
            </div>

            {form.tipo === "produto" ? (
              <>
                <NumberField
                  id="custo"
                  label="Custo de aquisição/produção"
                  prefix="R$"
                  value={form.custo_aquisicao}
                  onChange={(v) => setForm((f) => ({ ...f, custo_aquisicao: v }))}
                />
                <NumberField
                  id="embalagem"
                  label="Embalagem por unidade"
                  prefix="R$"
                  value={form.embalagem}
                  onChange={(v) => setForm((f) => ({ ...f, embalagem: v }))}
                />
                <NumberField
                  id="frete"
                  label="Frete por unidade"
                  prefix="R$"
                  value={form.frete}
                  onChange={(v) => setForm((f) => ({ ...f, frete: v }))}
                />
                <NumberField
                  id="outros"
                  label="Outros custos variáveis"
                  prefix="R$"
                  value={form.outros_custos}
                  onChange={(v) => setForm((f) => ({ ...f, outros_custos: v }))}
                />
                <NumberField
                  id="estoque"
                  label="Estoque (opcional)"
                  value={form.estoque}
                  onChange={(v) => setForm((f) => ({ ...f, estoque: v }))}
                />
              </>
            ) : (
              <>
                <NumberField
                  id="horas"
                  label="Quantidade de horas"
                  value={form.horas}
                  onChange={(v) => setForm((f) => ({ ...f, horas: v }))}
                />
                <NumberField
                  id="valorhora"
                  label="Valor da hora de trabalho"
                  prefix="R$"
                  value={form.valor_hora}
                  onChange={(v) => setForm((f) => ({ ...f, valor_hora: v }))}
                />
                <NumberField
                  id="materiais"
                  label="Materiais e insumos"
                  prefix="R$"
                  value={form.materiais}
                  onChange={(v) => setForm((f) => ({ ...f, materiais: v }))}
                />
                <NumberField
                  id="deslocamento"
                  label="Deslocamento"
                  prefix="R$"
                  value={form.deslocamento}
                  onChange={(v) => setForm((f) => ({ ...f, deslocamento: v }))}
                />
                <NumberField
                  id="terceirizados"
                  label="Custos terceirizados"
                  prefix="R$"
                  value={form.terceirizados}
                  onChange={(v) => setForm((f) => ({ ...f, terceirizados: v }))}
                />
                <NumberField
                  id="outros-serv"
                  label="Outros custos"
                  prefix="R$"
                  value={form.outros_custos}
                  onChange={(v) => setForm((f) => ({ ...f, outros_custos: v }))}
                />
              </>
            )}

            <NumberField
              id="preco-atual"
              label="Preço atual de venda"
              prefix="R$"
              value={form.preco_atual}
              onChange={(v) => setForm((f) => ({ ...f, preco_atual: v }))}
            />

            <div className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Item ativo</p>
                <p className="text-xs text-muted-foreground">
                  Itens inativos não aparecem na precificação.
                </p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                aria-label="Item ativo"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="item-obs">Observações</Label>
              <Textarea
                id="item-obs"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              className="font-semibold"
              onClick={() => void salvar()}
              disabled={save.isPending}
            >
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
              Esta ação não pode ser desfeita. O histórico de precificações deste item é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!excluir) return;
                await remove.mutateAsync(excluir.id);
                toast.success("Item excluído.");
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
