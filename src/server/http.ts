export type Fetcher = typeof fetch;
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public upstreamStatus?: number,
  ) {
    super(message);
  }
}
export interface JsonResult {
  body: unknown;
  retrievedAt: string;
  fromCache: boolean;
}
/** Bounded TTL cache; concurrent identical requests coalesce. Errors are never cached. */
export class JsonClient {
  private cache = new Map<string, { expires: number; result: JsonResult }>();
  private inflight = new Map<string, Promise<JsonResult>>();
  constructor(
    private fetcher: Fetcher = fetch,
    private now = () => Date.now(),
    private timeoutMs = 8000,
  ) {}
  async get(
    url: string,
    ttl = 600_000,
    accept = "application/json",
  ): Promise<JsonResult> {
    const key = `${accept}:${url}`;
    const cached = this.cache.get(key);
    if (cached && cached.expires > this.now())
      return { ...cached.result, fromCache: true };
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const task = this.request(url, accept)
      .then((result) => {
        if (this.cache.size >= 500)
          this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, { expires: this.now() + ttl, result });
        return result;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, task);
    return task;
  }
  private async request(url: string, accept: string): Promise<JsonResult> {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await this.fetcher(url, {
          headers: { Accept: accept },
          signal: AbortSignal.timeout(this.timeoutMs),
          redirect: "error",
        });
      } catch {
        if (attempt === 0) continue;
        throw new ApiError(
          502,
          "UPSTREAM_UNAVAILABLE",
          "Datakilden svarte ikke innen fristen. Prøv igjen senere.",
        );
      }
      if (!response.ok) {
        if (response.status >= 500 && attempt === 0) continue;
        const status = response.status;
        throw new ApiError(
          status === 404 || status === 410 ? status : 502,
          status === 429
            ? "UPSTREAM_RATE_LIMIT"
            : status === 410
              ? "GONE"
              : status === 404
                ? "NOT_FOUND"
                : "UPSTREAM_UNAVAILABLE",
          status === 429
            ? "Datakilden har begrenset antall oppslag. Vent litt før du prøver igjen."
            : status === 410
              ? "Enheten er fjernet fra registeret."
              : status === 404
                ? "Opplysningene finnes ikke i kilden."
                : "Datakilden er midlertidig utilgjengelig.",
          status,
        );
      }
      try {
        const body: unknown = await response.json();
        return {
          body,
          retrievedAt: new Date(this.now()).toISOString(),
          fromCache: false,
        };
      } catch {
        throw new ApiError(
          502,
          "INVALID_UPSTREAM",
          "Datakilden returnerte et uventet format.",
        );
      }
    }
    throw new ApiError(
      502,
      "UPSTREAM_UNAVAILABLE",
      "Datakilden er utilgjengelig.",
    );
  }
}
