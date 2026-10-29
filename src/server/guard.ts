import { isIP } from "node:net"
import { NextResponse } from "next/server"
import type { ChatGuard } from "./index"

// A ready-made `guard` for createChatProxy, so a new project needs nothing of its own. Server only.
//   export const { GET, POST } = createChatProxy({ apiUrl, authToken, guard: defaultGuard })
// A project with its own request safety (a shared rate limiter, for example) passes its own pieces instead.

/**
 * The visitor's real address, as the reverse proxy put it in X-Forwarded-For. This is only as trustworthy as that proxy: it must
 * overwrite the header from the connection (nginx `proxy_set_header X-Forwarded-For $remote_addr`), or a visitor can forge it and
 * dodge the limits. Only a well-formed IP is used.
 */
function visitorIp(h: Headers): string | undefined {
  const first = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]?.trim()
  return first && isIP(first) ? first : undefined
}

const hits = new Map<string, { count: number; resetAt: number }>()

/** A fixed-window limit kept in this server's memory (each copy of a multi-server platform counts alone; the backend keeps the real limit). */
function rateLimit(key: string, limit: number, windowMs: number): number {
  const now = Date.now()
  if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
  const hit = hits.get(key)
  if (!hit || hit.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return 0
  }
  hit.count += 1
  return hit.count > limit ? Math.ceil((hit.resetAt - now) / 1000) : 0
}

export const defaultGuard: ChatGuard = {
  // A write must come from this site's own pages. A request with no Origin (curl, the server itself) still counts against the limits.
  crossSite(req) {
    const origin = req.headers.get("origin")
    if (!origin) return undefined
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
    try {
      if (new URL(origin).host === host) return undefined
    } catch {}
    return NextResponse.json({ message: "This request was blocked for your safety." }, { status: 403 })
  },
  visitorIp,
  forwardedFor(h): Record<string, string> {
    const ip = visitorIp(h)
    return ip ? { "X-Forwarded-For": ip } : {}
  },
  rateLimit,
  tooMany: (retryAfter) => NextResponse.json({ message: `Too many attempts. Please wait ${retryAfter} seconds and try again.` }, { status: 429, headers: { "Retry-After": String(retryAfter) } }),
}
