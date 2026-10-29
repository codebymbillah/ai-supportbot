import { type ChatCard, type ChatMessage, type ChatState, type ChatTransport, EMPTY_STATE } from "../types"

// A scripted stand-in for the backend, to review and test the screen before the real assistant is ready. The project brings its own scripts
// (see src/config/support-chat-demo.ts). Replies come after a short wait, as the polled backend's do. Nothing is sent anywhere, and the
// widget's header says "Demo". Do not use it on a live site.

export type DemoLang = "en" | "bn" | "bl"

export interface DemoScript {
  match: RegExp
  text: Record<DemoLang, string>
  cards?: ChatCard[]
  /** Hand the chat to the team: the window then shows the contact details. */
  human?: boolean
}

export interface DemoOptions {
  scripts: DemoScript[]
  /** Used when no script matches. */
  fallback: DemoScript
  contact?: { phone: string; whatsapp?: string; hours?: string }
  replyMs?: number
}

const BANGLISH = /\b(ami|amar|amake|kemon|koto|kto|dam|lagbe|chai|ache|achhe|kore|dite|pathan|pabo|kothay|bhai|apni|apnar|ki|korbo|hobe|jabe|kobe|din|taka|shobar|dekhan|bolen|bolun|kivabe|kibhabe)\b/i

/** Bangla script, Banglish (Bangla in Latin letters) or English. */
export function detectLang(text: string): DemoLang {
  if (/[ঀ-৿]/.test(text)) return "bn"
  return BANGLISH.test(text) ? "bl" : "en"
}

export function createDemoTransport({ scripts, fallback, contact = { phone: "+880 1700-000000", whatsapp: "+8801700000000", hours: "Saturday to Thursday, 10 am to 7 pm (demo)" }, replyMs = 1800 }: DemoOptions): ChatTransport {
  // The conversation lives in this closure's memory, the way the backend keeps it. Reloading the page starts a new demo chat.
  let messages: ChatMessage[] = []
  let state: ChatState = EMPTY_STATE
  let nextId = 1
  const add = (m: Omit<ChatMessage, "id" | "createdAt" | "cards"> & { cards?: ChatCard[] }) => {
    const full: ChatMessage = { ...m, cards: m.cards ?? [], id: nextId++, createdAt: new Date().toISOString() }
    messages = [...messages, full]
    return full
  }

  return {
    async send({ message, images }) {
      const mine = add({ sender: "customer", body: message, images: images?.map((f, i) => ({ id: nextId * 10 + i, url: URL.createObjectURL(f), aiReviewed: true })) })
      state = { ...state, awaitingReply: true }
      const lang = detectLang(message)
      const script = scripts.find((s) => s.match.test(message.trim())) ?? fallback
      setTimeout(() => {
        add({ sender: "ai", body: script.text[lang], cards: script.cards })
        state = { ...state, awaitingReply: false, handoff: script.human ? { status: "contact", contact } : state.handoff }
      }, replyMs)
      return { message: mine, state, guestToken: "DemoDemoDemoDemoDemoDemoDemoDemo01" }
    },
    async poll({ after }) {
      return { messages: messages.filter((m) => m.id > after), state }
    },
    async status() {
      return { agentsOnline: false }
    },
    async feedback() {},
    async close() {
      messages = []
      state = EMPTY_STATE
    },
    async handoff({ name }) {
      return { message: `Thank you, ${name}. (Demo: no one will call, nothing was sent.)` }
    },
    async actDraft({ action }) {
      if (action === "confirm") add({ sender: "system", body: "Sourcing request SR-DEMO sent. (Demo: nothing was sent.)" })
      return { message: action === "confirm" ? "Demo: this would now be sent to the sourcing team." : undefined }
    },
  }
}
