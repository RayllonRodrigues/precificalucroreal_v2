import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mensagemErro } from "@/lib/auth-messages";
import {
  useCompanyLogo,
  useRemoveCompanyLogo,
  useUploadCompanyLogo,
  type Company,
} from "@/lib/app-data";

const TIPOS = ["image/png", "image/jpeg", "image/webp"];
const TAMANHO_MAX = 2 * 1024 * 1024;

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Marca da empresa: logo enviada ou as iniciais do nome. */
export function CompanyLogo({
  company,
  className,
}: {
  company: Pick<Company, "nome" | "logo_url">;
  className?: string;
}) {
  const { data: url } = useCompanyLogo(company.logo_url);
  return (
    <span
      className={cn(
        "bg-accent text-accent-foreground border-border/70 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-xs font-bold",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={`Logo de ${company.nome}`} className="size-full object-contain" />
      ) : (
        iniciais(company.nome)
      )}
    </span>
  );
}

/** Campo de envio da logo, usado nas configurações. */
export function LogoUploader({ company }: { company: Company }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const enviar = useUploadCompanyLogo();
  const remover = useRemoveCompanyLogo();

  async function escolher(file: File | undefined) {
    if (!file) return;
    if (!TIPOS.includes(file.type)) {
      toast.error("Envie uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > TAMANHO_MAX) {
      toast.error("A imagem precisa ter no máximo 2 MB.");
      return;
    }
    setEnviando(true);
    try {
      const result = await enviar.mutateAsync({
        companyId: company.id,
        file,
        oldPath: company.logo_url,
      });
      toast.success(
        result.cleanupPending
          ? "Logo atualizada. A imagem anterior será removida posteriormente."
          : "Logo atualizada.",
      );
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível enviar a logo."));
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function apagar() {
    try {
      const result = await remover.mutateAsync({ companyId: company.id, path: company.logo_url });
      toast.success(
        result.cleanupPending
          ? "Logo removida. A limpeza do arquivo será concluída posteriormente."
          : "Logo removida.",
      );
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível remover a logo."));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <CompanyLogo company={company} className="size-20 rounded-2xl text-lg" />
      <div className="min-w-0">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => void escolher(e.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl font-semibold"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden />
            {company.logo_url ? "Trocar logo" : "Enviar logo"}
          </Button>
          {company.logo_url && (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground gap-2 rounded-xl"
              disabled={remover.isPending}
              onClick={() => void apagar()}
            >
              <Trash2 className="size-4" aria-hidden /> Remover
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          PNG, JPG ou WEBP de até 2 MB. Ela aparece no topo do seu painel.
        </p>
      </div>
    </div>
  );
}
