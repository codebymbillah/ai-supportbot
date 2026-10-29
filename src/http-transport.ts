import { type ChatLabels, makeTranslate, type Translate } from "./labels"
import { type ChatCard, type ChatContact, ChatError, type ChatImage, type ChatMessage, type ChatState, type ChatTransport, EMPTY_STATE, type Sender } from "./types"

// Talks to the project's own route (default /api/chat), which adds the customer's sign-in and passes the call to the backend.
// Every field is read by name and checked, so a field the backend adds by mistake (a supplier, a source link) never reaches the screen.

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v)
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined)
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined)
const id = (v: unknown) => str(v) ?? (num(v) !== undefined ? String(num(v)) : undefined)
const rows = (v: unknown) => (Array.isArray(v) ? v.filter(isObj).flatMap((r) => (str(r.label) && str(r.value) ? [{ label: str(r.label)!, value: str(r.value)! }] : [])) : undefined)
const path = (v: unknown) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : undefined)

function toCard(raw: unknown): ChatCard | undefined {
  if (!isObj(raw)) return undefined
  if (raw.type === "product") {
    const productId = id(raw.product_id)
    const title = str(raw.title)
    const slug = str(raw.slug)
    if (!productId || !title || !slug) return undefined
    return {
      type: "product",
      productId,
      slug,
      title,
      image: str(raw.image),
      priceFrom: num(raw.price_from),
      offerPriceFrom: num(raw.offer_price_from),
      moq: num(raw.moq),
      unit: str(raw.unit),
      offerLabel: str(raw.offer_label),
      freeDelivery: raw.free_delivery === true,
      needsOptions: raw.needs_options === true,
      href: path(raw.href),
    }
  }
  if (raw.type === "info") {
    const title = str(raw.title)
    if (!title) return undefined
    const cta = isObj(raw.cta) ? raw.cta : undefined
    return { type: "info", title, rows: rows(raw.rows), note: str(raw.note), cta: cta && str(cta.label) && path(cta.href) ? { label: str(cta.label)!, href: path(cta.href)! } : undefined }
  }
  if (raw.type === "sourcing_draft") {
    const draftId = id(raw.draft_id)
    const title = str(raw.title)
    const r = rows(raw.rows)
    return draftId && title && r ? { type: "sourcing_draft", draftId, title, rows: r, confirmLabel: str(raw.confirm_label) } : undefined
  }
  return undefined
}

// A photo link must be an absolute https link (the backend's signed link). Anything else is dropped.
function toImages(raw: unknown): ChatImage[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw.filter(isObj).flatMap((i) => {
    const imageId = num(i.id)
    const url = str(i.url)
    return imageId !== undefined && url && /^https:\/\//.test(url) ? [{ id: imageId, url, aiReviewed: i.ai_reviewed !== false }] : []
  })
  return out.length ? out : undefined
}

const SENDERS: Sender[] = ["customer", "ai", "agent", "system"]

function toMessage(raw: unknown): ChatMessage | undefined {
  if (!isObj(raw)) return undefined
  const mid = num(raw.id)
  const sender = SENDERS.find((s) => s === raw.sender)
  if (mid === undefined || !sender) return undefined
  return {
    id: mid,
    sender,
    body: typeof raw.body === "string" ? raw.body : "",
    agentName: str(raw.agent_name),
    images: sender === "customer" ? toImages(raw.images) : undefined,
    cards: sender === "ai" && Array.isArray(raw.cards) ? raw.cards.flatMap((c) => toCard(c) ?? []).slice(0, 6) : [],
    feedback: raw.feedback === "up" || raw.feedback === "down" ? raw.feedback : undefined,
    createdAt: str(raw.created_at) ?? new Date().toISOString(),
  }
}

function toContact(raw: unknown): ChatContact {
  const c = isObj(raw) ? raw : {}
  return { phone: str(c.phone), whatsapp: str(c.whatsapp), email: str(c.email), hours: str(c.hours) }
}

