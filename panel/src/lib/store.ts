"use client"

// The demo backend: all panel data lives in the browser (localStorage) so every screen can be tried before the service exists.
// Every action below is one call of the service's /panel/* API (docs/SERVICE-BUILD-GUIDE.md, section 4). When the service is ready,
// replace the bodies with fetch calls and keep the names, and the screens do not change.
import { useSyncExternalStore } from "react"
import { seed } from "./seed"
import type { Chat, ChatStatus, Member, Note, PanelState, Plan, Product, Site, SiteSettings, SiteStatus, Source, SourceKind } from "./types"

const KEY = "support-chat-panel-demo-v2"
const listeners = new Set<() => void>()
const SERVER = seed()
let cache: PanelState | null = null

function load(): PanelState {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as PanelState) : seed()
  } catch {
    cache = seed()
  }
  return cache
}

function commit(next: PanelState) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* private window: keeps working for this visit */
  }
  listeners.forEach((l) => l())
}

export function usePanel(): PanelState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    load,
    () => SERVER
  )
}

export function useSite(id: string): Site | undefined {
  return usePanel().sites.find((s) => s.id === id)
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`
const nowIso = () => new Date().toISOString()
const edit = (siteId: string, fn: (s: Site) => Site) => commit({ ...load(), sites: load().sites.map((s) => (s.id === siteId ? fn(s) : s)) })

export function resetDemo() {
  commit(seed())
}

// ---- account
export function signIn(email: string) {
  commit({ ...load(), user: { email } })
}
export function signOut() {
  commit({ ...load(), user: null })
}

// ---- sites
export function newKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return `sk_live_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`
}
/** Creates a site and returns it with the full key, which is shown once. */
export function createSite(name: string, domain: string): { site: Site; key: string } {
  const key = newKey()
  const base = seed().sites[0]
  const site: Site = {
    id: uid("site"),
    name,
    client: name,
    plan: "pilot",
    status: "pilot",
    domains: [domain],
    keyPrefix: key.slice(0, 12),
    createdAt: nowIso(),
    settings: { ...base.settings, enabled: false, assistantName: "Assistant", tagline: "", greeting: `Hi! How can I help you at ${name}?`, chips: [], forbiddenTerms: [], contact: { phone: "", whatsapp: "", email: "", hours: "" } },
    sources: [],
    products: [],
    notes: [],
    chats: [],
    team: [{ id: uid("m"), email: load().user?.email ?? "owner@example.com", role: "owner", invited: false }],
    usage: { chats: 0, handedOver: 0, firstReplySeconds: 0, spend: 0, month: "Nov 2026" },
  }
  commit({ ...load(), sites: [...load().sites, site] })
  return { site, key }
}
export function rotateKey(siteId: string): string {
  const key = newKey()
  edit(siteId, (s) => ({ ...s, keyPrefix: key.slice(0, 12) }))
  return key
}
export function deleteSite(siteId: string) {
  commit({ ...load(), sites: load().sites.filter((s) => s.id !== siteId) })
}
export function renameSite(siteId: string, name: string) {
  edit(siteId, (s) => ({ ...s, name }))
}
export function setDomains(siteId: string, domains: string[]) {
  edit(siteId, (s) => ({ ...s, domains }))
}
// ---- super admin (TechaByte staff only in the real service)
export function setSiteStatus(siteId: string, status: SiteStatus) {
  edit(siteId, (s) => ({ ...s, status, settings: status === "suspended" ? { ...s.settings, enabled: false } : s.settings }))
}
export function setPlan(siteId: string, plan: Plan) {
  const limits: Record<Plan, number> = { pilot: 20, starter: 50, growth: 200 }
  edit(siteId, (s) => ({ ...s, plan, settings: { ...s.settings, monthlyLimit: limits[plan] } }))
}

export function saveSettings(siteId: string, settings: SiteSettings) {
  edit(siteId, (s) => ({ ...s, settings }))
}

// ---- catalog
export function addSource(siteId: string, kind: SourceKind, address: string) {
  const src: Source = { id: uid("src"), kind, address, lastRead: null, status: "never", note: "Not read yet.", products: 0 }
  edit(siteId, (s) => ({ ...s, sources: [...s.sources, src] }))
}
export function removeSource(siteId: string, id: string) {
  edit(siteId, (s) => ({ ...s, sources: s.sources.filter((x) => x.id !== id) }))
}
/** Demo: pretend the service read the source just now. */
export function readSource(siteId: string, id: string) {
  edit(siteId, (s) => ({
    ...s,
    sources: s.sources.map((x) => (x.id === id ? { ...x, lastRead: nowIso(), status: "ok" as const, note: "Read just now." } : x)),
    products: s.products.map((p) => ({ ...p, fetchedAt: nowIso() })),
  }))
}
export function saveProduct(siteId: string, p: Product) {
  edit(siteId, (s) => ({ ...s, products: s.products.some((x) => x.id === p.id) ? s.products.map((x) => (x.id === p.id ? p : x)) : [p, ...s.products] }))
}
export function newProduct(): Product {
  return { id: uid("p"), externalId: "", title: "", description: "", url: "", price: null, currency: "BDT", stock: "in_stock", category: "", fetchedAt: nowIso(), hidden: false }
}
export function deleteProduct(siteId: string, id: string) {
  edit(siteId, (s) => ({ ...s, products: s.products.filter((x) => x.id !== id) }))
}

// ---- knowledge
export function saveNote(siteId: string, n: Note) {
  edit(siteId, (s) => ({ ...s, notes: s.notes.some((x) => x.id === n.id) ? s.notes.map((x) => (x.id === n.id ? n : x)) : [...s.notes, n] }))
}
export function newNote(): Note {
  return { id: uid("n"), title: "", body: "", kind: "text" }
}
export function deleteNote(siteId: string, id: string) {
  edit(siteId, (s) => ({ ...s, notes: s.notes.filter((x) => x.id !== id) }))
}

// ---- inbox
const patchChat = (siteId: string, id: string, fn: (c: Chat) => Chat) => edit(siteId, (s) => ({ ...s, chats: s.chats.map((c) => (c.id === id ? fn(c) : c)) }))
export function setChatStatus(siteId: string, id: string, status: ChatStatus) {
  patchChat(siteId, id, (c) => ({
    ...c,
    status,
    unread: false,
    messages: [...c.messages, { id: uid("msg"), from: "system", text: status === "agent" ? "A team member joined the chat." : status === "closed" ? "This chat was closed." : "The assistant is back.", at: nowIso() }],
  }))
}
export function replyToChat(siteId: string, id: string, text: string) {
  patchChat(siteId, id, (c) => ({ ...c, status: "agent", unread: false, messages: [...c.messages, { id: uid("msg"), from: "agent", text, at: nowIso() }] }))
}
export function markRead(siteId: string, id: string) {
  patchChat(siteId, id, (c) => (c.unread ? { ...c, unread: false } : c))
}
export function deleteChat(siteId: string, id: string) {
  edit(siteId, (s) => ({ ...s, chats: s.chats.filter((c) => c.id !== id) }))
}

// ---- team
export function inviteMember(siteId: string, email: string, role: Member["role"]) {
  edit(siteId, (s) => ({ ...s, team: [...s.team, { id: uid("m"), email, role, invited: true }] }))
}
export function removeMember(siteId: string, id: string) {
  edit(siteId, (s) => {
    const left = s.team.filter((m) => m.id !== id)
    // A site always keeps one owner.
    return left.some((m) => m.role === "owner") ? { ...s, team: left } : s
  })
}
