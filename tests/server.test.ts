import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createChatProxy } from "../src/server"

// The door must pass only what it knows. These run it against a fake backend (a stubbed fetch).

const calls: { url: string; init?: RequestInit }[] = []
let reply: () => Response

beforeEach(() => {
  calls.length = 0
  reply = () => new Response(JSON.stringify({ data: { ok: true } }), { status: 200, headers: { "Content-Type": "application/json" } })
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return reply()
  })
})
afterEach(() => vi.unstubAllGlobals())

let ipCounter = 0
const freshIp = () => `10.1.${Math.floor(++ipCounter / 250)}.${(ipCounter % 250) + 1}`
const door = (token?: string) => createChatProxy({ apiUrl: "https://api.example.com/v1", authToken: async () => token })
const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) })
const json = (body: unknown, extra: Record<string, string> = {}) =>
  new Request("https://shop.example.com/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": freshIp(), host: "shop.example.com", ...extra }, body: JSON.stringify(body) })

describe("the chat door", () => {
  it("does not follow a backend redirect, so a message is never quietly turned into a read", async () => {
    reply = () => new Response(null, { status: 301, headers: { Location: "https://api.example.com/v1/chat/messages" } })
    const res = await door().POST(json({ message: "hi" }), ctx("messages"))
    expect((calls[0].init as RequestInit).redirect).toBe("manual")
    expect(res.status).toBe(500)
    expect((await res.json()).message).toContain("https")
  })

  it("answers 404 for a call it does not know", async () => {
    const res = await door().GET(new Request("https://shop.example.com/api/chat/admin"), ctx("admin"))
    expect(res.status).toBe(404)
    expect(calls).toHaveLength(0)
  })

  it("adds the customer's sign-in and the visitor's address", async () => {
    const res = await door("secret-token").GET(new Request("https://shop.example.com/api/chat/status", { headers: { "x-forwarded-for": "203.0.113.9" } }), ctx("status"))
    expect(res.status).toBe(200)
    const h = calls[0].init!.headers as Record<string, string>
    expect(h.Authorization).toBe("Bearer secret-token")
    expect(h["X-Forwarded-For"]).toBe("203.0.113.9")
  })

  it("sends the site key to the chat service, and only from the server", async () => {
    await createChatProxy({ apiUrl: "https://chat.example.com/v1", siteKey: "sk_live_abc" }).GET(new Request("https://shop.example.com/api/chat/config"), ctx("config"))
    expect((calls[0].init!.headers as Record<string, string>)["X-Chat-Key"]).toBe("sk_live_abc")
    await door().GET(new Request("https://shop.example.com/api/chat/config"), ctx("config"))
    expect((calls[1].init!.headers as Record<string, string>)["X-Chat-Key"]).toBeUndefined()
  })

  it("rebuilds a message field by field and drops anything else", async () => {
    await door().POST(json({ message: "  hello  ", guest_token: "x", role: "admin", supplier: "Acme Co", context: { path: "/p", product_slug: "s", cart: [{ product_id: "1", qty: 2, cost: 5 }, { product_id: "2", qty: -1 }], evil: 1 } }), ctx("messages"))
    const sent = JSON.parse(String(calls[0].init!.body))
    expect(sent).toEqual({ message: "hello", context: { path: "/p", product_slug: "s", cart: [{ product_id: "1", qty: 2 }] } })
  })

  it("keeps a well-formed guest token and refuses an empty message", async () => {
    await door().POST(json({ message: "hi", guest_token: "AbCdEf0123456789AbCd" }), ctx("messages"))
    expect(JSON.parse(String(calls[0].init!.body)).guest_token).toBe("AbCdEf0123456789AbCd")
    const empty = await door().POST(json({ message: "   " }), ctx("messages"))
    expect(empty.status).toBe(422)
    expect(calls).toHaveLength(1)
  })

  it("blocks a write that names another site", async () => {
    const res = await door().POST(json({ message: "hi" }, { origin: "https://evil.example.org" }), ctx("messages"))
    expect(res.status).toBe(403)
    expect(calls).toHaveLength(0)
  })

  it("returns only the message, errors and contact of a backend error", async () => {
    reply = () => new Response(JSON.stringify({ message: "Off", errors: { a: ["b"] }, contact: { phone: "1" }, exception: "Boom", file: "/srv/app.php", trace: [1] }), { status: 503 })
    const res = await door().POST(json({ message: "hi" }), ctx("messages"))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(["contact", "errors", "message"])
  })

  it("limits messages per visitor", async () => {
    const ip = freshIp()
    const send = () => door().POST(new Request("https://shop.example.com/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip, host: "shop.example.com" }, body: JSON.stringify({ message: "hi" }) }), ctx("messages"))
    const statuses: number[] = []
    for (let i = 0; i < 10; i++) statuses.push((await send()).status)
    expect(statuses.slice(0, 8).every((s) => s === 200)).toBe(true)
    expect(statuses[8]).toBe(429)
  })
})

describe("photos", () => {
  const form = (files: File[], message = "see this") => {
    const f = new FormData()
    f.set("message", message)
    for (const file of files) f.append("images[]", file)
    f.set("evil", "x")
    return new Request("https://shop.example.com/api/chat/messages", { method: "POST", headers: { "x-forwarded-for": freshIp(), host: "shop.example.com" }, body: f })
  }
  const jpeg = (name = "a.jpg") => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3])], name, { type: "image/jpeg" })

  it("accepts a real picture, renames it and forwards only known fields", async () => {
    const res = await door().POST(form([jpeg("../../etc/passwd.jpg")]), ctx("messages"))
    expect(res.status).toBe(200)
    const sent = calls[0].init!.body as FormData
    const file = sent.get("images[]") as File
    expect(file.name).toBe("photo-1.jpg")
    expect(sent.get("evil")).toBeNull()
    expect(sent.get("message")).toBe("see this")
  })

  it("refuses a file that only has a picture's name", async () => {
    const fake = new File(["<?php echo 1; ?>"], "shell.jpg", { type: "image/jpeg" })
    const res = await door().POST(form([fake]), ctx("messages"))
    expect(res.status).toBe(422)
    expect(calls).toHaveLength(0)
  })

  it("refuses too many or too large photos", async () => {
    expect((await door().POST(form([jpeg(), jpeg(), jpeg(), jpeg()]), ctx("messages"))).status).toBe(422)
    const big = new File([new Uint8Array(6 * 1024 * 1024).fill(1)], "big.jpg", { type: "image/jpeg" })
    expect((await door().POST(form([big]), ctx("messages"))).status).toBe(422)
    expect(calls).toHaveLength(0)
  })

  it("refuses photos when the project turned them off", async () => {
    const res = await createChatProxy({ apiUrl: "https://api.example.com/v1", authToken: async () => undefined, images: false }).POST(form([jpeg()]), ctx("messages"))
    expect(res.status).toBe(422)
  })
})