function toState(raw: unknown): ChatState {
  if (!isObj(raw)) return EMPTY_STATE
  const h = isObj(raw.handoff) ? raw.handoff : undefined
  return {
    mode: raw.mode === "human" ? "human" : "ai",
    agentName: str(raw.agent_name),
    agentsOnline: raw.agents_online === true,
    handoff: h?.status === "contact" ? { status: "contact", contact: toContact(h.contact) } : h?.status === "waiting" ? { status: "waiting" } : null,
    awaitingReply: raw.awaiting_reply === true,
  }
}

async function problem(res: Response, t: Translate): Promise<ChatError> {
  const body = (await res.json().catch(() => undefined)) as Raw | undefined
  const errors = isObj(body?.errors) ? Object.values(body.errors).flat().find((x): x is string => typeof x === "string") : undefined
  const fallback = res.status === 429 ? t("rateLimited") : res.status === 503 ? t("unavailable") : t("failed")
  return new ChatError(str(body?.message) ?? errors ?? fallback, res.status, isObj(body) && body.contact ? toContact(body.contact) : undefined)
}

/** `brandName` and `labels` only choose the words of its error messages. */
export function createHttpTransport(base = "/api/chat", opts: { brandName?: string; labels?: Partial<ChatLabels> } = {}): ChatTransport {
  const t = makeTranslate(opts.brandName ?? "our team", "", opts.labels)
  async function call(url: string, init?: RequestInit) {
    let res: Response
    try {
      res = await fetch(`${base}${url}`, { cache: "no-store", ...init })
    } catch {
      throw new ChatError(t("unreachable"))
    }
    if (!res.ok) throw await problem(res, t)
    return (await res.json().catch(() => ({}))) as Raw
  }
  const post = (url: string, json: unknown) => call(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(json) })

  return {
    async send({ message, images, context, guestToken }) {
      let body: Raw
      if (images?.length) {
        // Photos go as a form, with the context fields in the backend's bracket style.
        const form = new FormData()
        form.set("message", message)
        if (guestToken) form.set("guest_token", guestToken)
        if (context.path) form.set("context[path]", context.path)
        if (context.productSlug) form.set("context[product_slug]", context.productSlug)
        context.cart?.forEach((c, i) => {
          form.set(`context[cart][${i}][product_id]`, c.productId)
          form.set(`context[cart][${i}][qty]`, String(c.qty))
        })
        for (const f of images) form.append("images[]", f, f.name)
        body = await call("/messages", { method: "POST", headers: { Accept: "application/json" }, body: form })
      } else {
        body = await post("/messages", {
          message,
          guest_token: guestToken,
          context: { path: context.path, product_slug: context.productSlug, cart: context.cart?.map((c) => ({ product_id: c.productId, qty: c.qty })) },
        })
      }
      const data = isObj(body.data) ? body.data : {}
      const message_ = toMessage(data.message)
      if (!message_) throw new ChatError(t("failed"))
      return { message: message_, state: toState(data.conversation), guestToken: str(data.guest_token) }
    },

    async poll({ after, guestToken }) {
      const q = new URLSearchParams({ after: String(after) })
      if (guestToken) q.set("guest_token", guestToken)
      const body = await call(`/messages?${q}`, { headers: { Accept: "application/json" } })
      return { messages: Array.isArray(body.data) ? body.data.flatMap((m) => toMessage(m) ?? []) : [], state: toState(body.meta) }
    },

    async status() {
      const body = await call("/status", { headers: { Accept: "application/json" } }).catch(() => ({}) as Raw)
      const d = isObj(body.data) ? body.data : body
      return { agentsOnline: d.agents_online === true }
    },

    async feedback({ messageId, value, guestToken }) {
      await post("/feedback", { message_id: messageId, value, guest_token: guestToken }).catch(() => undefined)
    },

    async close({ guestToken }) {
      await post("/close", { guest_token: guestToken }).catch(() => undefined)
    },

    async handoff({ name, phone, note, guestToken }) {
      const body = await post("/handoff", { name, phone, note, guest_token: guestToken })
      return { message: str(body.message) }
    },

    async actDraft({ draftId, action, guestToken }) {
      const body = await post(`/drafts/${encodeURIComponent(draftId)}`, { action, guest_token: guestToken })
      return { message: str(body.message), code: str(body.code), href: path(body.href) }
    },
  }
}
