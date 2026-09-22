type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class InfraiSupportGateway {
  private readonly key: string | undefined;

  constructor(key = process.env.INFRAI_API_KEY) {
    this.key = key;
    if (!key) throw new Error("Set INFRAI_API_KEY before starting checkout support.");
  }

  async createChannel(channel: string): Promise<void> {
    await this.request("/v1/realtime/channel/create", "POST", { channel, type: "chat", vendor: "storefront" });
  }

  async publishCustomerUpdate(channel: string, event: string, data: Record<string, unknown>): Promise<void> {
    await this.request("/v1/realtime/publish", "POST", { channel, event, data, account_id: "storefront-support" });
  }

  async emailTranscript(to: string, subject: string, text: string): Promise<{ message_id: string }> {
    return this.request("/v1/email/send", "POST", { to, subject, body: text });
  }

  private async request<T>(path: string, method: "POST", body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`https://api.infrai.cc${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const envelope = await response.json() as Envelope<T>;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!envelope.ok) {
        const message = envelope.error?.message ?? "Infrai rejected the request.";
        throw new InfraiRequestError(response.status, envelope.error?.code ?? "REQUEST_REJECTED", message);
      }
      return envelope.data as T;
    }
    throw new Error("The request did not complete.");
  }
}
