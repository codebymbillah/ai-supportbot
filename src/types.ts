// Types shared by dotbyte-chat. Nothing in this folder imports from the rest of the project, so the folder can be copied
// into another project as it is. Project details (brand, texts, the demo) come in through `SupportChatConfig`.
//
// How the chat talks to a backend: the visitor's message is saved at once, the answer is written a few seconds later, and the widget
// polls for new messages (it does not stream). The shapes below follow the backend's own contract (frontend-support-chat.md).

export type Sender = "customer" | "ai" | "agent" | "system"

/** A product the assistant suggests. Public data only: never a supplier, a marketplace or a source link. */
export interface ProductCardData {
  type: "product"
  productId: string
  slug: string
  title: string
  image?: string
  priceFrom?: number
  offerPriceFrom?: number
  moq?: number
  unit?: string
  offerLabel?: string
  freeDelivery?: boolean
  /** The product has options (size, colour) to pick first, so it cannot be added from the chat: the card sends the customer to its page. */
  needsOptions?: boolean
  /** A path on this site. Without one the card links to /products/{slug}. */
  href?: string
}

/** A small table with an optional button: an order estimate, a delivery time. */
export interface InfoCardData {
  type: "info"
  title: string
  rows?: { label: string; value: string }[]
  note?: string
  cta?: { label: string; href: string }
}

/** A sourcing request the assistant has filled in for the customer. Nothing is created until the customer presses the button. */
export interface DraftCardData {
  type: "sourcing_draft"
  draftId: string
  title: string
  rows: { label: string; value: string }[]
  confirmLabel?: string
}

export type ChatCard = ProductCardData | InfoCardData | DraftCardData

/** A photo the customer sent with a message. `url` is a link the backend signed (it works for a few hours). */
export interface ChatImage {
  id: number
  url: string
  /** False: the assistant did not see it (the photo limit was reached) and a team member will. */
  aiReviewed: boolean
}

export interface ChatMessage {
  id: number
  sender: Sender
  body: string
  /** Set on a message from a team member. */
  agentName?: string
  cards: ChatCard[]
  /** Photos of the customer's own messages. */
  images?: ChatImage[]
  feedback?: "up" | "down"
  createdAt: string
  /** On this device only: the message is still being sent, or sending it failed. */
  local?: "sending" | "failed"
}

export interface ChatContact {
  phone?: string
  whatsapp?: string
  email?: string
  hours?: string
}

/** The state of the conversation, sent with every poll. */
export interface ChatState {
  /** `human`: a team member owns the chat and the assistant is silent. */
  mode: "ai" | "human"
  agentName?: string
  agentsOnline: boolean
  /** Set while the customer is waiting for a person. `waiting`: the team may pick it up. `contact`: show the support number and the call-back form. */
  handoff: null | { status: "waiting" } | { status: "contact"; contact: ChatContact }
  /** The answer is on its way: show the typing indicator. */
  awaitingReply: boolean
}

export const EMPTY_STATE: ChatState = { mode: "ai", agentsOnline: false, handoff: null, awaitingReply: false }

/** What the page tells the assistant about where the visitor is. Only what the visitor can see on screen anyway. */
export interface ChatContext {
  path: string
  productSlug?: string
  cart?: { productId: string; qty: number }[]
}

export interface SendResult {
  message: ChatMessage
  state: ChatState
  /** Visitors only. The key to their conversation: kept in this browser. */
  guestToken?: string
}

export interface PollResult {
  messages: ChatMessage[]
  state: ChatState
}

/** A failure the widget can show. `contact` comes with a 503 (the assistant is off): show the numbers. */
export class ChatError extends Error {
  constructor(
    message: string,
    public status = 0,
    public contact?: ChatContact
  ) {
    super(message)
  }
}

