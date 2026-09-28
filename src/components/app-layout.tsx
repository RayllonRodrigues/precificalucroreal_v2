import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Calculator,
  CreditCard,
  GitCompareArrows,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/lib/app-data";
import { APP_NAME, APP_SLOGAN } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/company-logo";
import { statusLicenca } from "@/lib/licenca";

export const NAV_ITEMS = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/precificacao", label: "Precificação", icon: Calculator },
  { to: "/itens", label: "Produtos e serviços", icon: Package },
  { to: "/despesas", label: "Despesas", icon: Receipt },
  { to: "/equipe", label: "Funcionários", icon: Users },
  { to: "/pagamentos", label: "Formas de pagamento", icon: CreditCard },
  { to: "/simulador", label: "Simulador", icon: GitCompareArrows },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const MOBILE_ITEMS = NAV_ITEMS.filter((i) =>
  ["/painel", "/precificacao", "/itens", "/historico"].includes(i.to),
);

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-soft">
        <Calculator className="size-5" aria-hidden />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-lg font-extrabold tracking-tight">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground">{APP_SLOGAN}</p>
        </div>
      )}
    </div>
  );
}

function NavList({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV_ITEMS;
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navegação principal">
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            title={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "text-foreground bg-accent/70 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium",
              compact && "justify-center px-2",
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            {!compact && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout({
  children,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: company, isLoading: loadingCompany } = useCompany();
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading || (user && loadingCompany)) {
    return (
      <div className="bg-background min-h-screen p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    void navigate({ to: "/entrar" });
    return null;
  }

  if (!company) {
    void navigate({ to: "/primeiros-passos" });
    return null;
  }

  const licenca = statusLicenca(company);

  if (licenca.bloqueado) {
    void navigate({ to: "/licenca" });
    return null;
  }

  const avisoTeste = licenca.tipo === "teste" && licenca.diasRestantes <= 7;

  return (
    <div className="bg-background min-h-screen">
      <div className="flex">
        <aside
          className={cn(
            "border-border/60 bg-sidebar sticky top-0 hidden h-screen shrink-0 flex-col border-r px-4 py-5 md:flex",
            collapsed ? "w-[84px]" : "w-64",
          )}
        >
          <div className="border-border/60 mb-6 flex items-center justify-between border-b pb-5">
            <BrandMark compact={collapsed} />
          </div>
          {!collapsed && (
            <p className="text-muted-foreground/80 mb-3 px-3 text-[0.6rem] font-semibold tracking-[0.18em] uppercase">
              Seu negócio
            </p>
          )}
          <NavList compact={collapsed} />
          <div className="mt-auto space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" aria-hidden />
              ) : (
                <PanelLeftClose className="size-4" aria-hidden />
              )}
              {!collapsed && "Recolher menu"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/entrar" });
              }}
            >
              <LogOut className="size-4" aria-hidden />
              {!collapsed && "Sair"}
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 md:pb-0">
          <header className="border-border/60 bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-end gap-4 px-5 py-5 md:px-10 md:py-7">
              <div className="md:hidden">
                <BrandMark compact />
              </div>
              <CompanyLogo company={company} className="hidden size-12 rounded-2xl sm:flex" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-primary text-[0.62rem] font-semibold tracking-[0.18em] uppercase">
                    {company.nome}
                  </span>
                  {company.is_demo && (
                    <Badge className="bg-warning text-warning-foreground">Demonstração</Badge>
                  )}
                </div>
                <h1 className="font-display mt-1.5 truncate text-xl leading-tight font-extrabold tracking-tight md:text-3xl">
                  {title}
                </h1>
                {description && (
                  <p className="text-muted-foreground mt-1.5 hidden text-sm leading-relaxed md:block">
                    {description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            </div>
          </header>

          {avisoTeste && (
            <div className="border-warning/40 bg-warning/10 mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 md:mx-auto">
              <p className="text-sm leading-relaxed">
                {licenca.diasRestantes === 0
                  ? "Seu teste gratuito termina hoje."
                  : `Seu teste gratuito termina em ${licenca.diasRestantes} dia(s).`}{" "}
                Contrate a licença anual para não perder o acesso.
              </p>
              <Button size="sm" className="rounded-xl" onClick={() => navigate({ to: "/licenca" })}>
                Ver licença
              </Button>
            </div>
          )}

          <main className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">{children}</main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
        aria-label="Navegação inferior"
      >
        <div className="grid grid-cols-5">
          {MOBILE_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" aria-hidden />
              <span className="truncate px-1">{label.split(" ")[0]}</span>
            </Link>
          ))}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              >
                <Menu className="size-5" aria-hidden />
                <span>Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mb-5">
                <BrandMark />
              </div>
              <NavList onNavigate={() => setSheetOpen(false)} />
              <Button
                variant="ghost"
                className="mt-4 w-full justify-start gap-2 text-muted-foreground"
                onClick={async () => {
                  await signOut();
                  void navigate({ to: "/entrar" });
                }}
              >
                <LogOut className="size-4" aria-hidden /> Sair
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
