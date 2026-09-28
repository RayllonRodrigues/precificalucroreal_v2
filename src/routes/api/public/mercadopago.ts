import { createFileRoute } from "@tanstack/react-router";
import { handleMercadoPagoWebhook } from "@/lib/mercadopago-webhook";
import {
  confirmarPagamentoMercadoPago,
  obterSegredosWebhookMercadoPago,
  obterToleranciaWebhookMercadoPago,
} from "@/lib/licenca.server";

export const Route = createFileRoute("/api/public/mercadopago")({
  server: {
    handlers: {
      GET: () => new Response(null, { status: 405, headers: { Allow: "POST" } }),
      POST: ({ request }) =>
        handleMercadoPagoWebhook(request, {
          secrets: obterSegredosWebhookMercadoPago(),
          toleranceSeconds: obterToleranciaWebhookMercadoPago(),
          confirmPayment: confirmarPagamentoMercadoPago,
        }),
    },
  },
});
