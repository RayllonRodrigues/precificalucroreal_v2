import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { mensagemErro } from "@/lib/auth-messages";
import { AppLayout } from "@/components/app-layout";
import { ListSkeleton, NumberField } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatBRL, formatPercent } from "@/lib/format";
import { seedPaymentMethods, useCompany, usePaymentMethods, useSaveRow } from "@/lib/app-data";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/pagamentos")({
  head: () => ({
    meta: [
      { title: "Formas de pagamento — Precifica" },
      {
        name: "description",
        content:
          "Configure taxas de Pix, débito e crédito de 1x a 12x, tarifas fixas e prazos de recebimento.",
      },
      { property: "og:title", content: "Formas de pagamento — Precifica" },
      { property: "og:description", content: "Taxas e prazos usados na precificação." },
    ],
  }),
  component: PagamentosPage,
});

const GRUPOS: { titulo: string; tipos: string[] }[] = [
  { titulo: "À vista", tipos: ["dinheiro", "pix", "debito", "credito"] },
  { titulo: "Crédito parcelado", tipos: ["credito_parcelado"] },
];

function PagamentosPage() {
  const { data: company } = useCompany();
  const { data: methods, isLoading } = usePaymentMethods(company?.id);
  const save = useSaveRow("payment_methods");
  const qc = useQueryClient();
  const [restaurando, setRestaurando] = useState(false);

  const exemplo = 100;

  return (
    <AppLayout
      title="Formas de pagamento"
      description="Essas taxas entram automaticamente no cálculo do preço."
      actions={
        <Button
          variant="outline"
          className="gap-2 font-semibold"
          disabled={restaurando}
          onClick={async () => {
            if (!company) return;
            setRestaurando(true);
            try {
              await seedPaymentMethods(company.id, false);
              await qc.invalidateQueries();
              toast.success("Formas de pagamento padrão restauradas.");
            } catch (error) {
              toast.error(
                mensagemErro(error, "Não foi possível restaurar as formas de pagamento."),
              );
            } finally {
              setRestaurando(false);
            }
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          <span className="hidden sm:inline">Restaurar padrão</span>
        </Button>
      }
    >
      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : (
        <div className="space-y-6">
          {GRUPOS.map((grupo) => {
            const lista = (methods ?? []).filter((m) => grupo.tipos.includes(m.tipo));
            if (!lista.length) return null;
            return (
              <section key={grupo.titulo}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CreditCard className="size-4" aria-hidden /> {grupo.titulo}
                </h2>
                <div className="grid gap-3 lg:grid-cols-2">
                  {lista.map((m) => {
                    const custoExemplo =
                      (exemplo * Number(m.taxa_percentual)) / 100 + Number(m.tarifa_fixa);
                    return (
                      <article key={m.id} className="card-soft p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-display font-bold">{m.nome}</h3>
                            <p className="text-xs text-muted-foreground">
                              Em uma venda de {formatBRL(exemplo)} você recebe{" "}
                              <strong className="text-foreground">
                                {formatBRL(exemplo - custoExemplo)}
                              </strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!m.ativo && <Badge variant="outline">Inativa</Badge>}
                            <Switch
                              checked={m.ativo}
                              onCheckedChange={() =>
                                void save.mutateAsync({ id: m.id, values: { ativo: !m.ativo } })
                              }
                              aria-label={m.ativo ? "Desativar forma" : "Ativar forma"}
                            />
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <NumberField
                            id={`taxa-${m.id}`}
                            label="Taxa"
                            suffix="%"
                            value={Number(m.taxa_percentual)}
                            onChange={(v) =>
                              void save.mutateAsync({ id: m.id, values: { taxa_percentual: v } })
                            }
                          />
                          <NumberField
                            id={`tarifa-${m.id}`}
                            label="Tarifa fixa"
                            prefix="R$"
                            value={Number(m.tarifa_fixa)}
                            onChange={(v) =>
                              void save.mutateAsync({ id: m.id, values: { tarifa_fixa: v } })
                            }
                          />
                          <NumberField
                            id={`prazo-${m.id}`}
                            label="Prazo (dias)"
                            value={m.prazo_recebimento}
                            onChange={(v) =>
                              void save.mutateAsync({
                                id: m.id,
                                values: { prazo_recebimento: Math.round(v) },
                              })
                            }
                          />
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground">
                          Custo da taxa: {formatPercent(Number(m.taxa_percentual), 2)} +{" "}
                          {formatBRL(Number(m.tarifa_fixa))} por venda · recebimento em{" "}
                          {m.prazo_recebimento} dia(s)
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
