import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const UFS = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
] as const;

/**
 * Seleção de UF + cidade com sugestões automáticas das cidades do estado
 * (lista oficial do IBGE, com fallback silencioso caso a consulta falhe).
 */
export function LocalFields({
  uf,
  cidade,
  onUfChange,
  onCidadeChange,
  required = false,
}: {
  uf: string;
  cidade: string;
  onUfChange: (value: string) => void;
  onCidadeChange: (value: string) => void;
  required?: boolean;
}) {
  const listId = useId();
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!uf) {
      setCidades([]);
      return;
    }
    const controller = new AbortController();
    setCarregando(true);
    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("falha"))))
      .then((data: { nome: string }[]) => setCidades(data.map((d) => d.nome)))
      .catch(() => setCidades([]))
      .finally(() => setCarregando(false));
    return () => controller.abort();
  }, [uf]);

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
      <div className="space-y-1.5">
        <Label htmlFor={`cidade-${listId}`}>Cidade</Label>
        <Input
          id={`cidade-${listId}`}
          list={listId}
          required={required}
          autoComplete="address-level2"
          value={cidade}
          onChange={(e) => onCidadeChange(e.target.value)}
          placeholder={uf ? "Comece a digitar..." : "Escolha a UF primeiro"}
          disabled={!uf}
        />
        <datalist id={listId}>
          {cidades.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {uf && carregando && (
          <p className="text-xs text-muted-foreground">Carregando cidades de {uf}...</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`uf-${listId}`}>UF</Label>
        <Select
          value={uf}
          onValueChange={(v) => {
            onUfChange(v);
            onCidadeChange("");
          }}
        >
          <SelectTrigger id={`uf-${listId}`}>
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {UFS.map((u) => (
              <SelectItem key={u.sigla} value={u.sigla}>
                {u.sigla} — {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
