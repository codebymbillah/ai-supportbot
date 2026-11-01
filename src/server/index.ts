import { NextResponse } from "next/server"
import { defaultGuard } from "./guard"
import { MAX_BODY, token } from "./fields"
import { rebuild } from "./messages"
import { MAX_FIELD, rebuildForm } from "./photos"

export { defaultGuard }

// The support assistant's door to the backend, for the project's route handler (app/api/chat/[...path]/route.ts):
//   import { createChatProxy } from "@/addons/support-chat/server"
//   export const { GET, POST } = createChatProxy()   // reads API_URL; or createChatProxy({ apiUrl, authToken, guard })
// Import it only from server code. The browser never calls the backend for the chat itself: this checks the request, adds the customer's
// sign-in when there is one (the token is a cookie only the server can read), passes the visitor's address on for the backend's own limits,
// and returns the answer. Only the calls below pass. A body is rebuilt field by field, so nothing else the browser sends reaches the backend.
// The backend does not stream: a message is saved at once and the answer is fetched by polling GET /messages.

/** The request-safety pieces the door needs. `defaultGuard` (guard.ts) is a ready set. */
export interface ChatGuard {
  /** A response to return when a write comes from another site, else undefined. */
  crossSite: (req: Request) => Response | undefined
  /** The visitor's address, when it is trustworthy. */
  visitorIp: (h: Headers) => string | undefined
  /** Headers that pass the visitor's address on to the backend. */
  forwardedFor: (h: Headers) => Record<string, string>
  /** Seconds to wait when `key` has used up `limit` calls in `windowMs`, else 0. */
  rateLimit: (key: string, limit: number, windowMs: number) => number
  /** The response for "wait this many seconds". */
  tooMany: (retryAfter: number) => Response
}

/** What the project lends the door: the pieces that depend on its sign-in and its way of limiting requests. */
export interface ChatProxyOptions {
  /** Base address of the backend API, e.g. https://admin.example.com/api/v1. Default: the `API_URL` environment variable. */
  apiUrl?: string
  /** The signed-in customer's token (read from the project's cookie), or undefined for a visitor. Default: every caller is a visitor. */
  authToken?: () => Promise<string | undefined>
  /** The site key the chat service gave this site (hosted mode). Sent as `X-Chat-Key`; it lives on the server only. Default: the `SUPPORT_CHAT_KEY` environment variable. */
  siteKey?: string
  /** The project's own request safety. Leave it out to use `defaultGuard` (guard.ts). */
  guard?: ChatGuard
  /** Photos in a message: how many files and how large each may be. `false` refuses photos. Default: 3 files of 5 MB. */
  images?: { maxFiles: number; maxBytes: number } | false
  /** Calls allowed per visitor, as [count, windowMs] pairs for each kind. Anything left out keeps the default below. */
  limits?: Partial<Record<keyof typeof DEFAULT_LIMITS, [number, number][]>>
}

// How many calls one visitor may make. Messages are the expensive ones. Polling gets its own, higher allowance: the widget asks every
// couple of seconds, so counting polls with the messages would shut the chat after a minute.
const DEFAULT_LIMITS = {
  messages: [[8, 60_000], [120, 24 * 60 * 60_000]],
  handoff: [[3, 10 * 60_000]],
  close: [[10, 60_000]],
  feedback: [[30, 60_000]],
  drafts: [[10, 60_000]],
  poll: [[75, 60_000]],
  status: [[20, 60_000]],
  config: [[30, 60_000]],
} satisfies Record<string, [number, number][]>

function place(parts: string[], method: "GET" | "POST") {
  const [kind, id] = parts
  if (method === "GET") {
    if (parts.length === 1 && kind === "config") return { kind: "config", path: "config" }
    if (parts.length === 1 && kind === "messages") return { kind: "poll", path: "messages" }
    if (parts.length === 1 && kind === "status") return { kind: "status", path: "status" }
    return undefined
  }
  if (parts.length === 1 && (kind === "messages" || kind === "feedback" || kind === "handoff" || kind === "close")) return { kind, path: kind }
  if (parts.length === 2 && kind === "drafts" && /^[\w-]{1,64}$/.test(id)) return { kind, path: `drafts/${id}` }
  return undefined
}

