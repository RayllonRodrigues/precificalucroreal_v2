import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallContext = createContext({
  installed: false,
  busy: false,
  install: () => {},
});

export function InstallAppProvider({ children }: { children: ReactNode }) {
  const prompt = useRef<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const updateMode = () =>
      setInstalled(standalone.matches || navigatorWithStandalone.standalone === true);
    updateMode();
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPrompt;
    };
    const finishInstall = () => {
      prompt.current = null;
      setInstalled(true);
      setInstructions(false);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", finishInstall);
    standalone.addEventListener("change", updateMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", finishInstall);
      standalone.removeEventListener("change", updateMode);
    };
  }, []);

  async function install() {
    if (busy || installed) return;
    const event = prompt.current;
    if (!event) {
      setInstructions(true);
      return;
    }
    prompt.current = null; // Browser prompts can only be used once.
    setBusy(true);
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      setInstructions(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <InstallContext.Provider value={{ installed, busy, install: () => void install() }}>
      {children}
      <Dialog open={instructions} onOpenChange={setInstructions}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
          <DialogHeader>
            <Smartphone className="mb-2 size-8 text-primary" aria-hidden />
            <DialogTitle>Precifica no seu dispositivo</DialogTitle>
            <DialogDescription>
              Adicione um ícone para abrir o Precifica direto da sua tela inicial.
            </DialogDescription>
          </DialogHeader>
          {ios ? (
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              <li>Abra esta página no Safari.</li>
              <li>
                Toque em <strong>Compartilhar</strong> e escolha{" "}
                <strong>Adicionar à Tela de Início</strong>.
              </li>
              <li>
                Se aparecer, mantenha <strong>Abrir como App</strong> ativado e toque em{" "}
                <strong>Adicionar</strong>.
              </li>
            </ol>
          ) : (
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                No menu do navegador, procure <strong>Instalar aplicativo</strong> ou{" "}
                <strong>Adicionar à tela inicial</strong>. No computador, a opção também pode
                aparecer na barra de endereço.
              </p>
              <p>
                Se a opção não aparecer, abra o endereço no Chrome ou Edge. No Safari do Mac, use{" "}
                <strong>Arquivo → Adicionar ao Dock</strong>, quando disponível.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            É necessário estar conectado à internet para acessar sua conta e salvar dados.
          </p>
          <DialogClose asChild>
            <Button className="min-h-11">Entendi</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </InstallContext.Provider>
  );
}

export function InstallAppButton({
  compact = false,
  onClick,
  className,
}: {
  compact?: boolean | undefined;
  onClick?: (() => void) | undefined;
  className?: string;
}) {
  const { installed, busy, install } = useContext(InstallContext);
  if (installed) return null;
  return (
    <button
      type="button"
      disabled={busy}
      title="Instalar Precifica"
      aria-label="Instalar Precifica"
      onClick={() => {
        onClick?.();
        install();
      }}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        compact && "justify-center px-2",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-[18px] shrink-0 animate-spin" aria-hidden />
      ) : (
        <Download className="size-[18px] shrink-0" aria-hidden />
      )}
      {!compact && <span>{busy ? "Aguardando instalação…" : "Instalar Precifica"}</span>}
    </button>
  );
}
