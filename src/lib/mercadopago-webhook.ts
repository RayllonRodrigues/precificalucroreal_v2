import { validarAssinaturaMercadoPago } from "./mercadopago-security";

interface WebhookDependencies {
  secrets: string[];
  toleranceSeconds: number;
  confirmPayment: (id: string) => Promise<unknown>;
  nowMs?: number;
}

/** HTTP boundary. Only the signed query identifier is trusted, never body status/amount. */
export async function handleMercadoPagoWebhook(request: Request, deps: WebhookDependencies) {
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  if (!deps.secrets.length) return new Response("Webhook indisponível.", { status: 503 });
  const ids = new URL(request.url).searchParams.getAll("data.id");
  const dataId = ids[0];
  if (ids.length !== 1 || !dataId || !/^\d+$/.test(dataId)) {
    return new Response("Identificador inválido.", { status: 400 });
  }
  if (
    !validarAssinaturaMercadoPago({
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId,
      secrets: deps.secrets,
      toleranceSeconds: deps.toleranceSeconds,
      ...(deps.nowMs === undefined ? {} : { nowMs: deps.nowMs }),
    })
  )
    return new Response("Assinatura inválida.", { status: 401 });
  try {
    // Existing helper verifies provider data/environment and invokes the atomic RPC.
    await deps.confirmPayment(dataId);
    return Response.json({ received: true });
  } catch {
    // A non-2xx response allows the provider to retry transient failures.
    return new Response("Não foi possível processar a notificação.", { status: 503 });
  }
}
