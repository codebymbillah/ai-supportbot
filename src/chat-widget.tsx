"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { HeadsetIcon, MailIcon, MessageCircleIcon, PhoneIcon, SquarePenIcon, XIcon } from "lucide-react"
import "./support-chat.css"
import { useChatUi, ChatUiProvider } from "./chat-context"
import { cn } from "./cn"
import { AgentAvatar, Avatar, Bubble, Composer, TypingDots } from "./parts"
import type { ChatContact, ChatContext, SupportChatConfig, ChatTheme } from "./types"
import { hasBangla } from "./rich-text"
import { sensitiveProblem } from "./safety"
import { useSupportChat } from "./use-support-chat"

/** Anything on the page can open the chat: `window.dispatchEvent(new Event("support-chat:open"))`. */
export const OPEN_EVENT = "support-chat:open"

const wa = (n: string) => `https://wa.me/${n.replace(/\D/g, "")}`

/** The support number, WhatsApp and hours: shown when nobody can pick the chat up, and whenever the assistant is off. */
function ContactLines({ contact }: { contact: ChatContact }) {
  const { t } = useChatUi()
  return (
    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
      {contact.phone && (
        <li>
          <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
            <PhoneIcon className="size-4 text-(--sc-brand-text)" /> {contact.phone}
          </a>
        </li>
      )}
      {contact.whatsapp && (
        <li>
          <a href={wa(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
            <MessageCircleIcon className="size-4 text-(--sc-brand-text)" /> {t("whatsapp")}
          </a>
        </li>
      )}
      {contact.email && (
        <li>
          <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
            <MailIcon className="size-4 text-(--sc-brand-text)" /> {contact.email}
          </a>
        </li>
      )}
      {contact.hours && <li className="text-xs text-muted-foreground">{contact.hours}</li>}
    </ul>
  )
}

function CallbackForm({ onSubmit, onClose }: { onSubmit: (name: string, phone: string, note?: string) => Promise<{ message?: string }>; onClose: (message?: string) => void }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const { t } = useChatUi()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, "")
    if (name.trim().length < 2) return setError(t("nameError"))
    if (digits.length < 10 || digits.length > 16) return setError(t("phoneError"))
    setBusy(true)
    setError("")
    try {
      const res = await onSubmit(name.trim(), phone.trim(), note.trim() || undefined)
      onClose(res.message ?? t("callbackThanks", { name: name.trim(), phone: phone.trim() }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("callbackFailed"))
      setBusy(false)
    }
  }

  const input = "h-10 w-full rounded-lg border bg-background px-3 text-base outline-none transition-shadow focus:border-primary/40 focus:ring-3 focus:ring-ring/30 md:text-sm"
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 border-t pt-3">
      <p className="text-xs font-semibold text-primary">{t("callPrompt")}</p>
      <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("yourName")} autoComplete="name" aria-label={t("yourName")} />
      <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phoneNumber")} inputMode="tel" autoComplete="tel" aria-label={t("phoneNumber")} />
      <textarea className={cn(input, "h-14 resize-none py-2")} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("helpPlaceholder")} maxLength={500} aria-label={t("helpLabel")} />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="inline-flex h-9 items-center rounded-full bg-(--sc-brand) px-4 text-sm font-semibold text-(--sc-brand-fg) transition-[background-color,transform] hover:bg-(--sc-brand)/90 active:scale-95 disabled:opacity-60">
          {busy ? t("sending") : t("callMeBack")}
        </button>
        <button type="button" onClick={() => onClose()} className="inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted">
          {t("cancel")}
        </button>
      </div>
    </form>
  )
}

