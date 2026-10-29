import { afterEach, describe, expect, it, vi } from "vitest"
import { createHttpTransport } from "../src/transport/http-transport"
import { ChatError } from "../src/types"

// The browser side reads every field by name, so a field the backend adds by mistake never reaches the screen.

const respond = (body: unknown, status = 200) => vi.stubGlobal("fetch", async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }))
afterEach(() => vi.unstubAllGlobals())

const state = { mode: "ai", awaiting_reply: false, agents_online: true }

describe("http transport", () => {
  it("keeps only the fields a card shows", async () => {
    respond({
      data: [{ id: 1, sender: "ai", body: "Here", created_at: "2026-10-29T10:00:00Z", cards: [{ type: "product", product_id: "7", slug: "s", title: "Soap", price_from: 50, supplier_name: "Acme Factory", source_url: "https://alibaba.com/x", href: "//evil.com", image: "https://img/x.jpg" }] }],
      meta: state,
    })
    const res = await createHttpTransport("/api/chat").poll({ after: 0 })
    const card = res.messages[0].cards[0] as unknown as Record<string, unknown>
    expect(card.title).toBe("Soap")
    expect(card.href).toBeUndefined()
    expect(JSON.stringify(card)).not.toMatch(/Acme Factory|alibaba/)
  })

  it("draws a customer's photo only from an https link", async () => {
    respond({
      data: [{ id: 2, sender: "customer", body: "", created_at: "2026-10-29T10:00:00Z", images: [{ id: 1, url: "https://api/x?sig=1", ai_reviewed: false }, { id: 2, url: "javascript:alert(1)" }, { id: 3, url: "http://insecure/x.jpg" }] }],
      meta: state,
    })
    const res = await createHttpTransport().poll({ after: 0 })
    expect(res.messages[0].images).toEqual([{ id: 1, url: "https://api/x?sig=1", aiReviewed: false }])
  })

  it("gives no cards to a customer's own message, and ignores unknown senders", async () => {
    respond({ data: [{ id: 3, sender: "customer", body: "hi", created_at: "x", cards: [{ type: "info", title: "Hacked" }] }, { id: 4, sender: "root", body: "x" }], meta: state })
    const res = await createHttpTransport().poll({ after: 0 })
    expect(res.messages).toHaveLength(1)
    expect(res.messages[0].cards).toEqual([])
  })

  it("turns an error into a ChatError with the contact numbers", async () => {
    respond({ message: "Chat is off", contact: { phone: "01700", secret: "x" } }, 503)
    await expect(createHttpTransport().status()).resolves.toEqual({ agentsOnline: false })
    respond({ message: "Chat is off", contact: { phone: "01700", secret: "x" } }, 503)
    const err = await createHttpTransport().poll({ after: 0 }).catch((e) => e)
    expect(err).toBeInstanceOf(ChatError)
    expect(err.status).toBe(503)
    expect(err.contact).toEqual({ phone: "01700", whatsapp: undefined, email: undefined, hours: undefined })
  })

  it("uses the project's brand and words in its own errors", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline")
    })
    const err = await createHttpTransport("/api/chat", { brandName: "Acme" }).poll({ after: 0 }).catch((e) => e)
    expect(err.message).toContain("Acme")
    const bn = await createHttpTransport("/api/chat", { brandName: "Acme", labels: { unreachable: "{brand} পাওয়া যাচ্ছে না" } }).poll({ after: 0 }).catch((e) => e)
    expect(bn.message).toBe("Acme পাওয়া যাচ্ছে না")
  })
})
