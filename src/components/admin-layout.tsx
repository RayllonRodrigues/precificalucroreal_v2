import type { ComponentType, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminSecao {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export function AdminLayout({
  children,
  titulo,
  descricao,
  secoes,
  secao,
  onSecao,
}: {
  children: ReactNode;
  titulo: string;
  descricao?: string;
  secoes: readonly AdminSecao[];
  secao: string;
  onSecao: (v: string) => void;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-slate-900/60 p-4 lg:flex">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
              <ShieldCheck className="size-5" aria-hidden />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-extrabold tracking-tight">Precifica</p>
              <p className="text-xs text-slate-400">Central de administração</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1" aria-label="Seções da administração">
            {secoes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onSecao(value)}
                aria-current={secao === value ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  secao === value
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-2 pt-6">
            <p className="truncate px-3 text-xs text-slate-500">{user?.email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-slate-400 hover:text-white"
              onClick={() => navigate({ to: "/painel" })}
            >
              <ExternalLink className="size-4" aria-hidden /> Ir para o aplicativo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-slate-400 hover:text-white"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/admin" });
              }}
            >
              <LogOut className="size-4" aria-hidden /> Sair
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-white/10 bg-slate-900/40 px-4 py-4 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display truncate text-xl font-bold tracking-tight md:text-2xl">
                  {titulo}
                </h1>
                {descricao && <p className="text-sm text-slate-400">{descricao}</p>}
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">
                Acesso administrativo
              </span>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
              {secoes.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSecao(value)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                    secao === value ? "bg-white text-slate-900" : "bg-white/10 text-slate-300",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <main className="px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function AdminCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/5 p-4", className)}>
      {children}
    </div>
  );
}

export function AdminMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <AdminCard>
      <p className="text-xs tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </AdminCard>
  );
}
