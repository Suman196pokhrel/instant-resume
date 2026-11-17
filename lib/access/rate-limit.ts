// Unlock rate limit (SPEC §4.1): 5 failed attempts per client within a minute. In-memory; one server process.
export function rateLimiter(max = 5, windowMs = 60_000) {
  const hits = new Map<string, { start: number; count: number }>();
  const entry = (client: string, now: number) => {
    let e = hits.get(client);
    if (!e || now - e.start >= windowMs) hits.set(client, (e = { start: now, count: 0 }));
    return e;
  };
  const wait = (e: { start: number; count: number }, now: number) => (e.count >= max ? Math.ceil((e.start + windowMs - now) / 1000) : 0);

  return {
    /** Seconds until this client may try again; 0 when allowed. */
    retryAfter: (client: string, now = Date.now()) => wait(entry(client, now), now),
    /** Records a failure; returns the wait in seconds once the limit is reached, else 0. */
    fail(client: string, now = Date.now()) {
      if (hits.size > 1000) for (const [k, e] of hits) if (now - e.start >= windowMs) hits.delete(k);
      const e = entry(client, now);
      e.count++;
      return wait(e, now);
    },
    clear: (client: string) => void hits.delete(client),
  };
}

/** The client address: the rightmost x-forwarded-for entry (added by the nearest proxy, or by Next.js itself). */
// shortcut: Next.js only sets x-forwarded-for when it is absent, so without a reverse proxy a client can spoof it;
// SPEC §4.1 requires HTTPS via a reverse proxy or a private network. Upgrade to the socket address if Next exposes it.
export function clientOf(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
}
