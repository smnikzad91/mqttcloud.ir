import { createHmac, timingSafeEqual } from "crypto";

// Client for nodepass.ir's merchant API — confirms Iranian card-to-card bank
// transfers by reading the receiving bank's deposit SMS, so a "payment" here
// is really "we'll tell you which card to transfer this exact amount to, and
// call your webhook once the bank SMS confirms it arrived."
// Docs: https://nodepass.ir (see the nodepass.ir/web repo's README for the
// full merchant API). Requires a merchant + API key created in nodepass's
// own admin panel — NODEPASS_API_KEY / NODEPASS_WEBHOOK_SECRET below.
const BASE = "https://nodepass.ir/v1";

export interface NodepassPayment {
  id: string;
  merchantRef: string;
  trackingCode: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  amountToman: number;
  offsetRial: number;
  payableRial: string;
  paidRial: string | null;
  card: { number: string; ownerName: string; bankName: string };
  expiresAt: string;
  paidAt: string | null;
  statusUrl: string;
}

export interface CreatePaymentInput {
  amountToman: number;
  merchantRef: string;
  ttlMinutes?: number;
  customerHint?: string;
  returnUrl?: string;
}

class NodepassError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "NodepassError";
    this.code = code;
    this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.NODEPASS_API_KEY;
  if (!apiKey) throw new Error("NODEPASS_API_KEY is not set.");

  const res = await fetch(BASE + path, {
    ...init,
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new NodepassError(data.message ?? data.error ?? "nodepass request failed", data.error, res.status);
  return data as T;
}

export const createPayment = (input: CreatePaymentInput): Promise<NodepassPayment> =>
  call<NodepassPayment>("/payments", { method: "POST", body: JSON.stringify(input) });

export const getPayment = (id: string): Promise<NodepassPayment> => call<NodepassPayment>(`/payments/${id}`);

export const cancelPayment = (id: string): Promise<NodepassPayment> =>
  call<NodepassPayment>(`/payments/${id}/cancel`, { method: "POST" });

export interface WebhookEvent {
  event: "payment.paid" | "payment.expired" | "payment.cancelled";
  payment: NodepassPayment;
}

// Verifies X-Nodepass-Timestamp/X-Nodepass-Signature against NODEPASS_WEBHOOK_SECRET.
// Pass the RAW request body — signing is over the exact bytes nodepass sent.
export function verifyWebhook(rawBody: string, headers: Headers): WebhookEvent | null {
  const secret = process.env.NODEPASS_WEBHOOK_SECRET;
  if (!secret) return null;

  const ts = headers.get("x-nodepass-timestamp") ?? "";
  const sigHeader = headers.get("x-nodepass-signature") ?? "";
  if (!/^\d+$/.test(ts) || Math.abs(Date.now() - Number(ts)) > 5 * 60_000) return null;
  if (!/^[0-9a-f]+$/i.test(sigHeader)) return null;

  const sig = Buffer.from(sigHeader, "hex");
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}
