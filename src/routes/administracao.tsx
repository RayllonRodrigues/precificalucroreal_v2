import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  CreditCard,
  Gauge,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AdminCard, AdminLayout, AdminMetric, type AdminSecao } from "@/components/admin-layout";
import { EmptyState, ListSkeleton } from "@/components/bits";
import { LocalFields } from "@/components/local-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useAuth } from "@/hooks/useAuth";
import { mensagemErro } from "@/lib/auth-messages";
import { ARREDONDAMENTOS } from "@/lib/constants";
import { formatBRL, formatPercent, parseDecimal } from "@/lib/format";
import {
  adicionarAdmin,
  atualizarConta,
  atualizarEmpresa,
  excluirConta,
  excluirEmpresa,
  estenderTeste,
  liberarLicenca,
  listarAdmins,
  listarContas,
  listarEmpresas,
  obterConfigGlobais,
  obterConfigPagamento,
  removerAdmin,
  removerLicenca,
  resumoPlataforma,
  salvarConfigGlobais,
  salvarConfigPagamento,
  type AdminPlataforma,
  type ContaAdmin,
  type EmpresaAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/administracao")({
  head: () => ({
    meta: [
      { title: "Central de administração — Precifica" },
      {
        name: "description",
        content:
          "Área restrita com indicadores da plataforma, contas, empresas e configurações globais do Precifica.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Central de administração — Precifica" },
      {
        property: "og:description",
        content: "Indicadores, contas, empresas e configurações globais do Precifica.",
      },
    ],
  }),
  component: AdministracaoPage,
});

const SECOES: readonly AdminSecao[] = [
  { value: "visao", label: "Visão geral", icon: Gauge },
  { value: "contas", label: "Contas", icon: Users },
  { value: "empresas", label: "Empresas", icon: Building2 },
  { value: "admins", label: "Administradores", icon: ShieldCheck },
  { value: "pagamentos", label: "Pagamentos e licenças", icon: CreditCard },
  { value: "config", label: "Configurações globais", icon: Settings },
];

const TITULOS: Record<string, { titulo: string; descricao: string }> = {
  visao: { titulo: "Visão geral", descricao: "Indicadores de toda a plataforma" },
  contas: { titulo: "Contas", descricao: "Todas as pessoas cadastradas no Precifica" },
  empresas: { titulo: "Empresas", descricao: "Todas as empresas e seus responsáveis" },
  admins: { titulo: "Administradores", descricao: "Quem tem acesso a esta central" },
  pagamentos: {
    titulo: "Pagamentos e licenças",
    descricao: "Credenciais do Mercado Pago, preço e período de teste",
  },
  config: { titulo: "Configurações globais", descricao: "Padrões aplicados a toda a plataforma" },
};

function dataBR(valor: string | null) {
  if (!valor) return "—";
  return new Date(valor).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function AdministracaoPage() {
  const { isAdmin, loading } = usePlatformAdmin();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="mx-auto max-w-4xl">
          <ListSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    void navigate({ to: "/admin" });
    return null;
  }

  return <AdminConteudo />;
}

function AdminConteudo() {
  const { user } = useAuth();
  const [secao, setSecao] = useState("visao");
  const cabecalho = TITULOS[secao] ?? TITULOS["visao"]!;

  return (
    <AdminLayout
      titulo={cabecalho.titulo}
      descricao={cabecalho.descricao}
      secoes={SECOES}
      secao={secao}
      onSecao={setSecao}
    >
      {secao === "visao" && <VisaoGeral />}
      {secao === "contas" && <ContasSecao meuId={user?.id ?? ""} />}
      {secao === "empresas" && <EmpresasSecao />}
      {secao === "admins" && <AdministradoresSecao meuId={user?.id ?? ""} />}
      {secao === "pagamentos" && <PagamentosSecao />}
      {secao === "config" && <ConfiguracoesGlobais />}
    </AdminLayout>
  );
}

