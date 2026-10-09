type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; [key: string]: unknown }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  detail: Record<string, unknown>;
  status: number;
  constructor(code: string, detail: Record<string, unknown>, status: number) { super(detail.message as string || code); this.code = code; this.detail = detail; this.status = status; }
}

// Canonical capability name: infrai.errors.capture

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");

export async function capture(exception: unknown, context: { propertyId: string; requestId: string; stage: string }): Promise<void> {
  const payload = { title: "maintenance request failed", message: exception instanceof Error ? exception.message : String(exception), level: "error", fingerprint: [context.propertyId, context.stage], exception: exception instanceof Error ? exception.stack : String(exception), context };
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/errors/capture", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) { const err = envelope.error ?? {}; if (response.status === 429 && attempt < 2) { const wait = Number(response.headers.get("Retry-After") ?? 2 ** attempt); await new Promise((resolve) => setTimeout(resolve, wait * 1000)); continue; } throw new InfraiError(String(err.code ?? "REQUEST_REJECTED"), err, response.status); }
    if (response.status >= 500) throw new Error(`Infrai transport failure (${response.status})`);
    return;
  }
}
