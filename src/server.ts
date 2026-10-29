import { NextResponse } from "next/server"
import { defaultGuard } from "./guard"

export { defaultGuard }

// The support assistant's door to the backend, for the project's route handler (app/api/chat/[...path]/route.ts):
//   import { createChatProxy } from "@/addons/support-chat/server"
//   export const { GET, POST } = createChatProxy({ apiUrl, authToken, guard })
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
  /** Base address of the backend API, e.g. https://admin.example.com/api/v1 */
  apiUrl: string
  /** The signed-in customer's token (read from the project's cookie), or undefined for a visitor. */
  authToken: () => Promise<string | undefined>
  /** The project's own request safety. Leave it out to use `defaultGuard` (guard.ts). */
  guard?: ChatGuard
  /** Photos in a message: how many files and how large each may be. `false` refuses photos. Default: 3 files of 5 MB. */
  images?: { maxFiles: number; maxBytes: number } | false
  /** Calls allowed per visitor, as [count, windowMs] pairs for each kind. Anything left out keeps the default below. */
  limits?: Partial<Record<keyof typeof DEFAULT_LIMITS, [number, number][]>>
}

const GUEST_TOKEN = /^[A-Za-z0-9]{16,100}$/
const MAX_BODY = 8 * 1024
const MAX_MESSAGE = 1000

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined)
const token = (v: unknown) => (typeof v === "string" && GUEST_TOKEN.test(v) ? v : undefined)
const text = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v).slice(0, max) : undefined)

function rebuild(kind: string, raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const guest_token = token(raw.guest_token)
  if (kind === "messages") {
    const message = clean(raw.message, MAX_MESSAGE)?.trim()
    if (!message) return undefined
    const ctx = (raw.context && typeof raw.context === "object" ? raw.context : {}) as Record<string, unknown>
    const cart = Array.isArray(ctx.cart)
      ? ctx.cart.slice(0, 10).flatMap((c: unknown) => {
          const r = (c && typeof c === "object" ? c : {}) as Record<string, unknown>
          const id = text(r.product_id, 64)
          const qty = typeof r.qty === "number" && r.qty > 0 && r.qty < 1_000_000 ? Math.floor(r.qty) : undefined
          return id && qty ? [{ product_id: id, qty }] : []
        })
      : undefined
    return { message, guest_token, context: { path: clean(ctx.path, 200), product_slug: clean(ctx.product_slug, 120), cart } }
  }
  if (kind === "feedback") {
    const message_id = typeof raw.message_id === "number" && Number.isInteger(raw.message_id) && raw.message_id > 0 ? raw.message_id : undefined
    return message_id && (raw.value === "up" || raw.value === "down") ? { message_id, value: raw.value, guest_token } : undefined
  }
  if (kind === "handoff") {
    const name = clean(raw.name, 80)?.trim()
    const phone = clean(raw.phone, 30)?.trim()
    return name && phone ? { name, phone, note: clean(raw.note, 500)?.trim() || undefined, guest_token } : undefined
  }
  if (kind === "close") return { guest_token }
  // drafts
  return raw.action === "confirm" || raw.action === "dismiss" ? { action: raw.action, guest_token } : undefined
}

const MAX_FIELD = 64 * 1024

// A photo is accepted only if its first bytes say JPEG, PNG or WebP, whatever name or type the browser gave it.
async function sniff(file: File): Promise<"jpg" | "png" | "webp" | undefined> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg"
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png"
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp"
  return undefined
}

/** A message with photos arrives as a form. Rebuilt field by field like the JSON one; each photo is checked and renamed. */
async function rebuildForm(form: FormData, rules: { maxFiles: number; maxBytes: number }): Promise<{ body: FormData } | { status: number; message: string }> {
  const field = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : undefined)
  const message = clean(field("message"), MAX_MESSAGE)?.trim() ?? ""
  const files = form.getAll("images[]").filter((f): f is File => typeof f !== "string")
  if (!message && files.length === 0) return { status: 422, message: "Please write a message first." }
  if (files.length > rules.maxFiles) return { status: 422, message: `You can send up to ${rules.maxFiles} photos in one message.` }
  const body = new FormData()
  body.set("message", message)
  const gt = token(field("guest_token"))
  if (gt) body.set("guest_token", gt)
  const path = clean(field("context[path]"), 200)
  if (path) body.set("context[path]", path)
  const slug = clean(field("context[product_slug]"), 120)
  if (slug) body.set("context[product_slug]", slug)
  let n = 0
  for (let i = 0; i < 10; i++) {
    const id = text(field(`context[cart][${i}][product_id]`), 64)
    const qty = Number(field(`context[cart][${i}][qty]`))
    if (id && Number.isInteger(qty) && qty > 0 && qty < 1_000_000) {
      body.set(`context[cart][${n}][product_id]`, id)
      body.set(`context[cart][${n}][qty]`, String(qty))
      n++
    }
  }
  for (const [i, file] of files.entries()) {
    if (file.size === 0 || file.size > rules.maxBytes) return { status: 422, message: `A photo is larger than ${Math.round(rules.maxBytes / 1024 / 1024)} MB.` }
    const kind = await sniff(file)
    if (!kind) return { status: 422, message: "Only JPEG, PNG or WebP photos can be sent." }
    const type = kind === "jpg" ? "image/jpeg" : kind === "png" ? "image/png" : "image/webp"
    body.append("images[]", new File([file], `photo-${i + 1}.${kind}`, { type }))
  }
  return { body }
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
} satisfies Record<string, [number, number][]>

function place(parts: string[], method: "GET" | "POST") {
  const [kind, id] = parts
  if (method === "GET") {
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

export function createChatProxy({ apiUrl, authToken, guard = defaultGuard, limits, images = { maxFiles: 3, maxBytes: 5 * 1024 * 1024 } }: ChatProxyOptions) {
  const allowed: Record<string, [number, number][]> = { ...DEFAULT_LIMITS, ...limits }

  async function forward(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const method = req.method === "GET" ? "GET" : "POST"
    const target = place((await params).path, method)
    if (!target) return NextResponse.json({ message: "Not found." }, { status: 404 })

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
    const headers = { Accept: "application/json", ...guard.forwardedFor(req.headers), ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }
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