function VisaoGeral() {
  const fnResumo = useServerFn(resumoPlataforma);
  const resumo = useQuery({ queryKey: ["admin", "resumo"], queryFn: () => fnResumo() });

  if (resumo.isLoading) return <ListSkeleton rows={4} />;
  if (resumo.isError) {
    return (
      <AdminCard>
        <p className="text-sm text-slate-300">{mensagemErro(resumo.error)}</p>
      </AdminCard>
    );
  }

  const d = resumo.data!;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric
          label="Contas"
          value={String(d.contas)}
          hint={`${d.contasNovas30} nos últimos 30 dias`}
        />
        <AdminMetric
          label="Empresas"
          value={String(d.empresas)}
          hint={`${d.empresasDemo} em modo demonstração`}
        />
        <AdminMetric label="Precificações" value={String(d.calculos)} />
        <AdminMetric
          label="Margem líquida média"
          value={formatPercent(d.margemMedia)}
          hint="Média de todas as precificações"
        />
        <AdminMetric label="Produtos e serviços" value={String(d.itens)} />
        <AdminMetric label="Despesas cadastradas" value={String(d.despesas)} />
        <AdminMetric label="Funcionários cadastrados" value={String(d.funcionarios)} />
        <AdminMetric
          label="Faturamento informado"
          value={formatBRL(d.faturamentoTotal)}
          hint="Soma mensal declarada pelas empresas"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <p className="mb-3 text-sm font-semibold">Cadastros nos últimos 6 meses</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="contas" name="Contas" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                <Bar dataKey="empresas" name="Empresas" fill="#06B6D4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="mb-3 text-sm font-semibold">Empresas que mais precificam</p>
          {d.topEmpresas.length === 0 ? (
            <p className="text-sm text-slate-400">Ainda não há precificações registradas.</p>
          ) : (
            <ul className="space-y-2">
              {d.topEmpresas.map((e) => (
                <li
                  key={e.nome}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="truncate">{e.nome}</span>
                  <span className="text-slate-400">{e.calculos}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  );
}

function ContasSecao({ meuId }: { meuId: string }) {
  const qc = useQueryClient();
  const fnContas = useServerFn(listarContas);
  const fnSalvar = useServerFn(atualizarConta);
  const fnExcluir = useServerFn(excluirConta);

  const contas = useQuery({ queryKey: ["admin", "contas"], queryFn: () => fnContas() });
  const [busca, setBusca] = useState("");
  const [editar, setEditar] = useState<ContaAdmin | null>(null);
  const [apagar, setApagar] = useState<ContaAdmin | null>(null);

  const salvar = useMutation({
    mutationFn: (v: {
      id: string;
      nome: string;
      telefone: string;
      cpf: string;
      cnpj: string;
      cidade: string;
      uf: string;
    }) => fnSalvar({ data: v }),
    onSuccess: async () => {
      toast.success("Conta atualizada.");
      setEditar(null);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const remover = useMutation({
    mutationFn: (id: string) => fnExcluir({ data: { id } }),
    onSuccess: async () => {
      toast.success("Acesso excluído.");
      setApagar(null);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const todas = contas.data ?? [];
    if (!termo) return todas;
    return todas.filter(
      (c) => c.nome.toLowerCase().includes(termo) || c.email.toLowerCase().includes(termo),
    );
  }, [contas.data, busca]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          className="border-white/10 bg-white/5 pl-9 text-slate-100 placeholder:text-slate-500"
          placeholder="Buscar por nome ou email"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar contas"
        />
      </div>

      {contas.isLoading ? (
        <ListSkeleton rows={4} />
      ) : contas.isError ? (
        <AdminCard>
          <p className="text-sm text-slate-300">{mensagemErro(contas.error)}</p>
        </AdminCard>
      ) : lista.length === 0 ? (
        <EmptyState icon={Users} title="Nenhuma conta encontrada" description="Ajuste a busca." />
      ) : (
        <div className="space-y-3">
          {lista.map((c) => (
            <AdminCard key={c.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.nome || "Sem nome"}</p>
                <p className="truncate text-sm text-slate-400">{c.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Telefone: {c.telefone || "não informado"}
                </p>
                <p className="text-xs text-slate-500">
                  CPF: {c.cpf || "não informado"} · CNPJ: {c.cnpj || "não informado"}
                </p>
                <p className="text-xs text-slate-500">
                  Localidade: {[c.cidade, c.uf].filter(Boolean).join(" / ") || "não informada"}
                </p>
                <p className="text-xs text-slate-500">
                  Criada em {dataBR(c.criadoEm)} · último acesso {dataBR(c.ultimoAcesso)} ·{" "}
                  {c.empresas} {c.empresas === 1 ? "empresa" : "empresas"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10"
                  onClick={() => setEditar(c)}
                >
                  <Pencil className="size-4" aria-hidden /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-transparent text-red-400 hover:bg-white/10"
                  disabled={c.id === meuId}
                  onClick={() => setApagar(c)}
                >
                  <Trash2 className="size-4" aria-hidden /> Excluir
                </Button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {editar && (
        <EditarContaDialog
          conta={editar}
          salvando={salvar.isPending}
          onClose={() => setEditar(null)}
          onSave={(v) => salvar.mutate({ id: editar.id, ...v })}
        />
      )}

      <AlertDialog open={!!apagar} onOpenChange={(o) => !o && setApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o acesso desta conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {apagar?.email} não vai mais conseguir entrar no Precifica. As empresas e os dados
              cadastrados continuam existindo. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault();
                if (apagar) remover.mutate(apagar.id);
              }}
            >
              {remover.isPending ? "Excluindo..." : "Excluir acesso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmpresasSecao() {
  const qc = useQueryClient();
  const fnEmpresas = useServerFn(listarEmpresas);
  const fnSalvar = useServerFn(atualizarEmpresa);
  const fnExcluir = useServerFn(excluirEmpresa);
  const fnLiberar = useServerFn(liberarLicenca);
  const fnRemoverLicenca = useServerFn(removerLicenca);
  const fnEstender = useServerFn(estenderTeste);

  const empresas = useQuery({ queryKey: ["admin", "empresas"], queryFn: () => fnEmpresas() });
  const [busca, setBusca] = useState("");
  const [editar, setEditar] = useState<EmpresaAdmin | null>(null);
  const [apagar, setApagar] = useState<EmpresaAdmin | null>(null);

  const salvar = useMutation({
    mutationFn: (v: { id: string; nome: string; ramo: string }) => fnSalvar({ data: v }),
    onSuccess: async () => {
      toast.success("Empresa atualizada.");
      setEditar(null);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const licenciar = useMutation({
    mutationFn: (v: { id: string; meses: number }) => fnLiberar({ data: v }),
    onSuccess: async () => {
      toast.success("Licença liberada para a empresa.");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const tirarLicenca = useMutation({
    mutationFn: (id: string) => fnRemoverLicenca({ data: { id } }),
    onSuccess: async () => {
      toast.success("Licença removida.");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const estender = useMutation({
    mutationFn: (v: { id: string; dias: number }) => fnEstender({ data: v }),
    onSuccess: async () => {
      toast.success("Período de teste estendido.");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const remover = useMutation({
    mutationFn: (id: string) => fnExcluir({ data: { id } }),
    onSuccess: async () => {
      toast.success("Empresa e dados excluídos.");
      setApagar(null);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const todas = empresas.data ?? [];
    if (!termo) return todas;
    return todas.filter(
      (e) =>
        e.nome.toLowerCase().includes(termo) ||
        e.donoEmail.toLowerCase().includes(termo) ||
        e.donoNome.toLowerCase().includes(termo),
    );
  }, [empresas.data, busca]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          className="border-white/10 bg-white/5 pl-9 text-slate-100 placeholder:text-slate-500"
          placeholder="Buscar por empresa ou dono"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar empresas"
        />
      </div>

      {empresas.isLoading ? (
        <ListSkeleton rows={4} />
      ) : empresas.isError ? (
        <AdminCard>
          <p className="text-sm text-slate-300">{mensagemErro(empresas.error)}</p>
        </AdminCard>
      ) : lista.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma empresa encontrada"
          description="Ajuste a busca."
        />
      ) : (
        <div className="space-y-3">
          {lista.map((e) => (
            <AdminCard key={e.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{e.nome}</p>
                  {e.isDemo && <Badge className="bg-amber-500 text-slate-950">Demonstração</Badge>}
                </div>
                <p className="truncate text-sm text-slate-400">{e.ramo || "Sem ramo informado"}</p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  Dono: {e.donoNome || "—"} {e.donoEmail && `(${e.donoEmail})`}
                </p>
                <p className="text-xs text-slate-500">Criada em {dataBR(e.criadoEm)}</p>
                <p className="text-xs text-slate-400">
                  {e.licencaExpiraEm && new Date(e.licencaExpiraEm) > new Date()
                    ? `Licença ativa até ${dataBR(e.licencaExpiraEm)}`
                    : e.trialExpiraEm && new Date(e.trialExpiraEm) > new Date()
                      ? `Em teste até ${dataBR(e.trialExpiraEm)}`
                      : "Acesso bloqueado (teste encerrado)"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-transparent text-emerald-400 hover:bg-white/10"
                  disabled={licenciar.isPending}
                  onClick={() => licenciar.mutate({ id: e.id, meses: 12 })}
                >
                  <ShieldCheck className="size-4" aria-hidden /> Liberar 12 meses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10"
                  disabled={estender.isPending}
                  onClick={() => estender.mutate({ id: e.id, dias: 30 })}
                >
                  +30 dias de teste
                </Button>
                {e.licencaExpiraEm && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/15 bg-transparent text-amber-400 hover:bg-white/10"
                    disabled={tirarLicenca.isPending}
                    onClick={() => tirarLicenca.mutate(e.id)}
                  >
                    Remover licença
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10"
                  onClick={() => setEditar(e)}
                >
                  <Pencil className="size-4" aria-hidden /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-transparent text-red-400 hover:bg-white/10"
                  onClick={() => setApagar(e)}
                >
                  <Trash2 className="size-4" aria-hidden /> Excluir
                </Button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {editar && (
        <EditarEmpresaDialog
          empresa={editar}
          salvando={salvar.isPending}
          onClose={() => setEditar(null)}
          onSave={(v) => salvar.mutate({ id: editar.id, ...v })}
        />
      )}

      <AlertDialog open={!!apagar} onOpenChange={(o) => !o && setApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a empresa {apagar?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens, despesas, funcionários, formas de pagamento e cálculos dessa empresa
              serão apagados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault();
                if (apagar) remover.mutate(apagar.id);
              }}
            >
              {remover.isPending ? "Excluindo..." : "Excluir empresa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConfiguracoesGlobais() {
  const qc = useQueryClient();
  const fnObter = useServerFn(obterConfigGlobais);
  const fnSalvar = useServerFn(salvarConfigGlobais);

  const config = useQuery({ queryKey: ["admin", "config"], queryFn: () => fnObter() });
  const [form, setForm] = useState<null | {
    margemPadrao: string;
    impostoPadrao: string;
    comissaoPadrao: string;
    arredondamento: string;
    permitirCadastros: boolean;
    permitirDemo: boolean;
    mensagemAviso: string;
  }>(null);

  const atual =
    form ??
    (config.data
      ? {
          margemPadrao: String(config.data.margemPadrao),
          impostoPadrao: String(config.data.impostoPadrao),
          comissaoPadrao: String(config.data.comissaoPadrao),
          arredondamento: config.data.arredondamento,
          permitirCadastros: config.data.permitirCadastros,
          permitirDemo: config.data.permitirDemo,
          mensagemAviso: config.data.mensagemAviso,
        }
      : null);

  const salvar = useMutation({
    mutationFn: () =>
      fnSalvar({
        data: {
          margemPadrao: Number(atual?.margemPadrao ?? 0) || 0,
          impostoPadrao: Number(atual?.impostoPadrao ?? 0) || 0,
          comissaoPadrao: Number(atual?.comissaoPadrao ?? 0) || 0,
          arredondamento: atual?.arredondamento ?? "nenhum",
          permitirCadastros: atual?.permitirCadastros ?? false,
          permitirDemo: atual?.permitirDemo ?? true,
          mensagemAviso: atual?.mensagemAviso ?? "",
        },
      }),
    onSuccess: async () => {
      toast.success("Configurações globais salvas.");
      await qc.invalidateQueries({ queryKey: ["admin", "config"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  if (config.isLoading || !atual) return <ListSkeleton rows={3} />;

  const set = (v: Partial<NonNullable<typeof form>>) => setForm({ ...atual, ...v });

  return (
    <form
      className="max-w-2xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        salvar.mutate();
      }}
    >
      <AdminCard className="space-y-4">
        <p className="text-sm font-semibold">Padrões de precificação para novas empresas</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="g-margem">Margem desejada (%)</Label>
            <Input
              id="g-margem"
              inputMode="decimal"
              className="border-white/10 bg-white/5 text-slate-100"
              value={atual.margemPadrao}
              onChange={(e) => set({ margemPadrao: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-imposto">Imposto (%)</Label>
            <Input
              id="g-imposto"
              inputMode="decimal"
              className="border-white/10 bg-white/5 text-slate-100"
              value={atual.impostoPadrao}
              onChange={(e) => set({ impostoPadrao: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-comissao">Comissão (%)</Label>
            <Input
              id="g-comissao"
              inputMode="decimal"
              className="border-white/10 bg-white/5 text-slate-100"
              value={atual.comissaoPadrao}
              onChange={(e) => set({ comissaoPadrao: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Arredondamento sugerido</Label>
          <Select value={atual.arredondamento} onValueChange={(v) => set({ arredondamento: v })}>
            <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
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
      </AdminCard>

      <AdminCard className="space-y-4">
        <p className="text-sm font-semibold">Acesso à plataforma</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm">Permitir novos cadastros</p>
            <p className="text-xs text-slate-500">Desligue para fechar a criação de contas.</p>
          </div>
          <Switch
            checked={atual.permitirCadastros}
            onCheckedChange={(v) => set({ permitirCadastros: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm">Permitir modo demonstração</p>
            <p className="text-xs text-slate-500">Dados de exemplo para novos usuários.</p>
          </div>
          <Switch checked={atual.permitirDemo} onCheckedChange={(v) => set({ permitirDemo: v })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-aviso">Aviso exibido no aplicativo</Label>
          <Textarea
            id="g-aviso"
            rows={3}
            className="border-white/10 bg-white/5 text-slate-100"
            placeholder="Ex.: manutenção programada no domingo."
            value={atual.mensagemAviso}
            onChange={(e) => set({ mensagemAviso: e.target.value })}
          />
        </div>
      </AdminCard>

      <Button type="submit" disabled={salvar.isPending}>
        {salvar.isPending ? "Salvando..." : "Salvar configurações"}
      </Button>
    </form>
  );
}

function EditarContaDialog({
  conta,
  salvando,
  onClose,
  onSave,
}: {
  conta: ContaAdmin;
  salvando: boolean;
  onClose: () => void;
  onSave: (v: {
    nome: string;
    telefone: string;
    cpf: string;
    cnpj: string;
    cidade: string;
    uf: string;
  }) => void;
}) {
  const [nome, setNome] = useState(conta.nome);
  const [telefone, setTelefone] = useState(conta.telefone);
  const [cpf, setCpf] = useState(conta.cpf);
  const [cnpj, setCnpj] = useState(conta.cnpj);
  const [cidade, setCidade] = useState(conta.cidade);
  const [uf, setUf] = useState(conta.uf);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar conta</DialogTitle>
          <DialogDescription>{conta.email}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ nome, telefone, cpf, cnpj, cidade, uf });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-nome">Nome</Label>
            <Input id="admin-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-telefone">Telefone / WhatsApp</Label>
            <Input
              id="admin-telefone"
              inputMode="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-cpf">CPF</Label>
              <Input
                id="admin-cpf"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-cnpj">CNPJ</Label>
              <Input
                id="admin-cnpj"
                inputMode="numeric"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
              />
            </div>
          </div>
          <LocalFields uf={uf} cidade={cidade} onUfChange={setUf} onCidadeChange={setCidade} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditarEmpresaDialog({
  empresa,
  salvando,
  onClose,
  onSave,
}: {
  empresa: EmpresaAdmin;
  salvando: boolean;
  onClose: () => void;
  onSave: (v: { nome: string; ramo: string }) => void;
}) {
  const [nome, setNome] = useState(empresa.nome);
  const [ramo, setRamo] = useState(empresa.ramo);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar empresa</DialogTitle>
          <DialogDescription>Dono: {empresa.donoEmail || "—"}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ nome, ramo });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-empresa-nome">Nome da empresa</Label>
            <Input
              id="admin-empresa-nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-empresa-ramo">Ramo</Label>
            <Input id="admin-empresa-ramo" value={ramo} onChange={(e) => setRamo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdministradoresSecao({ meuId }: { meuId: string }) {
  const qc = useQueryClient();
  const fnListar = useServerFn(listarAdmins);
  const fnAdicionar = useServerFn(adicionarAdmin);
  const fnRemover = useServerFn(removerAdmin);
  const [email, setEmail] = useState("");

  const admins = useQuery({ queryKey: ["admin", "admins"], queryFn: () => fnListar() });

  const adicionar = useMutation({
    mutationFn: (valor: string) => fnAdicionar({ data: { email: valor } }),
    onSuccess: async () => {
      toast.success("Administrador adicionado.");
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["admin", "admins"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const remover = useMutation({
    mutationFn: (userId: string) => fnRemover({ data: { userId } }),
    onSuccess: async () => {
      toast.success("Administrador removido.");
      await qc.invalidateQueries({ queryKey: ["admin", "admins"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  return (
    <div className="space-y-4">
      <AdminCard>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) adicionar.mutate(email.trim());
          }}
        >
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label htmlFor="novo-admin">Email da pessoa</Label>
            <Input
              id="novo-admin"
              type="email"
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
              placeholder="pessoa@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={adicionar.isPending}>
            {adicionar.isPending ? "Adicionando..." : "Tornar administrador"}
          </Button>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          A pessoa precisa já ter uma conta criada no Precifica.
        </p>
      </AdminCard>

      {admins.isLoading ? (
        <ListSkeleton rows={3} />
      ) : admins.isError ? (
        <AdminCard>
          <p className="text-sm text-slate-300">{mensagemErro(admins.error)}</p>
        </AdminCard>
      ) : (
        <div className="space-y-3">
          {(admins.data ?? []).map((a: AdminPlataforma) => (
            <AdminCard key={a.userId} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{a.nome || "Sem nome"}</p>
                <p className="truncate text-sm text-slate-400">{a.email || a.userId}</p>
                <p className="text-xs text-slate-500">Administrador desde {dataBR(a.desde)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-white/15 bg-transparent text-red-400 hover:bg-white/10"
                disabled={a.userId === meuId || remover.isPending}
                onClick={() => remover.mutate(a.userId)}
              >
                <Trash2 className="size-4" aria-hidden /> Remover
              </Button>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}

function PagamentosSecao() {
  const qc = useQueryClient();
  const fnObter = useServerFn(obterConfigPagamento);
  const fnSalvar = useServerFn(salvarConfigPagamento);

  const config = useQuery({ queryKey: ["admin", "pagamento"], queryFn: () => fnObter() });
  const [form, setForm] = useState<null | {
    ativo: boolean;
    token: string;
    preco: string;
    meses: string;
    dias: string;
  }>(null);

  const atual =
    form ??
    (config.data
      ? {
          ativo: config.data.mercadopagoAtivo,
          token: "",
          preco: String(config.data.precoLicenca).replace(".", ","),
          meses: String(config.data.mesesLicenca),
          dias: String(config.data.diasTeste),
        }
      : null);

  const salvar = useMutation({
    mutationFn: () =>
      fnSalvar({
        data: {
          mercadopagoAtivo: atual!.ativo,
          token: atual!.token.trim() || undefined,
          precoLicenca: parseDecimal(atual!.preco),
          mesesLicenca: Number(atual!.meses) || 12,
          diasTeste: Number(atual!.dias),
        },
      }),
    onSuccess: async () => {
      toast.success("Configurações de pagamento salvas.");
      setForm((f) => (f ? { ...f, token: "" } : f));
      await qc.invalidateQueries({ queryKey: ["admin", "pagamento"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  if (config.isLoading || !atual) return <ListSkeleton rows={3} />;

  const set = (v: Partial<NonNullable<typeof form>>) => setForm({ ...atual, ...v });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AdminCard className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Mercado Pago</p>
          <p className="text-xs text-slate-400">
            Configure o Access Token correspondente ao ambiente de pagamento definido para a aplicação.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
          <Label htmlFor="mp-ativo" className="text-sm">
            Cobrança online ativa
          </Label>
          <Switch id="mp-ativo" checked={atual.ativo} onCheckedChange={(v) => set({ ativo: v })} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mp-token">Access Token</Label>
          <p className="text-xs text-slate-500">
            {config.data?.tokenConfigurado ? "Configurado" : "Não configurado"}
          </p>
          <Input
            id="mp-token"
            type="password"
            autoComplete="off"
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
            placeholder={
              config.data?.tokenConfigurado
                ? "Credencial salva — digite para substituir"
                : "Cole o Access Token"
            }
            value={atual.token}
            onChange={(e) => set({ token: e.target.value })}
          />
          <p className="text-xs text-slate-500">
            {config.data?.tokenConfigurado
              ? "Uma credencial já está salva e não é exibida por segurança."
              : "Enquanto não houver credencial, o botão de contratar fica indisponível."}
          </p>
        </div>
      </AdminCard>

      <AdminCard className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Plano e período de teste</p>
          <p className="text-xs text-slate-400">Valores aplicados a novas contratações.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preco">Valor da licença (R$)</Label>
          <Input
            id="preco"
            inputMode="decimal"
            className="border-white/10 bg-white/5 text-slate-100"
            value={atual.preco}
            onChange={(e) => set({ preco: e.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="meses">Duração (meses)</Label>
            <Input
              id="meses"
              inputMode="numeric"
              className="border-white/10 bg-white/5 text-slate-100"
              value={atual.meses}
              onChange={(e) => set({ meses: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dias">Dias de teste grátis</Label>
            <p className="text-xs text-slate-400">
              Configuração pendente de homologação. Alterar este valor não recalcula os testes
              existentes.
            </p>
            <Input
              id="dias"
              inputMode="numeric"
              className="border-white/10 bg-white/5 text-slate-100"
              value={atual.dias}
              onChange={(e) => set({ dias: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </AdminCard>
    </div>
  );
}
