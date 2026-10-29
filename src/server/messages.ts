import { clean, MAX_MESSAGE, text, token } from "./fields"

export function rebuild(kind: string, raw: Record<string, unknown>): Record<string, unknown> | undefined {
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
