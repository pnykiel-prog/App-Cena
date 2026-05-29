// Prosty in-memory rate limit per (key, window).
// W produkcji powinno być w Redis/Upstash, ale dla MVP wystarczy in-memory
// w jednym procesie Vercel (przy skalowaniu warto przepiąć).

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Czyść stare wpisy żeby nie wyciekać pamięci.
function gc() {
  if (buckets.size < 1024) return;
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
}

export type RateLimitConfig = {
  /** Identyfikator zasobu (np. "widget-quote") */
  resource: string;
  /** Limit żądań w oknie */
  limit: number;
  /** Długość okna w sekundach */
  windowSec: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  gc();
  const key = `${config.resource}:${identifier}`;
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    const resetAt = now + config.windowSec * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }
  if (existing.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count++;
  return {
    allowed: true,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Wyciąga klienta z nagłówków proxy (Vercel/Cloudflare) lub fallback do
 * generycznego "anon" gdy IP niedostępne.
 */
export function clientIdentifier(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "anon";
}