/** A panel at the end of the conversation when the customer needs a person: waiting, or the number and the call-back form. */
function HandoffPanel({ kind, contact, onCallBack }: { kind: "waiting" | "contact"; contact?: ChatContact; onCallBack: (name: string, phone: string, note?: string) => Promise<{ message?: string }> }) {
  const [form, setForm] = useState(false)
  const [done, setDone] = useState("")
  const { t } = useChatUi()
  if (done) return <p className="sc-rise mx-auto max-w-[92%] rounded-xl bg-(--sc-success)/10 px-3 py-2 text-center text-xs font-medium text-(--sc-success)">{done}</p>
  return (
    <div className="sc-rise rounded-xl border bg-card p-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <HeadsetIcon className="size-4 text-(--sc-brand-text)" />
        {kind === "waiting" ? t("waitingTitle") : t("contactTitle")}
      </p>
      {kind === "waiting" ? (
        <p className="mt-1 text-xs text-muted-foreground">{t("waitingText")}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">{t("contactText")}</p>
          {contact && <ContactLines contact={contact} />}
          {!form ? (
            <button type="button" onClick={() => setForm(true)} className="mt-3 inline-flex h-9 items-center rounded-full bg-(--sc-brand) px-4 text-sm font-semibold text-(--sc-brand-fg) transition-[background-color,transform] hover:bg-(--sc-brand)/90 active:scale-95">
              {t("callMeBack")}
            </button>
          ) : (
            <CallbackForm
              onSubmit={onCallBack}
              onClose={(message) => {
                if (message) setDone(message)
                else setForm(false)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

/** The floating button and the chat window. Mount it once, in a layout. */
/** "short" after a few seconds of waiting for the assistant, "long" after much longer. A silent wait feels broken. */
function useSlowReply(waiting: boolean): "short" | "long" | null {
  const [level, setLevel] = useState<"short" | "long" | null>(null)
  useEffect(() => {
    if (!waiting) return
    const a = setTimeout(() => setLevel("short"), 10_000)
    const b = setTimeout(() => setLevel("long"), 35_000)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
      setLevel(null)
    }
  }, [waiting])
  return level
}

/** The widget's colours as CSS variables (only the ones the project set; the rest come from support-chat.css). */
function themeVars(theme?: ChatTheme): React.CSSProperties | undefined {
  if (!theme) return undefined
  const map: [keyof ChatTheme, string][] = [
    ["brand", "--sc-brand"],
    ["brandForeground", "--sc-brand-fg"],
    ["brandText", "--sc-brand-text"],
    ["ink", "--sc-ink"],
    ["link", "--sc-link"],
    ["success", "--sc-success"],
  ]
  return Object.fromEntries(map.flatMap(([k, v]) => (theme[k] ? [[v, theme[k]]] : []))) as React.CSSProperties
}

export function SupportChat(props: { config: SupportChatConfig; context: ChatContext; fallbackContact?: ChatContact }) {
  return (
    <ChatUiProvider config={props.config}>
      {/* `contents`: no box of its own, it only carries the colour variables to the launcher and the window. */}
      <div className="sc-theme contents" style={themeVars(props.config.theme)}>
        <SupportChatInner {...props} />
      </div>
    </ChatUiProvider>
  )
}

function SupportChatInner({ config, context, fallbackContact }: { config: SupportChatConfig; context: ChatContext; fallbackContact?: ChatContact }) {
  const { t } = useChatUi()
  const [open, setOpen] = useState(false)
  const chat = useSupportChat(config, context, open)
  const [online, setOnline] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const { transport } = config

  const close = useCallback(() => {
    setOpen(false)
    launcher.current?.focus()
  }, [])

  // Whether a team member is online, for the "Our team is online" line (the green dot only says the chat is on: the assistant is always there). Once, when the page opens, then every minute while it is visible.
  useEffect(() => {
    let alive = true
    const ask = () => {
      if (!document.hidden) void transport.status().then((s) => alive && setOnline(s.agentsOnline))
    }
    ask()
    const t = setInterval(ask, 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [transport])

  // Anything on the page (the sidebar's Chat button) can open the chat.
  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [])

  // Focus the box when the window opens, close it with Escape, and on a phone keep the page behind from scrolling.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => input.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    document.addEventListener("keydown", onKey)
    const phone = window.matchMedia("(max-width: 639px)").matches
    if (phone) document.documentElement.style.overflow = "hidden"
    return () => {
      clearTimeout(t)
      document.removeEventListener("keydown", onKey)
      if (phone) document.documentElement.style.overflow = ""
    }
  }, [open, close])

  // Follow the conversation, unless the visitor scrolled up to read.
  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  })

  const { state } = chat
  const human = state.mode === "human"
  const empty = chat.messages.length === 0
  // When the assistant is off the server says so with the numbers: show them instead of the keyboard's dead end.
  const off = chat.error?.status === 503 ? chat.error : null
  const offContact = off?.contact ?? fallbackContact
  const send = (text: string, images: File[] = []) => {
    const problem = sensitiveProblem(text, t)
    if (problem) return problem
    stick.current = true
    void chat.send(text, images)
  }
  const slow = useSlowReply(chat.awaiting && !state.handoff)

  return (
    <>
      {!open && (
        <button
          ref={launcher}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t(online ? "launcherAriaOnline" : "launcherAria")}
          className="sc-pop fixed right-4 bottom-4 z-40 flex h-14 items-center gap-2.5 rounded-full bg-(--sc-ink) px-4 text-white shadow-lg ring-1 ring-white/10 transition-transform hover:scale-[1.03] active:scale-95 print:hidden sm:px-5"
        >
          <span className="relative flex size-6 items-center justify-center">
            <MessageCircleIcon className="size-6" />
            <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-(--sc-brand) ring-2 ring-(--sc-ink)" />
          </span>
          <span className="hidden text-sm font-semibold sm:inline">{t("launcher")}</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label={config.assistantName}
          className="sc-rise fixed inset-0 z-[60] flex flex-col overflow-hidden bg-card print:hidden sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(680px,calc(100dvh-2rem))] sm:w-[400px] sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-border"
        >
          <header className="flex items-center gap-3 bg-(--sc-ink) px-4 py-3 text-white">
            {human ? <AgentAvatar name={state.agentName} className="size-9" /> : <Avatar className="size-9 bg-white/10" />}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-bold">
                {human ? t("agentFromTeam", { agent: state.agentName ?? t("teamMember") }) : config.assistantName}
                {config.demo && <span className="rounded-full bg-(--sc-brand) px-2 py-0.5 text-[0.6rem] font-bold tracking-wide text-(--sc-brand-fg) uppercase">{t("demoBadge")}</span>}
              </p>
              <p className="flex items-center gap-1.5 truncate text-xs text-white/65">
                <span aria-hidden className="size-1.5 rounded-full bg-(--sc-brand)" />
                {human ? t("chattingWithPerson") : online ? t("teamOnline") : config.tagline}
              </p>
            </div>
            <button type="button" onClick={() => send(t("talkToPersonMessage"))} aria-label={t("talkToPerson")} title={t("talkToPerson")} className="flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <HeadsetIcon className="size-4" />
            </button>
            <button type="button" onClick={chat.reset} aria-label={t("newChatAria")} title={t("newChat")} className="flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <SquarePenIcon className="size-4" />
            </button>
            <button type="button" onClick={close} aria-label={t("closeChat")} className="flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <XIcon className="size-4" />
            </button>
          </header>

          <div
            ref={scroller}
            role="log"
            aria-label={t("conversation")}
            aria-busy={chat.awaiting}
            onScroll={(e) => {
              const el = e.currentTarget
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            }}
            className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-background/60 px-4 py-4"
          >
            <div className="flex gap-2">
              <Avatar className="mt-0.5" />
              <div className="min-w-0 max-w-[88%]">
                <p className={cn("rounded-2xl rounded-tl-md bg-muted/70 px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]", hasBangla(config.greeting) && config.bengaliFontClass)}>{config.greeting}</p>
                {empty && config.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {config.suggestions.map((s) => (
                      <button key={s.label} type="button" onClick={() => send(s.message)} className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-accent">
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {chat.messages.map((m) => (
              <Bubble key={m.id} message={m} config={config} drafts={chat.drafts} onRate={(v) => chat.rate(m, v)} onRetry={() => chat.retry(m)} onDraft={async (id, a) => (await chat.actDraft(id, a)).problem} />
            ))}

            {chat.awaiting && !human && !state.handoff && (
              <div className="flex gap-2" aria-live="polite">
                <Avatar className="mt-0.5" />
                <p className="rounded-2xl rounded-tl-md bg-muted/70 px-3.5 py-2.5">
                  <TypingDots />
                </p>
              </div>
            )}
            {slow && !human && (
              <p className="mx-auto max-w-[92%] text-center text-xs text-muted-foreground" aria-live="polite">
                {slow === "long" ? t("slowLong") : t("slowShort")}
                {slow === "long" && fallbackContact && <ContactLines contact={fallbackContact} />}
              </p>
            )}
            {chat.awaiting && human && (
              <div className="flex gap-2" aria-live="polite">
                <AgentAvatar name={state.agentName} className="mt-0.5" />
                <p className="rounded-2xl rounded-tl-md bg-accent px-3.5 py-2.5">
                  <TypingDots />
                </p>
              </div>
            )}

            {state.handoff && <HandoffPanel kind={state.handoff.status} contact={state.handoff.status === "contact" ? state.handoff.contact : undefined} onCallBack={chat.callBack} />}

            {chat.error && !off && chat.error.status !== 0 && (
              <p role="alert" className="mx-auto max-w-[92%] rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                {chat.error.message}
              </p>
            )}
            {off && (
              <div className="rounded-xl border bg-card p-3.5">
                <p className="text-sm font-semibold text-primary">{off.message}</p>
                {offContact && <ContactLines contact={offContact} />}
              </div>
            )}
          </div>

          <Composer placeholder={config.placeholder} maxLength={config.maxLength ?? 1000} inputRef={input} onSend={send} />
          <p className="bg-card px-4 pb-3 text-center text-[0.68rem] leading-snug text-muted-foreground">
            {human ? t("personNotice") : config.disclaimer}{" "}
            <a href={config.privacyHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary">
              {t("privacy")}
            </a>
          </p>
        </section>
      )}
    </>
  )
}

