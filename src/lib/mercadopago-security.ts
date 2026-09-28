import { createHmac, timingSafeEqual } from "node:crypto";

export type AcaoPagamento = "activate" | "reverse" | "record";

export function classificarPagamento(status: string, statusDetail?: string | null): AcaoPagamento {
  if (
    status === "refunded" ||
    status === "cancelled" ||
    status === "charged_back" ||
    statusDetail === "partially_refunded"
  ) {
    return "reverse";
  }
  return status === "approved" ? "activate" : "record";
}

export function ambientePagamentoValido(
  liveMode: boolean,
  environment: "production" | "sandbox",
): boolean {
  return environment === "production" ? liveMode : !liveMode;
}

interface ValidarAssinaturaInput {
  signature: string | null;
  requestId: string | null;
  dataId: string;
  secrets: string[];
  toleranceSeconds: number;
  nowMs?: number;
}

export function validarAssinaturaMercadoPago({
  signature,
  requestId,
  dataId,
  secrets,
  toleranceSeconds,
  nowMs = Date.now(),
}: ValidarAssinaturaInput): boolean {
  if (!signature || !requestId || secrets.length === 0) return false;

  const parts = new Map(
    signature.split(",").map((part) => {
      const [key, ...value] = part.split("=");
      return [key?.trim(), value.join("=").trim()];
    }),
  );
  const timestamp = parts.get("ts");
  const receivedHash = parts.get("v1")?.toLowerCase();
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    !receivedHash ||
    !/^[a-f0-9]{64}$/.test(receivedHash)
  ) {
    return false;
  }

  const numericTimestamp = Number(timestamp);
  const timestampMs =
    numericTimestamp >= 1_000_000_000_000 ? numericTimestamp : numericTimestamp * 1000;
  if (
    !Number.isSafeInteger(numericTimestamp) ||
    Math.abs(nowMs - timestampMs) > toleranceSeconds * 1000
  ) {
    return false;
  }

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const received = Buffer.from(receivedHash, "hex");

  return secrets.some((secret) => {
    const expected = createHmac("sha256", secret).update(manifest).digest();
    return expected.length === received.length && timingSafeEqual(expected, received);
  });
}
