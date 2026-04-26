type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

declare global {
  var __dnkbizRateLimitStore: RateLimitStore | undefined;
}

const rateLimitStore = globalThis.__dnkbizRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalThis.__dnkbizRateLimitStore) {
  globalThis.__dnkbizRateLimitStore = rateLimitStore;
}

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function getRequestClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || 'unknown';
}

export function consumeRateLimit(params: {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();

  if (rateLimitStore.size > 1_000) {
    pruneExpiredEntries(now);
  }

  const storageKey = `${params.bucket}:${params.key}`;
  const current = rateLimitStore.get(storageKey);

  if (!current || current.resetAt <= now) {
    const nextEntry = {
      count: 1,
      resetAt: now + params.windowMs,
    };

    rateLimitStore.set(storageKey, nextEntry);

    return {
      allowed: true,
      remaining: Math.max(params.limit - 1, 0),
      retryAfterSeconds: Math.ceil(params.windowMs / 1000),
    };
  }

  current.count += 1;
  rateLimitStore.set(storageKey, current);

  return {
    allowed: current.count <= params.limit,
    remaining: Math.max(params.limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}