// What may go back to the browser: the answer as it is, but for an error only the sentence and the support numbers (never server internals).
function pass(res: Response, data: unknown) {
  const retryAfter = res.headers.get("Retry-After")
  const headers = { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": retryAfter } : {}) }
  if (res.ok) return NextResponse.json(data ?? {}, { status: res.status, headers })
  if (!data || typeof data !== "object") return NextResponse.json({ message: "The assistant is temporarily unavailable. Please try again in a few minutes, or call us." }, { status: 503, headers })
  const { message, errors, contact } = data as { message?: string; errors?: unknown; contact?: unknown }
  return NextResponse.json({ message, errors, contact }, { status: res.status, headers })
}

export function createChatProxy({ apiUrl: given, siteKey: givenKey, authToken = async () => undefined, guard = defaultGuard, limits, images = { maxFiles: 3, maxBytes: 5 * 1024 * 1024 } }: ChatProxyOptions = {}) {
  const allowed: Record<string, [number, number][]> = { ...DEFAULT_LIMITS, ...limits }

  async function forward(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const method = req.method === "GET" ? "GET" : "POST"
    const target = place((await params).path, method)
    if (!target) return NextResponse.json({ message: "Not found." }, { status: 404 })
    // Read when a call arrives, so a missing setting says what is wrong instead of failing the build.
    const siteKey = givenKey ?? process.env.SUPPORT_CHAT_KEY
    const apiUrl = (given ?? process.env.API_URL ?? process.env.SUPPORT_CHAT_URL ?? "").replace(/\/+$/, "")
    if (!apiUrl) return NextResponse.json({ message: "The chat is not set up: the API_URL setting is missing." }, { status: 500 })

    if (method === "POST") {
      const blocked = guard.crossSite(req)
      if (blocked) return blocked
    }
    // A script that sends no Origin still counts against the same limits.
    const who = guard.visitorIp(req.headers) ?? "unknown"
    for (const [i, [limit, windowMs]] of (allowed[target.kind] ?? []).entries()) {
      const wait = guard.rateLimit(`chat:${target.kind}:${i}:${who}`, limit, windowMs)
      if (wait) return guard.tooMany(wait)
    }

    const auth = await authToken()
    const headers = { Accept: "application/json", ...guard.forwardedFor(req.headers), ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(siteKey ? { "X-Chat-Key": siteKey } : {}) }
    let res: Response
    try {
      if (method === "GET") {
        const q = new URL(req.url).searchParams
        const after = Number(q.get("after") ?? 0)
        const query = new URLSearchParams()
        if (target.kind === "poll") {
          query.set("after", String(Number.isInteger(after) && after > 0 ? after : 0))
          const gt = token(q.get("guest_token"))
          if (gt) query.set("guest_token", gt)
        }
        res = await fetch(`${apiUrl}/chat/${target.path}${query.size ? `?${query}` : ""}`, { headers, cache: "no-store", signal: req.signal })
      } else {
        const multipart = target.kind === "messages" && (req.headers.get("content-type") ?? "").startsWith("multipart/form-data")
        if (multipart) {
          if (!images) return NextResponse.json({ message: "Photos are not accepted here." }, { status: 422 })
          if (Number(req.headers.get("content-length") ?? 0) > images.maxFiles * images.maxBytes + MAX_FIELD) return NextResponse.json({ message: "Those photos are too large." }, { status: 413 })
          const form = await req.formData().catch(() => undefined)
          const built = form ? await rebuildForm(form, images) : { status: 422, message: "Please write a message first." }
          if ("message" in built) return NextResponse.json({ message: built.message }, { status: built.status })
          // No Content-Type: fetch adds it with the boundary.
          res = await fetch(`${apiUrl}/chat/${target.path}`, { method: "POST", headers, body: built.body, cache: "no-store", signal: req.signal })
          return pass(res, await res.json().catch(() => undefined))
        }
        if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return NextResponse.json({ message: "That message is too long." }, { status: 413 })
        const raw = (await req.json().catch(() => undefined)) as Record<string, unknown> | undefined
        const body = raw && typeof raw === "object" ? rebuild(target.kind, raw) : undefined
        if (!body) return NextResponse.json({ message: "Please write a message first." }, { status: 422 })
        res = await fetch(`${apiUrl}/chat/${target.path}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", signal: req.signal })
      }
    } catch {
      return NextResponse.json({ message: "Can't reach the server right now. Check your connection and try again." }, { status: 502 })
    }
    return pass(res, await res.json().catch(() => undefined))
  }

  return { GET: forward, POST: forward }
}
