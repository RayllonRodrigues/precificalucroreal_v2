import { ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMMUNITY_WHATSAPP_URL } from "@/lib/constants";

export function CommunityInvite() {
  return (
    <section
      aria-labelledby="community-title"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-accent/40 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 space-y-2">
        <h2 id="community-title" className="flex items-center gap-2 font-display text-lg font-bold">
          <MessageCircle className="size-5 shrink-0 text-primary" aria-hidden />
          Faça parte da comunidade Precifica
        </h2>
        <p className="text-sm text-muted-foreground">
          Troque experiências, tire dúvidas e compartilhe sugestões no nosso grupo do WhatsApp.
          A participação é opcional.
        </p>
        <p className="text-xs text-muted-foreground">
          Ao entrar no grupo, seu número pode ficar visível para outros participantes.
        </p>
      </div>
      <Button asChild className="min-h-11 shrink-0">
        <a href={COMMUNITY_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          Entrar na comunidade
          <ExternalLink className="size-4" aria-hidden />
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </Button>
    </section>
  );
}
