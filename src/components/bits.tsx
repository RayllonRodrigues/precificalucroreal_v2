import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBRL, parseDecimal } from "@/lib/format";
import type { Classificacao } from "@/lib/pricing";
import { CLASSIFICACAO_LABEL } from "@/lib/pricing";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  icon?: ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "info" | "destructive";
}) {
  const toneClass = {
    default: "text-primary bg-accent",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    info: "text-info bg-info/10",
    destructive: "text-destructive bg-destructive/10",
  }[tone];

  return (
    <div className="bg-card border-border/70 hover:border-border rounded-2xl border p-5 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-[0.65rem] leading-snug font-semibold tracking-[0.14em] uppercase">
          {label}
        </p>
        {Icon && (
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", toneClass)}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="font-display mt-4 truncate text-2xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs leading-snug">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border/70 bg-card/50 flex flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-14 text-center">
      <span className="bg-accent text-primary mb-4 flex size-12 items-center justify-center rounded-2xl">
        <Icon className="size-6" />
      </span>
      <p className="font-display text-lg font-extrabold tracking-tight">{title}</p>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function ClassificacaoBadge({ value }: { value: Classificacao | string }) {
  const map: Record<string, string> = {
    saudavel: "bg-success/12 text-success border-success/30",
    atencao: "bg-warning/15 text-warning-foreground border-warning/40",
    prejuizo: "bg-destructive/12 text-destructive border-destructive/30",
  };
  return (
    <Badge variant="outline" className={cn("font-semibold", map[value] ?? map['saudavel'])}>
      {CLASSIFICACAO_LABEL[value as Classificacao] ?? value}
    </Badge>
  );
}

/** Campo numérico que aceita vírgula decimal. */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  id,
  min = 0,
  hint,
  error,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  id: string;
  min?: number;
  hint?: string | undefined;
  error?: string;
}) {
  const [text, setText] = useState(() => (value ? String(value).replace(".", ",") : ""));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value ? String(value).replace(".", ",") : "");
  }, [value, focused]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          inputMode="decimal"
          value={text}
          aria-invalid={!!error}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const parsed = parseDecimal(text);
            onChange(parsed < min ? min : parsed);
          }}
          onChange={(e) => {
            setText(e.target.value);
            const parsed = parseDecimal(e.target.value);
            onChange(parsed < min ? min : parsed);
          }}
          className={cn(prefix && "pl-9", suffix && "pr-9")}
          placeholder="0,00"
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function KeyValue({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: number | string;
  tone?: "success" | "destructive" | "muted";
  strong?: boolean;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", strong && "text-base", toneClass)}>
        {typeof value === "number" ? formatBRL(value) : value}
      </span>
    </div>
  );
}
