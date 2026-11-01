// The panel's data, shaped like the service's /panel/* API (docs/SERVICE-BUILD-GUIDE.md, section 4).

export type StockStatus = "in_stock" | "out_of_stock" | "on_request"

/** The standard product every source produces (guide, section 3). */
export interface Product {
  id: string
  externalId: string
  title: string
  description: string
  url: string
  price: number | null
  currency: string
  stock: StockStatus
  category: string
  /** ISO time the service last read it. */
  fetchedAt: string
  hidden: boolean
}

export type SourceKind = "site" | "feed" | "connector"
export interface Source {
  id: string
  kind: SourceKind
  /** Site address, feed address or connector name. */
  address: string
  lastRead: string | null
  status: "ok" | "error" | "never"
  note: string
  products: number
}

export interface Note {
  id: string
  title: string
  /** Free text, or a page address the service reads. */
  body: string
  kind: "text" | "page"
}

export interface ChatMessage {
  id: string
  from: "customer" | "assistant" | "agent" | "system"
  text: string
  at: string
}
export type ChatStatus = "open" | "agent" | "closed"
export interface Chat {
  id: string
  visitor: string
  status: ChatStatus
  unread: boolean
  flagged: boolean
  messages: ChatMessage[]
}

export interface Member {
  id: string
  email: string
  role: "owner" | "agent"
  invited: boolean
}

export interface SiteSettings {
  enabled: boolean
  assistantName: string
  tagline: string
  greeting: string
  chips: string[]
  language: "auto" | "en" | "bn"
  photos: { enabled: boolean; maxPerMessage: number; maxMb: number }
  forbiddenTerms: string[]
  contact: { phone: string; whatsapp: string; email: string; hours: string }
  staleHours: number
  monthlyLimit: number
}

export interface Usage {
  chats: number
  handedOver: number
  firstReplySeconds: number
  spend: number
  month: string
}

export interface Site {
  id: string
  name: string
  domains: string[]
  /** Only the first characters are kept to show; the full key is shown once, when it is made. */
  keyPrefix: string
  createdAt: string
  settings: SiteSettings
  sources: Source[]
  products: Product[]
  notes: Note[]
  chats: Chat[]
  team: Member[]
  usage: Usage
}

export interface PanelState {
  user: { email: string } | null
  sites: Site[]
}