/** How the widget talks to a backend. The add-on ships an HTTP one; a project can pass its own (the demo uses that). */
export interface ChatTransport {
  /** `images` are photos the customer attached (already shrunk). The message may be empty when there are photos. */
  send(req: { message: string; images?: File[]; context: ChatContext; guestToken?: string }): Promise<SendResult>
  /** Messages after `after` (0 for all, oldest first) and the state of the conversation. */
  poll(req: { after: number; guestToken?: string }): Promise<PollResult>
  /** Whether a team member has the inbox open. For the green dot. */
  status(): Promise<{ agentsOnline: boolean }>
  feedback(req: { messageId: number; value: "up" | "down"; guestToken?: string }): Promise<void>
  /** The customer started a new chat: close this conversation on the backend. Optional; a failure is ignored (the browser still starts fresh). */
  close?(req: { guestToken?: string }): Promise<void>
  /** What the backend says about the chat (GET /chat/config): on or off, names, greeting, chips, photos. Optional. */
  config?(): Promise<RemoteChatConfig | undefined>
  handoff(req: { name: string; phone: string; note?: string; guestToken?: string }): Promise<{ message?: string }>
  /** The customer pressed a button on a draft the assistant prepared. A second confirm throws a ChatError with status 409. */
  actDraft(req: { draftId: string; action: "confirm" | "dismiss"; guestToken?: string }): Promise<{ message?: string; code?: string; href?: string }>
}

/** Colours the widget uses, as CSS colour values. Anything left out follows the project's own tokens (`--trade`, `--ink`, ...) and then a neutral default. */
export interface ChatTheme {
  /** Buttons, the customer's marks and the "online" dot. */
  brand?: string
  /** Text on the brand colour. */
  brandForeground?: string
  /** The brand colour as text on a light background (needs enough contrast). */
  brandText?: string
  /** The dark header, the launcher and the assistant's disc. */
  ink?: string
  /** Links inside an assistant message. */
  link?: string
  /** "Sent", "Request sent" and similar. */
  success?: string
}

/** Whether the backend takes photos in the chat (from GET /chat/config `images`). */
export interface ChatImageRules {
  enabled: boolean
  maxPerMessage: number
  maxFileMb: number
}

export interface SupportChatConfig {
  /** The business's name, written into a few sentences ("a person from the {brand} team"). */
  brandName: string
  /** Names the person sees. */
  assistantName: string
  tagline: string
  /** First message. May be in more than one language. */
  greeting: string
  suggestions: { label: string; message: string }[]
  placeholder: string
  /** One line under the box. */
  disclaimer: string
  privacyHref: string
  /** Shown in the header when the assistant is the demo script. */
  demo?: boolean
  transport: ChatTransport
  formatMoney: (amount: number) => string
  /** Put a product in the cart. Without it the product card has no "add" button. */
  onAddProduct?: (card: ProductCardData) => void
  /** The browser storage key. Change it per project so two sites on one domain never share a chat. */
  storageKey?: string
  maxLength?: number
  /** A CSS class for text that contains Bangla letters (the project's Bangla font). Empty: the page's own font is used. */
  bengaliFontClass?: string
  /** Photo upload. Without it, or with `enabled: false`, there is no attach button. */
  images?: ChatImageRules
  /** Brand colours (see ChatTheme). */
  theme?: ChatTheme
  /** Any of the widget's own sentences, in this project's words or language (see labels.ts for the list). */
  labels?: Partial<import("./labels/labels").ChatLabels>
}

/** What the backend's GET /chat/config says. The widget reads it itself when the project does not bring its own transport. */
export interface RemoteChatConfig {
  enabled: boolean
  assistantName?: string
  tagline?: string
  greeting?: string
  suggestions?: { label: string; message: string }[]
  images?: ChatImageRules
}

/**
 * What a project passes to <SupportChat>. Only `brandName` is required; everything else has a default, and when the project brings no
 * transport the widget talks to `apiBase` (default /api/chat) and takes names, greeting, chips, photo rules and the on/off switch from
 * the backend's own settings. Anything the project sets itself wins over the backend's.
 */
export type SupportChatInput = Partial<Omit<SupportChatConfig, "brandName">> & {
  brandName: string
  /** Where the project's chat route is. Default /api/chat. */
  apiBase?: string
  /** Read the backend's chat settings in the browser. Default: yes when the project brings no transport of its own. */
  useBackendConfig?: boolean
}
