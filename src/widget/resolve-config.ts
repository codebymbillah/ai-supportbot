import { createHttpTransport } from "../transport/http-transport"
import type { ChatLabels } from "../labels/labels"
import type { ChatTransport, RemoteChatConfig, SupportChatConfig, SupportChatInput } from "../types"

// One HTTP transport per (route, brand, labels), so a config object made again on every render never restarts the polling.
const transports = new Map<string, ChatTransport>()
function httpTransport(base: string, brandName: string, labels?: Partial<ChatLabels>) {
  const key = JSON.stringify([base, brandName, labels ?? null])
  let t = transports.get(key)
  if (!t) {
    t = createHttpTransport(base, { brandName, labels })
    transports.set(key, t)
  }
  return t
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site"

/** Fills in everything a project left out: its own setting first, then the backend's, then a plain default. */
export function resolveConfig(input: SupportChatInput, remote?: RemoteChatConfig): SupportChatConfig {
  const { brandName, apiBase = "/api/chat", useBackendConfig: _use, ...own } = input
  void _use
  return {
    ...own,
    brandName,
    assistantName: own.assistantName ?? remote?.assistantName ?? `${brandName} assistant`,
    tagline: own.tagline ?? remote?.tagline ?? "Ask us anything",
    greeting: own.greeting ?? remote?.greeting ?? `Hi! I am the ${brandName} assistant. How can I help you today?`,
    suggestions: own.suggestions ?? remote?.suggestions ?? [],
    placeholder: own.placeholder ?? "Type your message…",
    disclaimer: own.disclaimer ?? "AI assistant. It can make mistakes. Chats are saved and our team may read them. Never share card numbers, passwords or codes.",
    privacyHref: own.privacyHref ?? "/privacy",
    transport: own.transport ?? httpTransport(apiBase, brandName, own.labels),
    formatMoney: own.formatMoney ?? ((n) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })),
    storageKey: own.storageKey ?? `${slug(brandName)}:chat:v1`,
    images: own.images ?? remote?.images,
  }
}
