import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createHttpTransport } from "../src/transport/http-transport"
import { createChatProxy } from "../src/server"
import { resolveConfig } from "../src/widget/resolve-config"

// The easy way in: only a brand name, a route with no arguments, and the backend's own settings.

describe("resolveConfig", () => {
  it("fills every default from the brand name alone", () => {
    const c = resolveConfig({ brandName: "Acme Books" })
    expect(c.assistantName).toBe("Acme Books assistant")
    expect(c.greeting).toContain("Acme Books")
    expect(c.storageKey).toBe("acme-books:chat:v1")
    expect(c.suggestions).toEqual([])
    expect(c.privacyHref).toBe("/privacy")
    expect(c.formatMoney(12345)).toBe("12,345")
    expect(c.transport).toBeTruthy()
  })

  it("takes the backend's settings, but the project's own win", () => {
    const remote = { enabled: true, assistantName: "Backend Bot", greeting: "From the backend", suggestions: [{ label: "A", message: "a" }], images: { enabled: true, maxPerMessage: 3, maxFileMb: 5 } }
    const c = resolveConfig({ brandName: "Acme" }, remote)
    expect(c.assistantName).toBe("Backend Bot")
    expect(c.greeting).toBe("From the backend")
    expect(c.suggestions).toHaveLength(1)
    expect(c.images?.enabled).toBe(true)
    const own = resolveConfig({ brandName: "Acme", assistantName: "Mine", images: { enabled: false, maxPerMessage: 1, maxFileMb: 1 } }, remote)
    expect(own.assistantName).toBe("Mine")
    expect(own.images?.enabled).toBe(false)
  })

  it("reuses one transport for the same route and brand, so a config made again does not restart the polling", () => {
    expect(resolveConfig({ brandName: "Acme" }).transport).toBe(resolveConfig({ brandName: "Acme" }).transport)
    expect(resolveConfig({ brandName: "Acme" }).transport).not.toBe(resolveConfig({ brandName: "Other" }).transport)
  })

  it("uses a transport the project brings, and does not add helper-only fields", () => {
    const transport = createHttpTransport("/custom")
    const c = resolveConfig({ brandName: "Acme", transport, apiBase: "/x", useBackendConfig: false }) as unknown as Record<string, unknown>
    expect(c.transport).toBe(transport)
    expect("apiBase" in c).toBe(false)
    expect("useBackendConfig" in c).toBe(false)
  })
})

describe("reading the backend's chat settings", () => {
  afterEach(() => vi.unstubAllGlobals())
  const answer = (body: unknown, status = 200) => vi.stubGlobal("fetch", async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }))

  it("reads names, chips and photo rules, and keeps them within limits", async () => {
    answer({ data: { enabled: true, assistant_name: "Bot", suggestions: [{ label: "Hi", message: "hello" }, { label: "", message: "x" }], images: { enabled: true, max_per_message: 99, max_file_mb: 0 }, secret: "x" } })
    const c = await createHttpTransport().config!()
    expect(c?.enabled).toBe(true)
    expect(c?.assistantName).toBe("Bot")
    expect(c?.suggestions).toEqual([{ label: "Hi", message: "hello" }])
    expect(c?.images).toEqual({ enabled: true, maxPerMessage: 3, maxFileMb: 1 })
    expect(JSON.stringify(c)).not.toContain("secret")
  })

  it("says off when the backend says off, and nothing when it cannot answer", async () => {
    answer({ data: { enabled: false } })
    expect((await createHttpTransport().config!())?.enabled).toBe(false)
    answer({ message: "Not found" }, 404)
    expect(await createHttpTransport().config!()).toBeUndefined()
  })
})

describe("a route with no arguments", () => {
  const calls: string[] = []
  beforeEach(() => {
    calls.length = 0
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url)
      return new Response(JSON.stringify({ data: { enabled: true } }), { status: 200, headers: { "Content-Type": "application/json" } })
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
  const get = (path: string) => new Request(`https://shop.example.com/api/chat/${path}`, { headers: { "x-forwarded-for": "198.51.100.7" } })
  const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) })

  it("reads API_URL, passes the config call, and treats everyone as a visitor", async () => {
    vi.stubEnv("API_URL", "https://api.example.com/v1/")
    const res = await createChatProxy().GET(get("config"), ctx("config"))
    expect(res.status).toBe(200)
    expect(calls).toEqual(["https://api.example.com/v1/chat/config"])
  })

  it("says plainly what is missing when API_URL is not set", async () => {
    vi.stubEnv("API_URL", "")
    const res = await createChatProxy().GET(get("config"), ctx("config"))
    expect(res.status).toBe(500)
    expect((await res.json()).message).toContain("API_URL")
    expect(calls).toHaveLength(0)
  })
})
